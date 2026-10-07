from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.models.session import Session as SSHSession
from app.models.user import User
from app.core.dependencies import (
    get_current_user,
    require_super_admin,
)
from app.core.client_ip import (
    get_request_client_ip,
)
from app.schemas.session import (
    SessionTerminateRequest,
)
from app.services.audit import create_audit_log
from app.services.session_control import (
    publish_terminate,
)


router = APIRouter(
    prefix="/api/sessions",
    tags=["Sessions"]
)


def serialize_session(
    session: SSHSession
):
    duration_seconds = None

    if session.started_at:
        end_time = (
            session.ended_at
            or datetime.now(timezone.utc)
        )

        duration_seconds = int(
            (
                end_time - session.started_at
            ).total_seconds()
        )

    return {
        "id": session.id,
        "user_id": session.user_id,
        "username": (
            session.user.username
            if session.user
            else None
        ),
        "server_id": session.server_id,
        "server_name": (
            session.server.name
            if session.server
            else None
        ),
        "protocol": session.protocol,
        "remote_username": session.remote_username,
        "source_ip": session.source_ip,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
        "status": session.status,
        "duration_seconds": duration_seconds
    }


@router.get("/")
def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = (
        db.query(SSHSession)
        .order_by(
            SSHSession.started_at.desc()
        )
        .limit(200)
        .all()
    )

    return [
        serialize_session(item)
        for item in sessions
    ]


@router.get("/active")
def get_active_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = (
        db.query(SSHSession)
        .filter(
            SSHSession.status == "ACTIVE"
        )
        .order_by(
            SSHSession.started_at.desc()
        )
        .all()
    )

    return [
        serialize_session(item)
        for item in sessions
    ]


@router.get("/active/count")
def get_active_session_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = (
        db.query(SSHSession)
        .filter(
            SSHSession.status == "ACTIVE"
        )
        .count()
    )

    return {
        "count": count
    }

@router.post("/{session_id}/terminate")
async def terminate_session(
    session_id: int,
    data: SessionTerminateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_super_admin
    ),
):
    session = (
        db.query(SSHSession)
        .filter(
            SSHSession.id == session_id
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    if session.status != "ACTIVE":
        raise HTTPException(
            status_code=409,
            detail=(
                "Session is not active"
            ),
        )

    protocol = (
        session.protocol or ""
    ).upper()

    if protocol != "RDP":
        raise HTTPException(
            status_code=400,
            detail=(
                "Administrative termination "
                "is currently available "
                "for RDP sessions only"
            ),
        )

    reason = data.reason.strip()

    if not reason:
        raise HTTPException(
            status_code=422,
            detail=(
                "Termination reason "
                "cannot be empty"
            ),
        )

    session.status = "TERMINATED"
    session.ended_at = datetime.now(
        timezone.utc
    )

    session_owner = (
        session.user.username
        if session.user
        else str(session.user_id)
    )

    server_name = (
        session.server.name
        if session.server
        else str(session.server_id)
    )

    admin_source_ip = (
        get_request_client_ip(
            request
        )
    )

    create_audit_log(
        db=db,
        action="RDP_SESSION_TERMINATED",
        user_id=current_user.id,
        resource_type="session",
        resource_id=session.id,
        source_ip=admin_source_ip,
        detail=(
            "RDP session administratively "
            f"terminated by "
            f"{current_user.username}; "
            f"session user={session_owner}; "
            f"target={server_name}; "
            f"reason={reason}"
        ),
    )

    try:
        db.commit()
        db.refresh(session)

    except Exception:
        db.rollback()
        raise

    try:
        subscribers = await publish_terminate(
            session.id,
            terminated_by=current_user.id,
            reason=reason,
        )

    except Exception as exc:
        return {
            "session_id": session.id,
            "status": session.status,
            "control_delivered": False,
            "subscribers": 0,
            "message": (
                "Session marked TERMINATED, "
                "but live disconnect signal "
                "could not be published"
            ),
            "control_error": str(exc),
        }

    return {
        "session_id": session.id,
        "status": session.status,
        "control_delivered": (
            subscribers > 0
        ),
        "subscribers": subscribers,
        "message": (
            "Termination signal delivered"
            if subscribers > 0
            else
            "Session marked TERMINATED, "
            "but no live session worker "
            "received the signal"
        ),
    }


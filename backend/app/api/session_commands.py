from fastapi import (
    APIRouter,
    Depends,
)

from sqlalchemy.orm import Session

from app.database import get_db

from app.models.session_command import SessionCommand

from app.schemas.session_command import (
    SessionCommandResponse,
)

from app.core.dependencies import (
    require_super_admin,
)


router = APIRouter(
    prefix="/api/session-commands",
    tags=["Session Commands"],
)


@router.get(
    "/",
    response_model=list[SessionCommandResponse],
)
def get_commands(
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin),
):
    return (
        db.query(SessionCommand)
        .order_by(
            SessionCommand.executed_at.desc()
        )
        .limit(1000)
        .all()
    )


@router.get(
    "/session/{session_id}",
    response_model=list[SessionCommandResponse],
)
def get_session_commands(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin),
):
    return (
        db.query(SessionCommand)
        .filter(
            SessionCommand.session_id ==
            session_id
        )
        .order_by(
            SessionCommand.executed_at.asc()
        )
        .all()
    )

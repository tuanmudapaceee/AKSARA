from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.server import Server
from app.models.server_status import ServerStatus
from app.models.monitoring_history import MonitoringHistory
from app.services.monitoring import check_server
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/api/monitoring",
    tags=["Monitoring"]
)


@router.get("/status")
def get_status(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    results = (
        db.query(ServerStatus)
        .order_by(ServerStatus.server_id)
        .all()
    )

    return [
        {
            "server_id": item.server_id,
            "status": item.status,
            "response_time_ms": item.response_time_ms,
            "last_check": item.last_check,
            "last_online": item.last_online
        }
        for item in results
    ]


@router.post("/check/{server_id}")
def run_server_check(
    server_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    server = (
        db.query(Server)
        .filter(Server.id == server_id)
        .first()
    )

    if not server:
        raise HTTPException(
            status_code=404,
            detail="Server not found"
        )

    return check_server(
        db,
        server
    )


@router.post("/check-all")
def run_all_checks(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    servers = (
        db.query(Server)
        .filter(Server.is_active == True)
        .all()
    )

    results = []

    for server in servers:
        results.append(
            check_server(
                db,
                server
            )
        )

    return results


@router.get("/history/{server_id}")
def get_history(
    server_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    history = (
        db.query(MonitoringHistory)
        .filter(
            MonitoringHistory.server_id
            == server_id
        )
        .order_by(
            MonitoringHistory.checked_at.desc()
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "id": item.id,
            "server_id": item.server_id,
            "status": item.status,
            "response_time_ms":
                item.response_time_ms,
            "checked_at": item.checked_at
        }
        for item in history
    ]

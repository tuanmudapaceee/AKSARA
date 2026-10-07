import socket
import time
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.server import Server
from app.models.server_status import ServerStatus
from app.models.monitoring_history import MonitoringHistory


def check_tcp(
    host: str,
    port: int,
    timeout: int = 3
):
    """
    Perform TCP connectivity check only.

    This function does not access the database,
    so it is safe to run inside worker threads.
    """

    start = time.perf_counter()

    try:
        with socket.create_connection(
            (host, port),
            timeout=timeout
        ):
            elapsed = (
                time.perf_counter() - start
            ) * 1000

            return True, round(elapsed, 2)

    except Exception:
        return False, None


def update_monitoring_result(
    db: Session,
    server: Server,
    success: bool,
    response_time,
    save_history: bool = True
):
    """
    Store monitoring result.

    ServerStatus:
    - always updated

    MonitoringHistory:
    - saved when save_history=True
    - saved immediately when status changes
    - saved when status record is first created
    """

    now = datetime.now(timezone.utc)

    new_status = (
        "ONLINE"
        if success
        else "OFFLINE"
    )

    status = (
        db.query(ServerStatus)
        .filter(
            ServerStatus.server_id
            == server.id
        )
        .first()
    )

    previous_status = None
    is_new_status = False

    if status:
        previous_status = (
            status.status.upper()
            if status.status
            else None
        )

    else:
        status = ServerStatus(
            server_id=server.id
        )

        db.add(status)

        is_new_status = True

    status_changed = (
        previous_status is not None
        and previous_status != new_status
    )

    status.status = new_status
    status.response_time_ms = response_time
    status.last_check = now

    if success:
        status.last_online = now

    should_save_history = (
        save_history
        or status_changed
        or is_new_status
    )

    if should_save_history:
        history = MonitoringHistory(
            server_id=server.id,
            status=new_status,
            response_time_ms=response_time,
            checked_at=now
        )

        db.add(history)

    db.commit()

    return {
        "server_id": server.id,
        "name": server.name,
        "status": new_status,
        "response_time_ms": response_time,
        "last_check": now,
        "history_saved": should_save_history,
        "status_changed": status_changed
    }


def check_server(
    db: Session,
    server: Server,
    save_history: bool = True
):
    """
    Standard synchronous monitoring check.

    Used by API endpoints such as:
    - /api/monitoring/check/{server_id}
    - /api/monitoring/check-all
    """

    success, response_time = check_tcp(
        server.ip_address,
        server.port
    )

    return update_monitoring_result(
        db=db,
        server=server,
        success=success,
        response_time=response_time,
        save_history=save_history
    )
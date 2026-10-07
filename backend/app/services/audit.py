from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def create_audit_log(
    db: Session,
    action: str,
    user_id: int | None = None,
    resource_type: str | None = None,
    resource_id: int | None = None,
    source_ip: str | None = None,
    detail: str | None = None,
):
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        source_ip=source_ip,
        detail=detail,
    )

    db.add(log)

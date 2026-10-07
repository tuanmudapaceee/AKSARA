from datetime import datetime, timedelta, timezone
from math import ceil

from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import require_super_admin
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit_log import AuditLogListResponse


router = APIRouter(
    prefix="/api/audit-logs",
    tags=["Audit Logs"],
)


def classify_category(action: str):
    action_upper = (action or "").upper()

    # Security harus dicek lebih dulu.
    # Contoh: SSH_AUTH_FAILED harus masuk SECURITY,
    # bukan REMOTE_ACCESS.
    if any(
        keyword in action_upper
        for keyword in [
            "FAILED",
            "DENIED",
            "UNAUTHORIZED",
            "BLOCKED",
            "SECURITY",
            "BREACH",
            "COMPROMISE",
        ]
    ):
        return "SECURITY"

    if any(
        keyword in action_upper
        for keyword in [
            "LOGIN",
            "LOGOUT",
            "AUTH",
            "PASSWORD",
        ]
    ):
        return "AUTHENTICATION"

    if any(
        keyword in action_upper
        for keyword in [
            "SSH",
            "RDP",
            "VNC",
            "SESSION",
            "REMOTE",
        ]
    ):
        return "REMOTE_ACCESS"

    if any(
        keyword in action_upper
        for keyword in [
            "CREATE",
            "CREATED",
            "UPDATE",
            "UPDATED",
            "DELETE",
            "DELETED",
            "ACTIVATE",
            "DEACTIVATE",
            "PERMISSION",
            "ACCESS",
            "GRANTED",
            "REVOKED",
        ]
    ):
        return "CHANGE"

    return "SYSTEM"


def classify_severity(action: str):
    action_upper = (action or "").upper()

    # Explicit critical security events
    if any(
        keyword in action_upper
        for keyword in [
            "CRITICAL",
            "BREACH",
            "COMPROMISE",
        ]
    ):
        return "CRITICAL"

    # Administrative termination is an abnormal
    # session lifecycle event which requires review.
    if any(
        event == action_upper
        for event in [
            "RDP_SESSION_TERMINATED",
            "SSH_SESSION_TERMINATED",
            "VNC_SESSION_TERMINATED",
        ]
    ):
        return "WARNING"

    # Failed / denied / administrative-risk events
    if any(
        keyword in action_upper
        for keyword in [
            "FAILED",
            "DENIED",
            "UNAUTHORIZED",
            "BLOCKED",
            "DELETE",
            "DEACTIVATE",
            "REVOKED",
        ]
    ):
        return "WARNING"

    return "INFO"


def get_range_start(range_name: str):
    now = datetime.now(timezone.utc)

    jakarta_now = now + timedelta(hours=7)

    jakarta_today = jakarta_now.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    if range_name == "1D":
        start_jakarta = jakarta_today

    elif range_name == "30D":
        start_jakarta = jakarta_today - timedelta(days=29)

    else:
        start_jakarta = jakarta_today - timedelta(days=6)

    # convert kembali ke UTC
    return start_jakarta - timedelta(hours=7)


def serialize_log(
    log: AuditLog,
    user: User | None,
):
    return {
        "id": log.id,
        "user_id": log.user_id,

        "username": (
            user.username
            if user
            else None
        ),

        "full_name": (
            getattr(user, "full_name", None)
            if user
            else None
        ),

        "action": log.action,

        "category": classify_category(
            log.action
        ),

        "severity": classify_severity(
            log.action
        ),

        "resource_type": log.resource_type,
        "resource_id": log.resource_id,
        "resource_name": None,
        "source_ip": log.source_ip,
        "detail": log.detail,
        "created_at": log.created_at,
    }


@router.get(
    "/",
    response_model=AuditLogListResponse,
)
def get_audit_logs(
    range: str = Query(
        default="7D",
        pattern="^(1D|7D|30D)$",
    ),

    search: str = Query(
        default="",
        max_length=200,
    ),

    category: str = Query(
        default="ALL",
    ),

    action: str = Query(
        default="ALL",
    ),

    user_id: int | None = Query(
        default=None,
        ge=1,
    ),

    page: int = Query(
        default=1,
        ge=1,
    ),

    page_size: int = Query(
        default=25,
        ge=10,
        le=100,
    ),

    db: Session = Depends(
        get_db
    ),

    current_user=Depends(
        require_super_admin
    ),
):
    start_time = get_range_start(
        range
    )

    query = (
        db.query(
            AuditLog,
            User,
        )
        .outerjoin(
            User,
            User.id == AuditLog.user_id,
        )
        .filter(
            AuditLog.created_at >= start_time
        )
    )

    if user_id is not None:
        query = query.filter(
            or_(
                AuditLog.user_id == user_id,

                (
                    (AuditLog.resource_type == "user")
                    &
                    (AuditLog.resource_id == user_id)
                ),
            )
        )

    keyword = search.strip()

    if keyword:
        pattern = f"%{keyword}%"

        filters = [
            AuditLog.action.ilike(
                pattern
            ),

            AuditLog.resource_type.ilike(
                pattern
            ),

            AuditLog.source_ip.ilike(
                pattern
            ),

            AuditLog.detail.ilike(
                pattern
            ),

            cast(
                AuditLog.resource_id,
                String,
            ).ilike(
                pattern
            ),

            User.username.ilike(
                pattern
            ),
        ]

        if hasattr(
            User,
            "full_name"
        ):
            filters.append(
                User.full_name.ilike(
                    pattern
                )
            )

        query = query.filter(
            or_(
                *filters
            )
        )

    if action != "ALL":
        query = query.filter(
            AuditLog.action == action
        )

    rows = (
        query
        .order_by(
            AuditLog.created_at.desc()
        )
        .all()
    )

    all_items = [
        serialize_log(
            log,
            user,
        )
        for log, user in rows
    ]

    # Summary dihitung sebelum category filter
    # supaya card tetap menggambarkan semua event range.
    total_events = len(
        all_items
    )

    authentication_events = sum(
        1
        for item in all_items
        if item["category"] ==
        "AUTHENTICATION"
    )

    remote_access_events = sum(
        1
        for item in all_items
        if item["category"] ==
        "REMOTE_ACCESS"
    )

    change_events = sum(
        1
        for item in all_items
        if item["category"] ==
        "CHANGE"
    )

    security_events = sum(
        1
        for item in all_items
        if item["category"] ==
        "SECURITY"
    )

    filtered_items = all_items

    if category != "ALL":
        filtered_items = [
            item
            for item in filtered_items
            if item["category"] ==
            category
        ]

    total = len(
        filtered_items
    )

    total_pages = max(
        1,
        ceil(
            total /
            page_size
        ),
    )

    if page > total_pages:
        page = total_pages

    start = (
        page - 1
    ) * page_size

    end = (
        start +
        page_size
    )

    items = filtered_items[
        start:end
    ]

    return {
        "items": items,

        "total": total,

        "page": page,

        "page_size": page_size,

        "pages": total_pages,

        "total_events": total_events,

        "authentication_events":
            authentication_events,

        "remote_access_events":
            remote_access_events,

        "change_events":
            change_events,

        "security_events":
            security_events,
    }


@router.get(
    "/actions"
)
def get_actions(
    range: str = Query(
        default="30D",
        pattern="^(1D|7D|30D)$",
    ),

    db: Session = Depends(
        get_db
    ),

    current_user=Depends(
        require_super_admin
    ),
):
    start_time = get_range_start(
        range
    )

    rows = (
        db.query(
            AuditLog.action
        )
        .filter(
            AuditLog.created_at >= start_time
        )
        .distinct()
        .order_by(
            AuditLog.action.asc()
        )
        .all()
    )

    return [
        row[0]
        for row in rows
        if row[0]
    ]

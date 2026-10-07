from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int

    user_id: Optional[int] = None
    username: Optional[str] = None
    full_name: Optional[str] = None

    action: str
    category: str
    severity: str

    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    resource_name: Optional[str] = None

    source_ip: Optional[str] = None
    detail: Optional[str] = None

    created_at: datetime


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]

    total: int
    page: int
    page_size: int
    pages: int

    total_events: int
    authentication_events: int
    remote_access_events: int
    change_events: int
    security_events: int

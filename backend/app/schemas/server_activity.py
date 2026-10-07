from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AgentActivityEventCreate(BaseModel):
    server_id: int
    event_type: str
    event_time: datetime

    remote_username: Optional[str] = None

    path: Optional[str] = None
    process: Optional[str] = None
    command: Optional[str] = None
    syscall: Optional[str] = None

    pid: Optional[int] = None
    ppid: Optional[int] = None
    auid: Optional[int] = None

    audit_session: Optional[int] = None
    tty: Optional[str] = None

    success: Optional[bool] = None
    raw_detail: Optional[str] = None


class ServerActivityResponse(BaseModel):
    id: int
    session_id: Optional[int] = None

    server_id: int
    remote_username: Optional[str] = None

    event_type: str

    path: Optional[str] = None
    process: Optional[str] = None
    command: Optional[str] = None
    syscall: Optional[str] = None

    pid: Optional[int] = None
    ppid: Optional[int] = None
    auid: Optional[int] = None

    audit_session: Optional[int] = None
    tty: Optional[str] = None

    success: Optional[bool] = None

    event_time: datetime

    class Config:
        from_attributes = True
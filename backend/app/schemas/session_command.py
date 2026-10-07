from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SessionCommandResponse(BaseModel):
    id: int

    session_id: int
    user_id: int
    server_id: int

    remote_username: Optional[str] = None

    command: str

    executed_at: datetime

    class Config:
        from_attributes = True

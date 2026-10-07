from pydantic import BaseModel
from typing import Optional


class ServerGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ServerGroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

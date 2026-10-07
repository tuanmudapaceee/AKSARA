from pydantic import BaseModel
from typing import Optional


class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

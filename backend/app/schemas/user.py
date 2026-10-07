from pydantic import BaseModel, EmailStr
from typing import Optional


class RoleInfo(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: str
    role_id: int


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None


class UserPasswordReset(BaseModel):
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role_id: Optional[int] = None
    is_active: bool
    role: Optional[RoleInfo] = None

    class Config:
        from_attributes = True
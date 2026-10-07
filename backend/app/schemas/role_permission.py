from pydantic import BaseModel


class RolePermissionResponse(BaseModel):
    id: int
    role_id: int
    permission: str

    class Config:
        from_attributes = True


class RolePermissionUpdate(BaseModel):
    permissions: list[str]

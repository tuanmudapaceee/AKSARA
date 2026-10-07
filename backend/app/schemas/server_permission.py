from pydantic import BaseModel


class ServerPermissionCreate(BaseModel):
    user_id: int
    server_id: int

    allow_ssh: bool = False
    allow_rdp: bool = False
    allow_vnc: bool = False


class ServerPermissionUpdate(BaseModel):
    allow_ssh: bool = False
    allow_rdp: bool = False
    allow_vnc: bool = False


class ServerPermissionResponse(BaseModel):
    id: int
    user_id: int
    server_id: int

    allow_ssh: bool
    allow_rdp: bool
    allow_vnc: bool

    class Config:
        from_attributes = True

from pydantic import BaseModel


class UserServerAccessCreate(BaseModel):
    server_id: int
    can_connect: bool = True


class UserServerAccessBulkUpdate(BaseModel):
    server_ids: list[int]


class UserServerAccessResponse(BaseModel):
    id: int
    user_id: int
    server_id: int
    can_connect: bool

    class Config:
        from_attributes = True

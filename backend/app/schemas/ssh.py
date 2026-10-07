from pydantic import BaseModel


class SSHConnectRequest(BaseModel):
    username: str
    password: str

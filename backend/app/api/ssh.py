import asyncssh

from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.models.server import Server
from app.models.user import User
from app.schemas.ssh import SSHConnectRequest

from app.core.dependencies import get_current_user
from app.services.access_control import can_access_server


router = APIRouter(
    prefix="/api/ssh",
    tags=["SSH"]
)


@router.post("/test/{server_id}")
async def test_ssh(
    server_id: int,
    data: SSHConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    server = (
        db.query(Server)
        .filter(Server.id == server_id)
        .first()
    )

    if not server:
        raise HTTPException(
            status_code=404,
            detail="Server not found"
        )

    if server.protocol.upper() != "SSH":
        raise HTTPException(
            status_code=400,
            detail="Server is not configured for SSH"
        )

    if not can_access_server(
        db,
        current_user,
        server,
        "SSH"
    ):
        raise HTTPException(
            status_code=403,
            detail="SSH access denied"
        )

    try:
        async with asyncssh.connect(
            server.ip_address,
            port=server.port,
            username=data.username,
            password=data.password,
            known_hosts=None,
            login_timeout=10
        ) as conn:

            result = await conn.run(
                "hostname",
                check=True
            )

            return {
                "status": "success",
                "server_id": server.id,
                "server": server.name,
                "hostname": result.stdout.strip()
            }

    except asyncssh.PermissionDenied:
        raise HTTPException(
            status_code=401,
            detail="SSH authentication failed"
        )

    except (asyncssh.Error, OSError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"SSH connection failed: {str(exc)}"
        )

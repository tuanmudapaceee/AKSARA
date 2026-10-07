from sqlalchemy.orm import Session

from app.models.user import User
from app.models.server import Server
from app.models.server_permission import ServerPermission


def can_access_server(
    db: Session,
    user: User,
    server: Server,
    protocol: str
) -> bool:

    # Super Admin mempunyai akses penuh
    if user.role and user.role.name == "Super Admin":
        return True

    permission = (
        db.query(ServerPermission)
        .filter(
            ServerPermission.user_id == user.id,
            ServerPermission.server_id == server.id
        )
        .first()
    )

    if not permission:
        return False

    protocol = protocol.upper()

    if protocol == "SSH":
        return permission.allow_ssh

    if protocol == "RDP":
        return permission.allow_rdp

    if protocol == "VNC":
        return permission.allow_vnc

    return False

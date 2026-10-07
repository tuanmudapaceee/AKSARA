from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request
)

from fastapi import Request

from sqlalchemy.orm import Session

from app.database import get_db

from app.models.user import User
from app.models.server import Server
from app.models.server_permission import ServerPermission

from app.schemas.server_permission import (
    ServerPermissionCreate,
    ServerPermissionUpdate,
    ServerPermissionResponse
)

from app.core.dependencies import require_super_admin
from app.core.client_ip import get_request_client_ip
from app.services.audit import create_audit_log


router = APIRouter(
    prefix="/api/server-permissions",
    tags=["Server Permissions"]
)


@router.get(
    "/",
    response_model=list[ServerPermissionResponse]
)
def get_permissions(
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin)
):
    return (
        db.query(ServerPermission)
        .order_by(ServerPermission.id)
        .all()
    )


@router.get("/user/{user_id}")
def get_user_permissions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    servers = (
        db.query(Server)
        .order_by(Server.name)
        .all()
    )

    permissions = (
        db.query(ServerPermission)
        .filter(
            ServerPermission.user_id == user_id
        )
        .all()
    )

    permission_map = {
        permission.server_id: permission
        for permission in permissions
    }

    result = []

    for server in servers:
        permission = permission_map.get(
            server.id
        )

        result.append({
            "server_id": server.id,
            "server_name": server.name,
            "hostname": server.hostname,
            "ip_address": server.ip_address,
            "protocol": server.protocol,
            "port": server.port,
            "is_active": server.is_active,

            "permission_id": (
                permission.id
                if permission
                else None
            ),

            "allow_ssh": (
                permission.allow_ssh
                if permission
                else False
            ),

            "allow_rdp": (
                permission.allow_rdp
                if permission
                else False
            ),

            "allow_vnc": (
                permission.allow_vnc
                if permission
                else False
            )
        })

    return {
        "user_id": user.id,
        "username": user.username,
        "role": (
            user.role.name
            if user.role
            else None
        ),
        "servers": result
    }


@router.post("/")
def create_permission(
    data: ServerPermissionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin)
):
    user = (
        db.query(User)
        .filter(User.id == data.user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    server = (
        db.query(Server)
        .filter(Server.id == data.server_id)
        .first()
    )

    if not server:
        raise HTTPException(
            status_code=404,
            detail="Server not found"
        )

    existing = (
        db.query(ServerPermission)
        .filter(
            ServerPermission.user_id == data.user_id,
            ServerPermission.server_id == data.server_id
        )
        .first()
    )

    if existing:
        existing.allow_ssh = data.allow_ssh
        existing.allow_rdp = data.allow_rdp
        existing.allow_vnc = data.allow_vnc

        db.commit()
        db.refresh(existing)

        return existing

    permission = ServerPermission(
        user_id=data.user_id,
        server_id=data.server_id,
        allow_ssh=data.allow_ssh,
        allow_rdp=data.allow_rdp,
        allow_vnc=data.allow_vnc
    )

    db.add(permission)

    try:
        db.commit()
        db.refresh(permission)

    except Exception:
        db.rollback()
        raise

    return permission


@router.put(
    "/{permission_id}",
    response_model=ServerPermissionResponse
)
def update_permission(
    permission_id: int,
    data: ServerPermissionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin)
):
    permission = (
        db.query(ServerPermission)
        .filter(
            ServerPermission.id == permission_id
        )
        .first()
    )

    if not permission:
        raise HTTPException(
            status_code=404,
            detail="Permission not found"
        )

    permission.allow_ssh = data.allow_ssh
    permission.allow_rdp = data.allow_rdp
    permission.allow_vnc = data.allow_vnc

    try:
        db.commit()
        db.refresh(permission)

    except Exception:
        db.rollback()
        raise

    return permission


@router.put("/user/{user_id}")
def save_user_permissions(
    user_id: int,
    permissions: list[ServerPermissionCreate],
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin)
):
    source_ip = get_request_client_ip(
        request
    )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    granted = []
    revoked = []
    changed = []

    def protocol_list(
        allow_ssh: bool,
        allow_rdp: bool,
        allow_vnc: bool,
    ):
        items = []

        if allow_ssh:
            items.append("SSH")

        if allow_rdp:
            items.append("RDP")

        if allow_vnc:
            items.append("VNC")

        return ",".join(items) or "NONE"

    try:
        for data in permissions:

            if data.user_id != user_id:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "user_id in payload "
                        "does not match URL"
                    )
                )

            server = (
                db.query(Server)
                .filter(
                    Server.id == data.server_id
                )
                .first()
            )

            if not server:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"Server {data.server_id} "
                        "not found"
                    )
                )

            existing = (
                db.query(ServerPermission)
                .filter(
                    ServerPermission.user_id
                    == user_id,

                    ServerPermission.server_id
                    == data.server_id
                )
                .first()
            )

            has_access = (
                data.allow_ssh
                or data.allow_rdp
                or data.allow_vnc
            )

            after_protocols = protocol_list(
                data.allow_ssh,
                data.allow_rdp,
                data.allow_vnc,
            )

            if existing:

                before_protocols = protocol_list(
                    existing.allow_ssh,
                    existing.allow_rdp,
                    existing.allow_vnc,
                )

                if has_access:

                    existing.allow_ssh = (
                        data.allow_ssh
                    )

                    existing.allow_rdp = (
                        data.allow_rdp
                    )

                    existing.allow_vnc = (
                        data.allow_vnc
                    )

                    if (
                        before_protocols
                        != after_protocols
                    ):
                        changed.append(
                            f"{server.name}"
                            f"[{before_protocols}"
                            f"->{after_protocols}]"
                        )

                else:
                    db.delete(existing)

                    revoked.append(
                        f"{server.name}"
                        f"[{before_protocols}]"
                    )

            elif has_access:

                permission = ServerPermission(
                    user_id=user_id,
                    server_id=data.server_id,
                    allow_ssh=data.allow_ssh,
                    allow_rdp=data.allow_rdp,
                    allow_vnc=data.allow_vnc
                )

                db.add(permission)

                granted.append(
                    f"{server.name}"
                    f"[{after_protocols}]"
                )

        change_parts = []

        if granted:
            change_parts.append(
                "granted="
                + ", ".join(granted)
            )

        if revoked:
            change_parts.append(
                "revoked="
                + ", ".join(revoked)
            )

        if changed:
            change_parts.append(
                "changed="
                + ", ".join(changed)
            )

        if change_parts:
            create_audit_log(
                db=db,
                action="SERVER_ACCESS_UPDATED",
                user_id=current_user.id,
                resource_type="user",
                resource_id=user.id,
                source_ip=source_ip,
                detail=(
                    f"Server access updated "
                    f"for {user.username} "
                    f"by {current_user.username}; "
                    + "; ".join(
                        change_parts
                    )
                ),
            )

        db.commit()

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Server permissions updated",
        "user_id": user.id,
        "username": user.username
    }


@router.delete("/{permission_id}")
def delete_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin)
):
    permission = (
        db.query(ServerPermission)
        .filter(
            ServerPermission.id == permission_id
        )
        .first()
    )

    if not permission:
        raise HTTPException(
            status_code=404,
            detail="Permission not found"
        )

    db.delete(permission)

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Permission deleted"
    }
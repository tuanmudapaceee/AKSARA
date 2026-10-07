from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.server import Server
from app.models.server_group import ServerGroup
from app.models.server_permission import ServerPermission

from app.schemas.server import (
    ServerCreate,
    ServerUpdate,
    ServerResponse
)

from app.core.dependencies import (
    get_current_user,
    require_super_admin
)


router = APIRouter(
    prefix="/api/servers",
    tags=["Servers"]
)


def validate_server_group(
    db: Session,
    group_id: int | None
):
    if group_id is None:
        return

    group = (
        db.query(ServerGroup)
        .filter(
            ServerGroup.id == group_id
        )
        .first()
    )

    if not group:
        raise HTTPException(
            status_code=400,
            detail="Server group not found"
        )


def check_duplicate_server(
    db: Session,
    ip_address: str,
    port: int,
    exclude_server_id: int | None = None
):
    query = (
        db.query(Server)
        .filter(
            Server.ip_address == ip_address,
            Server.port == port
        )
    )

    if exclude_server_id is not None:
        query = query.filter(
            Server.id != exclude_server_id
        )

    existing = query.first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=(
                "Server with same IP "
                "and port already exists"
            )
        )


def is_super_admin(user) -> bool:
    return (
        user.role is not None
        and user.role.name == "Super Admin"
    )


def get_allowed_servers_for_user(
    db: Session,
    current_user
):
    """
    Super Admin:
        - melihat seluruh server

    User biasa:
        - hanya melihat server yang memiliki ServerPermission
        - hanya jika protocol server tersebut diizinkan
    """

    if is_super_admin(current_user):
        return (
            db.query(Server)
            .order_by(Server.id)
            .all()
        )

    permissions = (
        db.query(ServerPermission)
        .filter(
            ServerPermission.user_id == current_user.id
        )
        .all()
    )

    allowed_server_ids = []

    for permission in permissions:
        server = (
            db.query(Server)
            .filter(
                Server.id == permission.server_id
            )
            .first()
        )

        if not server:
            continue

        if not server.is_active:
            continue

        protocol = (
            server.protocol or ""
        ).upper()

        if (
            protocol == "SSH"
            and permission.allow_ssh
        ):
            allowed_server_ids.append(
                server.id
            )

        elif (
            protocol == "RDP"
            and permission.allow_rdp
        ):
            allowed_server_ids.append(
                server.id
            )

        elif (
            protocol == "VNC"
            and permission.allow_vnc
        ):
            allowed_server_ids.append(
                server.id
            )

    if not allowed_server_ids:
        return []

    return (
        db.query(Server)
        .filter(
            Server.id.in_(
                allowed_server_ids
            )
        )
        .order_by(Server.id)
        .all()
    )


@router.get(
    "/",
    response_model=list[ServerResponse]
)
def get_servers(
    db: Session = Depends(get_db),
    current_user=Depends(
        get_current_user
    )
):
    return get_allowed_servers_for_user(
        db,
        current_user
    )


@router.get(
    "/{server_id}",
    response_model=ServerResponse
)
def get_server(
    server_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        get_current_user
    )
):
    server = (
        db.query(Server)
        .filter(
            Server.id == server_id
        )
        .first()
    )

    if not server:
        raise HTTPException(
            status_code=404,
            detail="Server not found"
        )

    if is_super_admin(current_user):
        return server

    if not server.is_active:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    permission = (
        db.query(ServerPermission)
        .filter(
            ServerPermission.user_id
            == current_user.id,
            ServerPermission.server_id
            == server.id
        )
        .first()
    )

    if not permission:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    protocol = (
        server.protocol or ""
    ).upper()

    allowed = False

    if protocol == "SSH":
        allowed = bool(
            permission.allow_ssh
        )

    elif protocol == "RDP":
        allowed = bool(
            permission.allow_rdp
        )

    elif protocol == "VNC":
        allowed = bool(
            permission.allow_vnc
        )

    if not allowed:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    return server


@router.post(
    "/",
    response_model=ServerResponse
)
def create_server(
    data: ServerCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    )
):
    validate_server_group(
        db,
        data.group_id
    )

    check_duplicate_server(
        db=db,
        ip_address=data.ip_address,
        port=data.port
    )

    server = Server(
        name=data.name,
        hostname=data.hostname,
        ip_address=data.ip_address,
        operating_system=
            data.operating_system,
        protocol=
            data.protocol.upper(),
        port=data.port,
        description=
            data.description,
        group_id=
            data.group_id,
        is_active=True
    )

    db.add(server)

    try:
        db.commit()
        db.refresh(server)

    except Exception:
        db.rollback()
        raise

    return server


@router.put(
    "/{server_id}",
    response_model=ServerResponse
)
def update_server(
    server_id: int,
    data: ServerUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    )
):
    server = (
        db.query(Server)
        .filter(
            Server.id == server_id
        )
        .first()
    )

    if not server:
        raise HTTPException(
            status_code=404,
            detail="Server not found"
        )

    update_data = (
        data.model_dump(
            exclude_unset=True
        )
    )

    if "group_id" in update_data:
        validate_server_group(
            db,
            update_data["group_id"]
        )

    new_ip = update_data.get(
        "ip_address",
        server.ip_address
    )

    new_port = update_data.get(
        "port",
        server.port
    )

    check_duplicate_server(
        db=db,
        ip_address=new_ip,
        port=new_port,
        exclude_server_id=
            server.id
    )

    if "protocol" in update_data:
        update_data["protocol"] = (
            update_data[
                "protocol"
            ].upper()
        )

    for key, value in (
        update_data.items()
    ):
        setattr(
            server,
            key,
            value
        )

    try:
        db.commit()
        db.refresh(server)

    except Exception:
        db.rollback()
        raise

    return server


@router.delete(
    "/{server_id}"
)
def deactivate_server(
    server_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    )
):
    server = (
        db.query(Server)
        .filter(
            Server.id == server_id
        )
        .first()
    )

    if not server:
        raise HTTPException(
            status_code=404,
            detail="Server not found"
        )

    if not server.is_active:
        return {
            "message":
                "Server already inactive",
            "server_id":
                server.id
        }

    server.is_active = False

    try:
        db.commit()
        db.refresh(server)

    except Exception:
        db.rollback()
        raise

    return {
        "message":
            "Server deactivated",
        "server_id":
            server.id
    }


# ============================================================
# PERMANENT DELETE SERVER
# ============================================================

@router.delete(
    "/{server_id}/permanent"
)
def permanently_delete_server(
    server_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    )
):
    server = (
        db.query(Server)
        .filter(
            Server.id == server_id
        )
        .first()
    )

    if not server:
        raise HTTPException(
            status_code=404,
            detail="Server not found"
        )

    server_name = server.name

    deleted_records = {}

    try:

        #
        # Delete dependencies first.
        #
        # Permanent delete intentionally removes
        # all data related to this server.
        #

        cleanup_tables = [
            "session_commands",
            "server_activity_events",
            "server_permissions",
            "monitoring_history",
            "server_status",
            "user_server_access",
            "sessions",
        ]

        for table_name in cleanup_tables:

            result = db.execute(
                text(
                    f"""
                    DELETE FROM {table_name}
                    WHERE server_id = :server_id
                    """
                ),
                {
                    "server_id":
                        server_id
                }
            )

            deleted_records[
                table_name
            ] = (
                result.rowcount
                if result.rowcount
                is not None
                else 0
            )


        #
        # Finally delete server inventory record.
        #

        db.delete(
            server
        )

        db.commit()


    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Unable to permanently delete "
                "server. "
                f"{str(exc)}"
            )
        )


    return {
        "message":
            "Server permanently deleted",

        "server_id":
            server_id,

        "server_name":
            server_name,

        "deleted_related_records":
            deleted_records,
    }


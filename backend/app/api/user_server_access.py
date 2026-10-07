from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session

from app.database import get_db

from app.core.dependencies import (
    require_super_admin,
)

from app.models.user import User
from app.models.server import Server
from app.models.user_server_access import (
    UserServerAccess,
)

from app.schemas.user_server_access import (
    UserServerAccessCreate,
    UserServerAccessBulkUpdate,
)


router = APIRouter(
    prefix="/api/users",
    tags=["User Server Access"],
)


def get_target_user(
    db: Session,
    user_id: int,
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user


def get_target_server(
    db: Session,
    server_id: int,
):
    server = (
        db.query(Server)
        .filter(Server.id == server_id)
        .first()
    )

    if not server:
        raise HTTPException(
            status_code=404,
            detail="Server not found",
        )

    return server


@router.get(
    "/{user_id}/server-access"
)
def get_user_server_access(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    ),
):
    user = get_target_user(
        db,
        user_id,
    )

    assignments = (
        db.query(UserServerAccess)
        .filter(
            UserServerAccess.user_id
            == user_id
        )
        .order_by(
            UserServerAccess.server_id
        )
        .all()
    )

    result = []

    for assignment in assignments:
        server = (
            db.query(Server)
            .filter(
                Server.id
                == assignment.server_id
            )
            .first()
        )

        result.append({
            "id": assignment.id,
            "user_id": assignment.user_id,
            "username": user.username,
            "server_id":
                assignment.server_id,
            "server_name":
                server.name
                if server
                else None,
            "ip_address":
                server.ip_address
                if server
                else None,
            "protocol":
                server.protocol
                if server
                else None,
            "port":
                server.port
                if server
                else None,
            "server_active":
                server.is_active
                if server
                else False,
            "can_connect":
                assignment.can_connect,
            "created_by":
                assignment.created_by,
            "created_at":
                assignment.created_at,
        })

    return result


@router.post(
    "/{user_id}/server-access"
)
def assign_server_to_user(
    user_id: int,
    data: UserServerAccessCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    ),
):
    get_target_user(
        db,
        user_id,
    )

    server = get_target_server(
        db,
        data.server_id,
    )

    existing = (
        db.query(UserServerAccess)
        .filter(
            UserServerAccess.user_id
            == user_id,
            UserServerAccess.server_id
            == data.server_id,
        )
        .first()
    )

    if existing:
        existing.can_connect = (
            data.can_connect
        )

        db.commit()
        db.refresh(existing)

        return {
            "message":
                "Server access updated",
            "user_id":
                user_id,
            "server_id":
                server.id,
            "server_name":
                server.name,
            "can_connect":
                existing.can_connect,
        }

    access = UserServerAccess(
        user_id=user_id,
        server_id=data.server_id,
        can_connect=data.can_connect,
        created_by=current_user.id,
    )

    db.add(access)

    try:
        db.commit()
        db.refresh(access)

    except Exception:
        db.rollback()
        raise

    return {
        "message":
            "Server assigned to user",
        "user_id":
            user_id,
        "server_id":
            server.id,
        "server_name":
            server.name,
        "can_connect":
            access.can_connect,
    }


@router.delete(
    "/{user_id}/server-access/{server_id}"
)
def revoke_server_from_user(
    user_id: int,
    server_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    ),
):
    get_target_user(
        db,
        user_id,
    )

    get_target_server(
        db,
        server_id,
    )

    access = (
        db.query(UserServerAccess)
        .filter(
            UserServerAccess.user_id
            == user_id,
            UserServerAccess.server_id
            == server_id,
        )
        .first()
    )

    if not access:
        raise HTTPException(
            status_code=404,
            detail=(
                "Server access assignment "
                "not found"
            ),
        )

    db.delete(access)

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message":
            "Server access revoked",
        "user_id":
            user_id,
        "server_id":
            server_id,
    }


@router.put(
    "/{user_id}/server-access"
)
def replace_user_server_access(
    user_id: int,
    data: UserServerAccessBulkUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    ),
):
    user = get_target_user(
        db,
        user_id,
    )

    server_ids = list(
        dict.fromkeys(
            data.server_ids
        )
    )

    if server_ids:
        servers = (
            db.query(Server)
            .filter(
                Server.id.in_(
                    server_ids
                )
            )
            .all()
        )

        existing_server_ids = {
            server.id
            for server in servers
        }

        invalid_server_ids = [
            server_id
            for server_id
            in server_ids
            if server_id
            not in existing_server_ids
        ]

        if invalid_server_ids:
            raise HTTPException(
                status_code=400,
                detail={
                    "message":
                        "One or more servers "
                        "do not exist",
                    "server_ids":
                        invalid_server_ids,
                },
            )

    try:
        (
            db.query(UserServerAccess)
            .filter(
                UserServerAccess.user_id
                == user_id
            )
            .delete(
                synchronize_session=False
            )
        )

        for server_id in server_ids:
            access = UserServerAccess(
                user_id=user_id,
                server_id=server_id,
                can_connect=True,
                created_by=current_user.id,
            )

            db.add(access)

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message":
            "User server access updated",
        "user_id":
            user.id,
        "username":
            user.username,
        "server_ids":
            server_ids,
        "total":
            len(server_ids),
    }

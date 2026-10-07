from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.server_group import ServerGroup
from app.core.dependencies import require_super_admin

router = APIRouter(
    prefix="/api/server-groups",
    tags=["Server Groups"]
)


@router.get("/")
def get_server_groups(
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin)
):
    groups = (
        db.query(ServerGroup)
        .order_by(ServerGroup.name)
        .all()
    )

    return [
        {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "created_at": group.created_at,
        }
        for group in groups
    ]


@router.post("/")
def create_server_group(
    data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin)
):
    name = str(data.get("name", "")).strip()
    description = data.get("description")

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Group name is required"
        )

    existing = (
        db.query(ServerGroup)
        .filter(ServerGroup.name == name)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Server group already exists"
        )

    group = ServerGroup(
        name=name,
        description=description
    )

    db.add(group)
    db.commit()
    db.refresh(group)

    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "created_at": group.created_at,
    }


@router.put("/{group_id}")
def update_server_group(
    group_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin)
):
    group = (
        db.query(ServerGroup)
        .filter(ServerGroup.id == group_id)
        .first()
    )

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Server group not found"
        )

    if "name" in data:
        name = str(data["name"]).strip()

        if not name:
            raise HTTPException(
                status_code=400,
                detail="Group name cannot be empty"
            )

        duplicate = (
            db.query(ServerGroup)
            .filter(
                ServerGroup.name == name,
                ServerGroup.id != group_id
            )
            .first()
        )

        if duplicate:
            raise HTTPException(
                status_code=400,
                detail="Server group already exists"
            )

        group.name = name

    if "description" in data:
        group.description = data["description"]

    db.commit()
    db.refresh(group)

    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "created_at": group.created_at,
    }


@router.delete("/{group_id}")
def delete_server_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin)
):
    group = (
        db.query(ServerGroup)
        .filter(ServerGroup.id == group_id)
        .first()
    )

    if not group:
        raise HTTPException(
            status_code=404,
            detail="Server group not found"
        )

    from app.models.server import Server

    used = (
        db.query(Server)
        .filter(Server.group_id == group_id)
        .first()
    )

    if used:
        raise HTTPException(
            status_code=400,
            detail="Server group is still used by one or more servers"
        )

    db.delete(group)
    db.commit()

    return {
        "message": "Server group deleted"
    }
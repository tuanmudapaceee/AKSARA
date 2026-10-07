from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.role import Role
from app.schemas.role import RoleCreate, RoleResponse
from app.core.dependencies import require_super_admin


router = APIRouter(
    prefix="/api/roles",
    tags=["Roles"]
)


@router.get("/", response_model=list[RoleResponse])
def get_roles(
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin)
):
    return db.query(Role).order_by(Role.id).all()


@router.post("/", response_model=RoleResponse)
def create_role(
    data: RoleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_super_admin)
):
    existing = (
        db.query(Role)
        .filter(Role.name == data.name)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Role already exists"
        )

    role = Role(
        name=data.name,
        description=data.description
    )

    db.add(role)
    db.commit()
    db.refresh(role)

    return role

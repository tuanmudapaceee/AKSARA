from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request
)

from sqlalchemy.orm import (
    Session,
    joinedload
)

from app.database import get_db

from app.models.user import User
from app.models.role import Role

from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserPasswordReset,
    UserResponse
)

from app.core.security import (
    hash_password
)

from app.core.dependencies import (
    require_super_admin
)

from app.core.client_ip import (
    get_request_client_ip
)

from app.services.audit import (
    create_audit_log
)


router = APIRouter(
    prefix="/api/users",
    tags=["Users"]
)


def get_user_with_role(
    db: Session,
    user_id: int
):
    return (
        db.query(User)
        .options(
            joinedload(User.role)
        )
        .filter(
            User.id == user_id
        )
        .first()
    )


@router.get(
    "/",
    response_model=list[UserResponse]
)
def get_users(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    )
):
    return (
        db.query(User)
        .options(
            joinedload(User.role)
        )
        .order_by(User.id)
        .all()
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    )
):
    user = get_user_with_role(
        db,
        user_id
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


@router.post(
    "/",
    response_model=UserResponse
)
def create_user(
    data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    )
):
    source_ip = get_request_client_ip(
        request
    )
    username = data.username.strip()

    if not username:
        raise HTTPException(
            status_code=400,
            detail="Username is required"
        )

    existing_username = (
        db.query(User)
        .filter(
            User.username == username
        )
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    if data.email:
        existing_email = (
            db.query(User)
            .filter(
                User.email == data.email
            )
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="Email already exists"
            )

    role = (
        db.query(Role)
        .filter(
            Role.id == data.role_id
        )
        .first()
    )

    if not role:
        raise HTTPException(
            status_code=400,
            detail="Role not found"
        )

    if len(data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain "
                "at least 8 characters"
            )
        )

    user = User(
        username=username,
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(
            data.password
        ),
        role_id=data.role_id,
        is_active=True
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)

        create_audit_log(
            db=db,
            action="USER_CREATED",
            user_id=current_user.id,
            resource_type="user",
            resource_id=user.id,
            source_ip=source_ip,
            detail=(
                f"User created: "
                f"{user.username}; "
                f"role={role.name}"
            ),
        )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return get_user_with_role(
        db,
        user.id
    )


@router.put(
    "/{user_id}",
    response_model=UserResponse
)
def update_user(
    user_id: int,
    data: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    )
):
    source_ip = get_request_client_ip(
        request
    )
    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    original_username = user.username
    original_role_id = user.role_id
    original_is_active = user.is_active

    if "username" in update_data:
        username = (
            update_data["username"]
            or ""
        ).strip()

        if not username:
            raise HTTPException(
                status_code=400,
                detail="Username is required"
            )

        duplicate_username = (
            db.query(User)
            .filter(
                User.username == username,
                User.id != user.id
            )
            .first()
        )

        if duplicate_username:
            raise HTTPException(
                status_code=400,
                detail="Username already exists"
            )

        update_data["username"] = username

    if (
        "email" in update_data
        and update_data["email"]
    ):
        duplicate_email = (
            db.query(User)
            .filter(
                User.email
                == update_data["email"],
                User.id != user.id
            )
            .first()
        )

        if duplicate_email:
            raise HTTPException(
                status_code=400,
                detail="Email already exists"
            )

    if (
        "role_id" in update_data
        and update_data["role_id"]
        is not None
    ):
        role = (
            db.query(Role)
            .filter(
                Role.id
                == update_data["role_id"]
            )
            .first()
        )

        if not role:
            raise HTTPException(
                status_code=400,
                detail="Role not found"
            )

    # Jangan biarkan Super Admin
    # menonaktifkan akunnya sendiri.
    if (
        user.id == current_user.id
        and update_data.get(
            "is_active"
        ) is False
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "You cannot deactivate "
                "your own account"
            )
        )

    for key, value in update_data.items():
        setattr(
            user,
            key,
            value
        )

    try:
        db.commit()
        db.refresh(user)

        if (
            "is_active" in update_data
            and user.is_active
            != original_is_active
        ):
            action = (
                "USER_ACTIVATED"
                if user.is_active
                else "USER_DEACTIVATED"
            )

            detail = (
                f"User "
                f"{user.username} "
                f"{'activated' if user.is_active else 'deactivated'} "
                f"by {current_user.username}"
            )

        else:
            action = "USER_UPDATED"

            changed_fields = ", ".join(
                sorted(
                    update_data.keys()
                )
            )

            detail = (
                f"User updated: "
                f"{original_username}; "
                f"fields={changed_fields}"
            )

            if (
                "role_id" in update_data
                and user.role_id
                != original_role_id
            ):
                detail += (
                    f"; role_id="
                    f"{original_role_id}"
                    f"->{user.role_id}"
                )

        create_audit_log(
            db=db,
            action=action,
            user_id=current_user.id,
            resource_type="user",
            resource_id=user.id,
            source_ip=source_ip,
            detail=detail,
        )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return get_user_with_role(
        db,
        user.id
    )


@router.put(
    "/{user_id}/password"
)
def reset_user_password(
    user_id: int,
    data: UserPasswordReset,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    )
):
    source_ip = get_request_client_ip(
        request
    )
    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if len(data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain "
                "at least 8 characters"
            )
        )

    user.password_hash = hash_password(
        data.password
    )

    try:
        db.commit()

        create_audit_log(
            db=db,
            action="PASSWORD_RESET",
            user_id=current_user.id,
            resource_type="user",
            resource_id=user.id,
            source_ip=source_ip,
            detail=(
                f"Password reset for "
                f"{user.username} "
                f"by {current_user.username}"
            ),
        )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message":
            "Password updated successfully",
        "user_id":
            user.id,
        "username":
            user.username
    }


@router.delete(
    "/{user_id}"
)
def deactivate_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_super_admin
    )
):
    source_ip = get_request_client_ip(
        request
    )
    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail=(
                "You cannot deactivate "
                "your own account"
            )
        )

    if not user.is_active:
        return {
            "message":
                "User already inactive",
            "user_id":
                user.id
        }

    user.is_active = False

    try:
        db.commit()

        create_audit_log(
            db=db,
            action="USER_DEACTIVATED",
            user_id=current_user.id,
            resource_type="user",
            resource_id=user.id,
            source_ip=source_ip,
            detail=(
                f"User {user.username} "
                f"deactivated by "
                f"{current_user.username}"
            ),
        )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message":
            "User deactivated",
        "user_id":
            user.id
    }
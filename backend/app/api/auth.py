from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.core.client_ip import get_request_client_ip
from app.services.audit import create_audit_log


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


@router.post("/login", response_model=Token)
def login(
    data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    source_ip = get_request_client_ip(request)
    user = (
        db.query(User)
        .filter(User.username == data.username)
        .first()
    )

    if not user:
        create_audit_log(
            db=db,
            action="LOGIN_FAILED",
            user_id=None,
            resource_type="authentication",
            source_ip=source_ip,
            detail=(
                "Login failed for unknown username "
                f"{data.username}"
            ),
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not verify_password(
        data.password,
        user.password_hash
    ):
        create_audit_log(
            db=db,
            action="LOGIN_FAILED",
            user_id=user.id,
            resource_type="authentication",
            resource_id=user.id,
            source_ip=source_ip,
            detail=(
                "Login failed: invalid credentials"
            ),
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not user.is_active:
        create_audit_log(
            db=db,
            action="LOGIN_BLOCKED",
            user_id=user.id,
            resource_type="authentication",
            resource_id=user.id,
            source_ip=source_ip,
            detail=(
                "Login blocked: user account inactive"
            ),
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )

    token = create_access_token(
        subject=user.username
    )

    create_audit_log(
        db=db,
        action="LOGIN_SUCCESS",
        user_id=user.id,
        resource_type="authentication",
        resource_id=user.id,
        source_ip=source_ip,
        detail="User successfully signed in",
    )

    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.post("/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    source_ip = get_request_client_ip(
        request
    )

    create_audit_log(
        db=db,
        action="LOGOUT",
        user_id=current_user.id,
        resource_type="authentication",
        resource_id=current_user.id,
        source_ip=source_ip,
        detail="User signed out",
    )

    db.commit()

    return {
        "message":
            "Logged out successfully"
    }


@router.get("/me")
def me(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role_id": current_user.role_id,
        "is_active": current_user.is_active,
        "role": {
            "id": current_user.role.id,
            "name": current_user.role.name
        } if current_user.role else None
    }
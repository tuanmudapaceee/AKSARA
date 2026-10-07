from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.user import User
from app.models.role_permission import RolePermission


bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )

        username = payload.get("sub")

        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )

    return user

def require_super_admin(
    current_user: User = Depends(get_current_user)
):
    if not current_user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role not assigned"
        )

    if current_user.role.name != "Super Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )

    return current_user



def require_permission(
    permission: str
):
    """
    Require an AKSARA RBAC permission.

    Super Admin always has full access
    to prevent administrative lockout.
    """

    def permission_dependency(
        current_user: User = Depends(
            get_current_user
        ),
        db: Session = Depends(
            get_db
        ),
    ):
        if not current_user.role:
            raise HTTPException(
                status_code=
                    status.HTTP_403_FORBIDDEN,
                detail="Role not assigned",
            )

        # Super Admin bypass
        if (
            current_user.role.name
            == "Super Admin"
        ):
            return current_user

        allowed = (
            db.query(RolePermission)
            .filter(
                RolePermission.role_id
                == current_user.role_id,

                RolePermission.permission
                == permission,
            )
            .first()
        )

        if not allowed:
            raise HTTPException(
                status_code=
                    status.HTTP_403_FORBIDDEN,
                detail=(
                    "Permission required: "
                    f"{permission}"
                ),
            )

        return current_user

    return permission_dependency

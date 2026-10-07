from app.database import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.role_permission import RolePermission

from app.core.security import hash_password
from app.core.permissions import (
    SUPER_ADMIN_PERMISSIONS,
    ADMINISTRATOR_PERMISSIONS,
)


db = SessionLocal()

try:
    role = (
        db.query(Role)
        .filter(Role.name == "Super Admin")
        .first()
    )

    if not role:
        role = Role(
            name="Super Admin",
            description="Full system access"
        )
        db.add(role)
        db.commit()
        db.refresh(role)

    # =====================================================
    # RBAC DEFAULT PERMISSIONS
    # =====================================================

    administrator_role = (
        db.query(Role)
        .filter(
            Role.name == "Administrator"
        )
        .first()
    )

    if not administrator_role:
        administrator_role = Role(
            name="Administrator",
            description=(
                "Manage users, servers, "
                "and system configuration"
            ),
        )

        db.add(administrator_role)
        db.commit()
        db.refresh(administrator_role)


    default_role_permissions = {
        role.id:
            SUPER_ADMIN_PERMISSIONS,
        administrator_role.id:
            ADMINISTRATOR_PERMISSIONS,
    }


    for role_id, permissions in (
        default_role_permissions.items()
    ):

        existing_permissions = {
            item.permission
            for item in (
                db.query(RolePermission)
                .filter(
                    RolePermission.role_id
                    == role_id
                )
                .all()
            )
        }

        for permission in permissions:

            if (
                permission
                in existing_permissions
            ):
                continue

            db.add(
                RolePermission(
                    role_id=role_id,
                    permission=permission,
                )
            )

    db.commit()


    admin = (
        db.query(User)
        .filter(User.username == "admin")
        .first()
    )

    if not admin:
        admin = User(
            username="admin",
            email="admin@aksara.local",
            full_name="AKSARA Administrator",
            password_hash=hash_password("AksaraAdmin_2026!"),
            is_active=True,
            role_id=role.id
        )

        db.add(admin)
        db.commit()

        print("Super Admin created")

    else:
        print("Admin already exists")

finally:
    db.close()

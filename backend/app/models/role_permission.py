from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)

from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class RolePermission(Base):
    __tablename__ = "role_permissions"

    __table_args__ = (
        UniqueConstraint(
            "role_id",
            "permission",
            name="uq_role_permission",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    role_id = Column(
        Integer,
        ForeignKey(
            "roles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    permission = Column(
        String(100),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    role = relationship(
        "Role",
        back_populates="permissions",
    )

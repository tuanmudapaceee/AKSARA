from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
)

from sqlalchemy.sql import func

from app.database import Base


class UserServerAccess(Base):
    __tablename__ = "user_server_access"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    server_id = Column(
        Integer,
        ForeignKey("servers.id"),
        nullable=False,
        index=True,
    )

    can_connect = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "server_id",
            name="uq_user_server_access",
        ),
    )

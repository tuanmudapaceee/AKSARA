from sqlalchemy import (
    Column,
    Integer,
    Boolean,
    ForeignKey,
    UniqueConstraint
)

from sqlalchemy.orm import relationship

from app.database import Base


class ServerPermission(Base):
    __tablename__ = "server_permissions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    server_id = Column(
        Integer,
        ForeignKey("servers.id"),
        nullable=False
    )

    allow_ssh = Column(
        Boolean,
        default=False,
        nullable=False
    )

    allow_rdp = Column(
        Boolean,
        default=False,
        nullable=False
    )

    allow_vnc = Column(
        Boolean,
        default=False,
        nullable=False
    )

    user = relationship("User")
    server = relationship("Server")

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "server_id",
            name="uq_user_server_permission"
        ),
    )

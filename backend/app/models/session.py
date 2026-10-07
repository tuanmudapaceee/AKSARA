from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
)

from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    server_id = Column(
        Integer,
        ForeignKey("servers.id"),
        nullable=False,
    )

    protocol = Column(
        String(20),
        nullable=False,
    )

    source_ip = Column(
        String(45),
        nullable=True,
    )

    remote_username = Column(
        String(150),
        nullable=True,
    )

    #
    # Linux audit/session correlation
    #
    audit_session = Column(
        BigInteger,
        nullable=True,
        index=True,
    )

    tty = Column(
        String(100),
        nullable=True,
    )

    remote_shell_pid = Column(
        Integer,
        nullable=True,
    )

    started_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    ended_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    status = Column(
        String(30),
        default="ACTIVE",
        nullable=False,
    )

    user = relationship(
        "User"
    )

    server = relationship(
        "Server"
    )
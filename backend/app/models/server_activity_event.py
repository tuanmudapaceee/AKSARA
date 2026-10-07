from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
)

from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class ServerActivityEvent(Base):
    __tablename__ = "server_activity_events"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    session_id = Column(
        Integer,
        ForeignKey("sessions.id"),
        nullable=True,
        index=True,
    )

    server_id = Column(
        Integer,
        ForeignKey("servers.id"),
        nullable=False,
        index=True,
    )

    remote_username = Column(
        String(150),
        nullable=True,
        index=True,
    )

    event_type = Column(
        String(50),
        nullable=False,
        index=True,
    )

    path = Column(
        Text,
        nullable=True,
    )

    process = Column(
        Text,
        nullable=True,
    )

    command = Column(
        Text,
        nullable=True,
    )

    syscall = Column(
        String(100),
        nullable=True,
    )

    pid = Column(
        Integer,
        nullable=True,
    )

    ppid = Column(
        Integer,
        nullable=True,
    )

    auid = Column(
        Integer,
        nullable=True,
    )

    audit_session = Column(
        Integer,
        nullable=True,
        index=True,
    )

    tty = Column(
        String(100),
        nullable=True,
        index=True,
    )

    success = Column(
        Boolean,
        nullable=True,
    )

    raw_detail = Column(
        Text,
        nullable=True,
    )

    event_time = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    session = relationship(
        "Session"
    )

    server = relationship(
        "Server"
    )
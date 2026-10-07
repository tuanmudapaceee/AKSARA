from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
)

from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class SessionCommand(Base):
    __tablename__ = "session_commands"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    session_id = Column(
        Integer,
        ForeignKey("sessions.id"),
        nullable=False,
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

    remote_username = Column(
        String(150),
        nullable=True,
    )

    command = Column(
        Text,
        nullable=False,
    )

    executed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    session = relationship("Session")
    user = relationship("User")
    server = relationship("Server")

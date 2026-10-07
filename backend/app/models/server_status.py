from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Float
)

from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class ServerStatus(Base):
    __tablename__ = "server_status"

    id = Column(Integer, primary_key=True, index=True)

    server_id = Column(
        Integer,
        ForeignKey("servers.id"),
        unique=True,
        nullable=False
    )

    status = Column(
        String(20),
        default="UNKNOWN",
        nullable=False
    )

    response_time_ms = Column(
        Float,
        nullable=True
    )

    last_check = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    last_online = Column(
        DateTime(timezone=True),
        nullable=True
    )

    server = relationship("Server")

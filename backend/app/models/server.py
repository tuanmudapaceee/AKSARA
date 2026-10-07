from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey
)

from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Server(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(
        String(150),
        nullable=False,
        index=True
    )

    hostname = Column(
        String(150),
        nullable=True
    )

    ip_address = Column(
        String(45),
        nullable=False,
        index=True
    )

    operating_system = Column(
        String(100),
        nullable=True
    )

    protocol = Column(
        String(20),
        nullable=False
    )

    port = Column(
        Integer,
        nullable=False
    )

    description = Column(
        String(255),
        nullable=True
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    group_id = Column(
        Integer,
        ForeignKey("server_groups.id"),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    group = relationship("ServerGroup")

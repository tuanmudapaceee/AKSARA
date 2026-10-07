from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Float
)

from sqlalchemy.sql import func

from app.database import Base


class MonitoringHistory(Base):
    __tablename__ = "monitoring_history"

    id = Column(Integer, primary_key=True, index=True)

    server_id = Column(
        Integer,
        ForeignKey("servers.id"),
        nullable=False
    )

    status = Column(
        String(20),
        nullable=False
    )

    response_time_ms = Column(
        Float,
        nullable=True
    )

    checked_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    description = Column(
        String(255),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    permissions = relationship(
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan",
    )

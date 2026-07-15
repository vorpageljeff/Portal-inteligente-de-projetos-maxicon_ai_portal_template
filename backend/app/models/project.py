import enum
import uuid
from datetime import date, datetime

from sqlalchemy import DateTime, Enum, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProjectStatus(str, enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    AT_RISK = "at_risk"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(160), index=True)
    client_name: Mapped[str] = mapped_column(String(160), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    manager_name: Mapped[str | None] = mapped_column(String(160))
    start_date: Mapped[date]
    target_end_date: Mapped[date]
    contracted_hours: Mapped[float] = mapped_column(Float, default=0)
    progress_percent: Mapped[float] = mapped_column(Float, default=0)
    planned_hours: Mapped[float] = mapped_column(Float, default=0)
    actual_hours: Mapped[float] = mapped_column(Float, default=0)
    billable_hours: Mapped[float] = mapped_column(Float, default=0)
    non_billable_hours: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus),
        default=ProjectStatus.PLANNING,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

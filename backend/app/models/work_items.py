import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MilestoneStatus(str, enum.Enum):
    PENDING = "pending"
    DONE = "done"
    LATE = "late"


class RiskSeverity(str, enum.Enum):
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskStatus(str, enum.Enum):
    OPEN = "open"
    MITIGATING = "mitigating"
    CLOSED = "closed"


class ActionPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ActionStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(180))
    due_date: Mapped[date] = mapped_column(Date)
    status: Mapped[MilestoneStatus] = mapped_column(
        Enum(MilestoneStatus),
        default=MilestoneStatus.PENDING,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Risk(Base):
    __tablename__ = "risks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[RiskSeverity] = mapped_column(Enum(RiskSeverity), default=RiskSeverity.MEDIUM)
    status: Mapped[RiskStatus] = mapped_column(Enum(RiskStatus), default=RiskStatus.OPEN)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ActionItem(Base):
    __tablename__ = "action_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(220))
    priority: Mapped[ActionPriority] = mapped_column(
        Enum(ActionPriority),
        default=ActionPriority.MEDIUM,
    )
    due_date: Mapped[date] = mapped_column(Date)
    status: Mapped[ActionStatus] = mapped_column(Enum(ActionStatus), default=ActionStatus.TODO)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

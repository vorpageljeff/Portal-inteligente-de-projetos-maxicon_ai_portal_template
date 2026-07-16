import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Organization(str, enum.Enum):
    MAXICON = "maxicon"
    CLIENT = "client"
    SAP = "sap"
    THIRD_PARTY = "third_party"


class WorkStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    DONE = "done"
    CANCELLED = "cancelled"


class Priority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TimeEntryType(str, enum.Enum):
    BILLABLE = "billable"
    NON_BILLABLE = "non_billable"
    INTERNAL = "internal"
    SUPPORT = "support"
    REWORK = "rework"
    MEETING = "meeting"
    TRAINING = "training"
    TRAVEL = "travel"
    IMPLEMENTATION = "implementation"
    DEVELOPMENT = "development"


class ApprovalStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    CORRECTED = "corrected"


class ReportStatus(str, enum.Enum):
    COLLECTING = "collecting"
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    PRESENTED = "presented"
    ARCHIVED = "archived"


class StatusCycleStatus(str, enum.Enum):
    COLLECTING = "collecting"
    READY = "ready"
    PRESENTED = "presented"
    APPROVED = "approved"
    ARCHIVED = "archived"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(220))
    owner_name: Mapped[str] = mapped_column(String(160))
    start_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date] = mapped_column(Date)
    estimated_hours: Mapped[float] = mapped_column(Float, default=0)
    progress_percent: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[WorkStatus] = mapped_column(Enum(WorkStatus), default=WorkStatus.TODO)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), default=Priority.MEDIUM)
    responsible_org: Mapped[Organization] = mapped_column(
        Enum(Organization),
        default=Organization.MAXICON,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Deliverable(Base):
    __tablename__ = "deliverables"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(220))
    acceptance_criteria: Mapped[str] = mapped_column(Text)
    owner_name: Mapped[str] = mapped_column(String(160))
    due_date: Mapped[date] = mapped_column(Date)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    actual_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[WorkStatus] = mapped_column(Enum(WorkStatus), default=WorkStatus.TODO)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Impediment(Base):
    __tablename__ = "impediments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    description: Mapped[str] = mapped_column(Text)
    affected_activity: Mapped[str] = mapped_column(String(220))
    owner_name: Mapped[str] = mapped_column(String(160))
    responsible_org: Mapped[Organization] = mapped_column(Enum(Organization))
    impact: Mapped[str] = mapped_column(Text)
    opened_at: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date] = mapped_column(Date)
    status: Mapped[WorkStatus] = mapped_column(Enum(WorkStatus), default=WorkStatus.BLOCKED)
    resolution: Mapped[str | None] = mapped_column(Text)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    task_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tasks.id"), index=True)
    user_name: Mapped[str] = mapped_column(String(160))
    entry_date: Mapped[date] = mapped_column(Date, index=True)
    hours: Mapped[float] = mapped_column(Float)
    description: Mapped[str] = mapped_column(Text)
    entry_type: Mapped[TimeEntryType] = mapped_column(Enum(TimeEntryType))
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus),
        default=ApprovalStatus.SUBMITTED,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StatusCycle(Base):
    __tablename__ = "status_cycles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(180))
    meeting_date: Mapped[date] = mapped_column(Date, index=True)
    period_start: Mapped[date] = mapped_column(Date, index=True)
    period_end: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[StatusCycleStatus] = mapped_column(
        Enum(StatusCycleStatus),
        default=StatusCycleStatus.COLLECTING,
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WeeklyServiceRequestSummary(Base):
    __tablename__ = "weekly_service_request_summaries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    period_start: Mapped[date] = mapped_column(Date, index=True)
    period_end: Mapped[date] = mapped_column(Date, index=True)
    project_requests: Mapped[int] = mapped_column(Integer, default=0)
    cr_requests: Mapped[int] = mapped_column(Integer, default=0)
    gap_requests: Mapped[int] = mapped_column(Integer, default=0)
    adjustment_requests: Mapped[int] = mapped_column(Integer, default=0)
    open_requests: Mapped[int] = mapped_column(Integer, default=0)
    completed_requests: Mapped[int] = mapped_column(Integer, default=0)
    late_requests: Mapped[int] = mapped_column(Integer, default=0)
    critical_requests: Mapped[int] = mapped_column(Integer, default=0)
    waiting_maxicon: Mapped[int] = mapped_column(Integer, default=0)
    waiting_client: Mapped[int] = mapped_column(Integer, default=0)
    waiting_sap: Mapped[int] = mapped_column(Integer, default=0)
    highlight_number: Mapped[str | None] = mapped_column(String(40))
    highlight_subject: Mapped[str | None] = mapped_column(String(220))
    highlight_owner: Mapped[str | None] = mapped_column(String(120))
    highlight_due_date: Mapped[date | None] = mapped_column(Date)
    highlight_status: Mapped[str | None] = mapped_column(String(80))
    highlight_impact: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    @property
    def total_requests(self) -> int:
        return (
            self.project_requests
            + self.cr_requests
            + self.gap_requests
            + self.adjustment_requests
        )


class StatusReport(Base):
    __tablename__ = "status_reports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    period_start: Mapped[date] = mapped_column(Date, index=True)
    period_end: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=ReportStatus.DRAFT)
    approved_by: Mapped[str | None] = mapped_column(String(160))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StatusReportVersion(Base):
    __tablename__ = "status_report_versions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("status_reports.id"), index=True)
    version_number: Mapped[int]
    content: Mapped[str] = mapped_column(Text)
    generated_by: Mapped[str] = mapped_column(String(160))
    ai_provider: Mapped[str] = mapped_column(String(80))
    prompt_version: Mapped[str] = mapped_column(String(40), default="status-report-v1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    actor: Mapped[str] = mapped_column(String(160), index=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    entity_type: Mapped[str] = mapped_column(String(80), index=True)
    entity_id: Mapped[str] = mapped_column(String(80), index=True)
    before_value: Mapped[str | None] = mapped_column(Text)
    after_value: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

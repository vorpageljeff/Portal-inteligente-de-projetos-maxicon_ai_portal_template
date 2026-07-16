import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.operations import (
    ApprovalStatus,
    Organization,
    Priority,
    ReportStatus,
    StatusCycleStatus,
    TimeEntryType,
    WorkStatus,
)


class DateRangeMixin(BaseModel):
    start_date: date | None = None
    due_date: date | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.due_date and self.due_date < self.start_date:
            raise ValueError("A data final nao pode ser anterior a inicial.")
        return self


class TaskCreate(DateRangeMixin):
    title: str = Field(min_length=3, max_length=220)
    owner_name: str = Field(min_length=2, max_length=160)
    start_date: date
    due_date: date
    estimated_hours: float = Field(default=0, ge=0)
    progress_percent: float = Field(default=0, ge=0, le=100)
    status: WorkStatus = WorkStatus.TODO
    priority: Priority = Priority.MEDIUM
    responsible_org: Organization = Organization.MAXICON


class TaskRead(TaskCreate):
    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DeliverableCreate(BaseModel):
    title: str = Field(min_length=3, max_length=220)
    acceptance_criteria: str = Field(min_length=3)
    owner_name: str = Field(min_length=2, max_length=160)
    due_date: date
    actual_date: date | None = None
    status: WorkStatus = WorkStatus.TODO

    @model_validator(mode="after")
    def validate_completion(self):
        if self.status == WorkStatus.DONE and not self.actual_date:
            raise ValueError("Entrega concluida exige data real.")
        return self


class DeliverableRead(DeliverableCreate):
    id: uuid.UUID
    project_id: uuid.UUID
    approved_at: datetime | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ImpedimentCreate(BaseModel):
    description: str = Field(min_length=3)
    affected_activity: str = Field(min_length=3, max_length=220)
    owner_name: str = Field(min_length=2, max_length=160)
    responsible_org: Organization
    impact: str = Field(min_length=3)
    opened_at: date
    due_date: date
    status: WorkStatus = WorkStatus.BLOCKED
    resolution: str | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.due_date < self.opened_at:
            raise ValueError("O prazo nao pode ser anterior a data de abertura.")
        return self


class ImpedimentRead(ImpedimentCreate):
    id: uuid.UUID
    project_id: uuid.UUID
    closed_at: datetime | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TimeEntryCreate(BaseModel):
    task_id: uuid.UUID | None = None
    user_name: str = Field(min_length=2, max_length=160)
    entry_date: date
    hours: float = Field(gt=0, le=24)
    description: str = Field(min_length=3)
    entry_type: TimeEntryType
    approval_status: ApprovalStatus = ApprovalStatus.SUBMITTED


class TimeEntryRead(TimeEntryCreate):
    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StatusCycleCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    meeting_date: date
    period_start: date
    period_end: date
    status: StatusCycleStatus = StatusCycleStatus.COLLECTING
    notes: str | None = None

    @model_validator(mode="after")
    def validate_period(self):
        if self.period_end < self.period_start:
            raise ValueError("O periodo final nao pode ser anterior ao inicial.")
        if self.meeting_date < self.period_start:
            raise ValueError("A reuniao nao pode ser anterior ao inicio do periodo.")
        return self


class StatusCycleRead(StatusCycleCreate):
    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class WeeklyServiceRequestSummaryCreate(BaseModel):
    period_start: date
    period_end: date
    project_requests: int = Field(default=0, ge=0)
    cr_requests: int = Field(default=0, ge=0)
    gap_requests: int = Field(default=0, ge=0)
    adjustment_requests: int = Field(default=0, ge=0)
    open_requests: int = Field(default=0, ge=0)
    completed_requests: int = Field(default=0, ge=0)
    late_requests: int = Field(default=0, ge=0)
    critical_requests: int = Field(default=0, ge=0)
    waiting_maxicon: int = Field(default=0, ge=0)
    waiting_client: int = Field(default=0, ge=0)
    waiting_sap: int = Field(default=0, ge=0)
    highlight_number: str | None = Field(default=None, max_length=40)
    highlight_subject: str | None = Field(default=None, max_length=220)
    highlight_owner: str | None = Field(default=None, max_length=120)
    highlight_due_date: date | None = None
    highlight_status: str | None = Field(default=None, max_length=80)
    highlight_impact: str | None = None

    @model_validator(mode="after")
    def validate_summary(self):
        if self.period_end < self.period_start:
            raise ValueError("O periodo final nao pode ser anterior ao inicial.")
        total = (
            self.project_requests
            + self.cr_requests
            + self.gap_requests
            + self.adjustment_requests
        )
        for field_name in (
            "open_requests",
            "completed_requests",
            "late_requests",
            "critical_requests",
        ):
            if getattr(self, field_name) > total:
                raise ValueError("Totais por status nao podem ser maiores que o total informado.")
        waiting_total = self.waiting_maxicon + self.waiting_client + self.waiting_sap
        if waiting_total > total:
            raise ValueError(
                "Total aguardando responsavel nao pode ser maior que o total informado."
            )
        return self


class WeeklyServiceRequestSummaryRead(WeeklyServiceRequestSummaryCreate):
    id: uuid.UUID
    project_id: uuid.UUID
    total_requests: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StatusReportCreate(BaseModel):
    project_id: uuid.UUID
    period_start: date
    period_end: date

    @model_validator(mode="after")
    def validate_period(self):
        if self.period_end < self.period_start:
            raise ValueError("O periodo final nao pode ser anterior ao inicial.")
        return self


class StatusReportRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    period_start: date
    period_end: date
    status: ReportStatus
    approved_by: str | None
    approved_at: datetime | None
    latest_content: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

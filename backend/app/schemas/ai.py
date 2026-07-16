import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.operations import TimeEntryType
from app.models.work_items import ActionPriority, ActionStatus, RiskSeverity, RiskStatus


class AiIntakeRequest(BaseModel):
    project_id: uuid.UUID
    prompt: str = Field(min_length=20)


class AiStatusCycleDraft(BaseModel):
    title: str = Field(default="Status semanal", min_length=3, max_length=180)
    meeting_date: date
    period_start: date
    period_end: date
    notes: str | None = None

    @model_validator(mode="after")
    def validate_period(self):
        if self.period_end < self.period_start:
            raise ValueError("O periodo final nao pode ser anterior ao inicial.")
        return self


class AiServiceRequestDraft(BaseModel):
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


class AiActionDraft(BaseModel):
    title: str = Field(min_length=3, max_length=220)
    priority: ActionPriority = ActionPriority.MEDIUM
    due_date: date
    status: ActionStatus = ActionStatus.TODO


class AiRiskDraft(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    description: str | None = None
    severity: RiskSeverity = RiskSeverity.MEDIUM
    status: RiskStatus = RiskStatus.OPEN


class AiTimeEntryDraft(BaseModel):
    user_name: str = Field(min_length=2, max_length=160)
    entry_date: date
    hours: float = Field(gt=0, le=24)
    description: str = Field(min_length=3)
    entry_type: TimeEntryType = TimeEntryType.BILLABLE


class AiIntakeDraft(BaseModel):
    project_name: str | None = None
    confidence: float = Field(default=0.7, ge=0, le=1)
    summary: str
    status_cycle: AiStatusCycleDraft
    service_requests: AiServiceRequestDraft = Field(default_factory=AiServiceRequestDraft)
    actions: list[AiActionDraft] = Field(default_factory=list)
    risks: list[AiRiskDraft] = Field(default_factory=list)
    time_entries: list[AiTimeEntryDraft] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class AiIntakePreview(BaseModel):
    provider: str
    draft: AiIntakeDraft


class AiIntakeApplyRequest(BaseModel):
    project_id: uuid.UUID
    draft: AiIntakeDraft


class AiIntakeApplyResult(BaseModel):
    status_cycle_id: uuid.UUID
    service_request_summary_id: uuid.UUID
    action_ids: list[uuid.UUID]
    risk_ids: list[uuid.UUID]
    time_entry_ids: list[uuid.UUID]
    model_config = ConfigDict(from_attributes=True)

import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.operations import TimeEntryType
from app.models.work_items import ActionPriority, ActionStatus, RiskSeverity, RiskStatus
from app.schemas.dashboard import MilestoneCreate
from app.schemas.operations import DeliverableCreate, ImpedimentCreate, TaskCreate


class AiClarificationAnswer(BaseModel):
    field: str = Field(min_length=1, max_length=80)
    question: str = Field(min_length=3, max_length=500)
    answer: str = Field(min_length=1, max_length=4000)


class AiIntakeRequest(BaseModel):
    project_id: uuid.UUID
    prompt: str = Field(min_length=20)
    clarifications: list[AiClarificationAnswer] = Field(default_factory=list, max_length=20)


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
    progress_percent: float | None = Field(default=None, ge=0, le=100)
    confidence: float = Field(default=0.7, ge=0, le=1)
    summary: str
    status_cycle: AiStatusCycleDraft
    service_requests: AiServiceRequestDraft = Field(default_factory=AiServiceRequestDraft)
    tasks: list[TaskCreate] = Field(default_factory=list)
    deliverables: list[DeliverableCreate] = Field(default_factory=list)
    impediments: list[ImpedimentCreate] = Field(default_factory=list)
    milestones: list[MilestoneCreate] = Field(default_factory=list)
    actions: list[AiActionDraft] = Field(default_factory=list)
    risks: list[AiRiskDraft] = Field(default_factory=list)
    time_entries: list[AiTimeEntryDraft] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class AiValidationQuestion(BaseModel):
    field: str = Field(min_length=1, max_length=80)
    question: str = Field(min_length=3, max_length=500)
    reason: str = Field(min_length=3, max_length=500)
    expected_format: str | None = Field(default=None, max_length=300)


class AiIntakeAnalysis(BaseModel):
    status: Literal["needs_information", "ready"]
    analysis: str = Field(min_length=3, max_length=1500)
    questions: list[AiValidationQuestion] = Field(default_factory=list, max_length=5)
    draft: AiIntakeDraft | None = None

    @model_validator(mode="after")
    def validate_conversation_state(self):
        if self.status == "ready" and self.draft is None:
            raise ValueError("Um rascunho pronto precisa conter os dados estruturados.")
        if self.status == "needs_information" and not self.questions:
            raise ValueError("A analise incompleta precisa informar ao menos uma pergunta.")
        if self.status == "needs_information" and self.draft is not None:
            raise ValueError("Um rascunho incompleto nao pode ser liberado para aplicacao.")
        return self


class AiIntakePreview(BaseModel):
    provider: str
    status: Literal["needs_information", "ready"]
    analysis: str
    questions: list[AiValidationQuestion] = Field(default_factory=list)
    draft: AiIntakeDraft | None = None


class AiIntakeApplyRequest(BaseModel):
    project_id: uuid.UUID
    draft: AiIntakeDraft


class AiIntakeApplyResult(BaseModel):
    status_cycle_id: uuid.UUID
    service_request_summary_id: uuid.UUID
    task_ids: list[uuid.UUID]
    deliverable_ids: list[uuid.UUID]
    impediment_ids: list[uuid.UUID]
    milestone_ids: list[uuid.UUID]
    action_ids: list[uuid.UUID]
    risk_ids: list[uuid.UUID]
    time_entry_ids: list[uuid.UUID]
    model_config = ConfigDict(from_attributes=True)

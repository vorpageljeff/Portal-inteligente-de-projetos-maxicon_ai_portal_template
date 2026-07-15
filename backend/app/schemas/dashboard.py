import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.work_items import (
    ActionPriority,
    ActionStatus,
    MilestoneStatus,
    RiskSeverity,
    RiskStatus,
)


class MilestoneCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    due_date: date
    status: MilestoneStatus = MilestoneStatus.PENDING


class MilestoneRead(MilestoneCreate):
    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RiskCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    description: str | None = None
    severity: RiskSeverity = RiskSeverity.MEDIUM
    status: RiskStatus = RiskStatus.OPEN


class RiskRead(RiskCreate):
    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ActionItemCreate(BaseModel):
    title: str = Field(min_length=3, max_length=220)
    priority: ActionPriority = ActionPriority.MEDIUM
    due_date: date
    status: ActionStatus = ActionStatus.TODO


class ActionItemRead(ActionItemCreate):
    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DashboardMetric(BaseModel):
    label: str
    value: str
    delta: str
    tone: str = "positive"


class InitiativeStatus(BaseModel):
    project_id: uuid.UUID
    name: str
    client_name: str
    progress_percent: float
    variation: float
    status_label: str
    milestones_done: int
    milestones_total: int
    critical_risks: int


class PortfolioPoint(BaseModel):
    label: str
    progress_percent: float


class DashboardSummary(BaseModel):
    health_label: str
    health_percent: int
    metrics: list[DashboardMetric]
    portfolio_trend: list[PortfolioPoint]
    initiatives: list[InitiativeStatus]
    executive_summary: list[str]
    milestones: list[MilestoneRead]
    risks: list[RiskRead]
    actions: list[ActionItemRead]

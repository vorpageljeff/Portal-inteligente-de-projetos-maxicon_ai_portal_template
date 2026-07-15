from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.status_report import StatusReportInput, StatusReportService

router = APIRouter()
class StatusReportRequest(BaseModel):
    project_name: str
    period_start: date
    period_end: date
    completed_items: list[str] = Field(default_factory=list)
    ongoing_items: list[str] = Field(default_factory=list)
    delayed_items: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    impediments: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
@router.post("/draft")
def create_status_report_draft(payload: StatusReportRequest):
    draft = StatusReportService().generate_draft(StatusReportInput(**payload.model_dump()))
    return {"status": "draft", "content": draft}

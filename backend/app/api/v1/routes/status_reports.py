import uuid
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import DbSession, get_current_user
from app.models.operations import ReportStatus, StatusReport, StatusReportVersion
from app.models.project import Project
from app.models.security import User
from app.schemas.operations import StatusReportCreate, StatusReportRead
from app.services.audit import audit
from app.services.status_report import StatusReportInput, StatusReportService

router = APIRouter()
CurrentUser = Annotated[User, Depends(get_current_user)]


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
def create_status_report_draft(payload: StatusReportRequest, _: CurrentUser):
    draft = StatusReportService().generate_draft(StatusReportInput(**payload.model_dump()))
    return {"status": "draft", "content": draft}


def read_report(db: DbSession, report: StatusReport) -> StatusReportRead:
    version = db.scalar(
        select(StatusReportVersion)
        .where(StatusReportVersion.report_id == report.id)
        .order_by(StatusReportVersion.version_number.desc())
    )
    return StatusReportRead.model_validate(report).model_copy(
        update={"latest_content": version.content if version else None}
    )


@router.post("", response_model=StatusReportRead, status_code=status.HTTP_201_CREATED)
def generate_status_report(
    payload: StatusReportCreate,
    db: DbSession,
    user: CurrentUser,
) -> StatusReportRead:
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado.")
    report = StatusReport(
        project_id=payload.project_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
        status=ReportStatus.DRAFT,
    )
    db.add(report)
    db.flush()
    StatusReportService().generate_from_project(db, project=project, report=report, actor=user)
    audit(db, actor=user, action="generate", entity_type="status_report", entity_id=str(report.id))
    db.commit()
    db.refresh(report)
    return read_report(db, report)


@router.get("/project/{project_id}", response_model=list[StatusReportRead])
def list_project_reports(
    project_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> list[StatusReportRead]:
    reports = list(
        db.scalars(
            select(StatusReport)
            .where(StatusReport.project_id == project_id)
            .order_by(StatusReport.created_at.desc())
        )
    )
    return [read_report(db, report) for report in reports]


@router.post("/{report_id}/approve", response_model=StatusReportRead)
def approve_report(report_id: uuid.UUID, db: DbSession, user: CurrentUser) -> StatusReportRead:
    report = db.get(StatusReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Relatorio nao encontrado.")
    if report.status == ReportStatus.APPROVED:
        raise HTTPException(status_code=409, detail="Relatorio ja aprovado.")
    report.status = ReportStatus.APPROVED
    report.approved_by = user.email
    report.approved_at = datetime.utcnow()
    audit(db, actor=user, action="approve", entity_type="status_report", entity_id=str(report.id))
    db.commit()
    db.refresh(report)
    return read_report(db, report)

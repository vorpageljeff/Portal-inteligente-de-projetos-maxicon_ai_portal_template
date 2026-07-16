from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import DbSession, get_current_user
from app.models.operations import (
    ApprovalStatus,
    StatusCycle,
    StatusCycleStatus,
    TimeEntry,
    WeeklyServiceRequestSummary,
)
from app.models.project import Project
from app.models.security import User
from app.models.work_items import ActionItem, Risk
from app.schemas.ai import (
    AiIntakeApplyRequest,
    AiIntakeApplyResult,
    AiIntakePreview,
    AiIntakeRequest,
)
from app.services.ai_intake import AiIntakeError, AiIntakeService
from app.services.audit import audit

router = APIRouter()
CurrentUser = Annotated[User, Depends(get_current_user)]


def require_project(project_id, db: DbSession) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado.")
    return project


@router.post("/intake-preview", response_model=AiIntakePreview)
def intake_preview(payload: AiIntakeRequest, db: DbSession, _: CurrentUser) -> AiIntakePreview:
    project = require_project(payload.project_id, db)
    try:
        provider, draft = AiIntakeService().build_preview(project=project, prompt=payload.prompt)
    except AiIntakeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return AiIntakePreview(provider=provider, draft=draft)


@router.post(
    "/intake-apply",
    response_model=AiIntakeApplyResult,
    status_code=status.HTTP_201_CREATED,
)
def intake_apply(
    payload: AiIntakeApplyRequest,
    db: DbSession,
    user: CurrentUser,
) -> AiIntakeApplyResult:
    project = require_project(payload.project_id, db)
    draft = payload.draft

    cycle = StatusCycle(
        project_id=project.id,
        title=draft.status_cycle.title,
        meeting_date=draft.status_cycle.meeting_date,
        period_start=draft.status_cycle.period_start,
        period_end=draft.status_cycle.period_end,
        status=StatusCycleStatus.COLLECTING,
        notes=draft.status_cycle.notes,
    )
    db.add(cycle)
    db.flush()

    requests = WeeklyServiceRequestSummary(
        project_id=project.id,
        period_start=draft.status_cycle.period_start,
        period_end=draft.status_cycle.period_end,
        **draft.service_requests.model_dump(),
    )
    db.add(requests)
    db.flush()

    actions = [ActionItem(project_id=project.id, **item.model_dump()) for item in draft.actions]
    risks = [Risk(project_id=project.id, **item.model_dump()) for item in draft.risks]
    time_entries = [
        TimeEntry(
            project_id=project.id,
            task_id=None,
            approval_status=ApprovalStatus.SUBMITTED,
            **item.model_dump(),
        )
        for item in draft.time_entries
    ]
    db.add_all([*actions, *risks, *time_entries])
    db.flush()

    audit(db, actor=user, action="create", entity_type="ai_intake", entity_id=str(cycle.id))
    db.commit()

    return AiIntakeApplyResult(
        status_cycle_id=cycle.id,
        service_request_summary_id=requests.id,
        action_ids=[item.id for item in actions],
        risk_ids=[item.id for item in risks],
        time_entry_ids=[item.id for item in time_entries],
    )

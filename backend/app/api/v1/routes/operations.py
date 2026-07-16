import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import DbSession, get_current_user
from app.models.operations import (
    ApprovalStatus,
    Deliverable,
    Impediment,
    StatusCycle,
    Task,
    TimeEntry,
    TimeEntryType,
    WeeklyServiceRequestSummary,
    WorkStatus,
)
from app.models.project import Project, ProjectStatus
from app.models.security import User
from app.schemas.operations import (
    DeliverableCreate,
    DeliverableRead,
    ImpedimentCreate,
    ImpedimentRead,
    StatusCycleCreate,
    StatusCycleRead,
    TaskCreate,
    TaskRead,
    TimeEntryCreate,
    TimeEntryRead,
    WeeklyServiceRequestSummaryCreate,
    WeeklyServiceRequestSummaryRead,
)
from app.services.audit import audit

router = APIRouter()
CurrentUser = Annotated[User, Depends(get_current_user)]


def require_project(project_id: uuid.UUID, db: Session) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado.")
    return project


def ensure_project_open(project: Project) -> None:
    if project.status in {ProjectStatus.COMPLETED, ProjectStatus.CANCELLED}:
        raise HTTPException(
            status_code=422,
            detail="Projeto encerrado ou cancelado nao aceita novos registros.",
        )


@router.get("/projects/{project_id}/tasks", response_model=list[TaskRead])
def list_tasks(project_id: uuid.UUID, db: DbSession, _: CurrentUser) -> list[Task]:
    require_project(project_id, db)
    return list(db.scalars(select(Task).where(Task.project_id == project_id)))


@router.post("/projects/{project_id}/tasks", response_model=TaskRead, status_code=201)
def create_task(
    project_id: uuid.UUID,
    payload: TaskCreate,
    db: DbSession,
    user: CurrentUser,
) -> Task:
    project = require_project(project_id, db)
    ensure_project_open(project)
    task = Task(project_id=project_id, **payload.model_dump())
    db.add(task)
    db.flush()
    audit(db, actor=user, action="create", entity_type="task", entity_id=str(task.id))
    db.commit()
    db.refresh(task)
    return task


@router.get("/projects/{project_id}/deliverables", response_model=list[DeliverableRead])
def list_deliverables(project_id: uuid.UUID, db: DbSession, _: CurrentUser) -> list[Deliverable]:
    require_project(project_id, db)
    return list(db.scalars(select(Deliverable).where(Deliverable.project_id == project_id)))


@router.post("/projects/{project_id}/deliverables", response_model=DeliverableRead, status_code=201)
def create_deliverable(
    project_id: uuid.UUID,
    payload: DeliverableCreate,
    db: DbSession,
    user: CurrentUser,
) -> Deliverable:
    project = require_project(project_id, db)
    ensure_project_open(project)
    deliverable = Deliverable(project_id=project_id, **payload.model_dump())
    if deliverable.status == WorkStatus.DONE:
        deliverable.approved_at = datetime.utcnow()
    db.add(deliverable)
    db.flush()
    audit(db, actor=user, action="create", entity_type="deliverable", entity_id=str(deliverable.id))
    db.commit()
    db.refresh(deliverable)
    return deliverable


@router.get("/projects/{project_id}/impediments", response_model=list[ImpedimentRead])
def list_impediments(project_id: uuid.UUID, db: DbSession, _: CurrentUser) -> list[Impediment]:
    require_project(project_id, db)
    return list(db.scalars(select(Impediment).where(Impediment.project_id == project_id)))


@router.post("/projects/{project_id}/impediments", response_model=ImpedimentRead, status_code=201)
def create_impediment(
    project_id: uuid.UUID,
    payload: ImpedimentCreate,
    db: DbSession,
    user: CurrentUser,
) -> Impediment:
    project = require_project(project_id, db)
    ensure_project_open(project)
    if payload.status == WorkStatus.DONE and not payload.resolution:
        raise HTTPException(status_code=422, detail="Fechamento exige solucao registrada.")
    impediment = Impediment(project_id=project_id, **payload.model_dump())
    if impediment.status == WorkStatus.DONE:
        impediment.closed_at = datetime.utcnow()
    db.add(impediment)
    db.flush()
    audit(db, actor=user, action="create", entity_type="impediment", entity_id=str(impediment.id))
    db.commit()
    db.refresh(impediment)
    return impediment


@router.get("/projects/{project_id}/time-entries", response_model=list[TimeEntryRead])
def list_time_entries(project_id: uuid.UUID, db: DbSession, _: CurrentUser) -> list[TimeEntry]:
    require_project(project_id, db)
    return list(db.scalars(select(TimeEntry).where(TimeEntry.project_id == project_id)))


@router.post("/projects/{project_id}/time-entries", response_model=TimeEntryRead, status_code=201)
def create_time_entry(
    project_id: uuid.UUID,
    payload: TimeEntryCreate,
    db: DbSession,
    user: CurrentUser,
) -> TimeEntry:
    project = require_project(project_id, db)
    ensure_project_open(project)
    if payload.task_id:
        task = db.get(Task, payload.task_id)
        if not task or task.project_id != project_id:
            raise HTTPException(status_code=404, detail="Tarefa nao encontrada no projeto.")
    entry = TimeEntry(project_id=project_id, **payload.model_dump())
    db.add(entry)
    if entry.approval_status == ApprovalStatus.APPROVED:
        project.actual_hours += entry.hours
        if entry.entry_type == TimeEntryType.BILLABLE:
            project.billable_hours += entry.hours
        else:
            project.non_billable_hours += entry.hours
    db.flush()
    audit(db, actor=user, action="create", entity_type="time_entry", entity_id=str(entry.id))
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/projects/{project_id}/status-cycles", response_model=list[StatusCycleRead])
def list_status_cycles(project_id: uuid.UUID, db: DbSession, _: CurrentUser) -> list[StatusCycle]:
    require_project(project_id, db)
    return list(
        db.scalars(
            select(StatusCycle)
            .where(StatusCycle.project_id == project_id)
            .order_by(StatusCycle.meeting_date.desc(), StatusCycle.created_at.desc())
        )
    )


@router.post(
    "/projects/{project_id}/status-cycles",
    response_model=StatusCycleRead,
    status_code=201,
)
def create_status_cycle(
    project_id: uuid.UUID,
    payload: StatusCycleCreate,
    db: DbSession,
    user: CurrentUser,
) -> StatusCycle:
    require_project(project_id, db)
    cycle = StatusCycle(project_id=project_id, **payload.model_dump())
    db.add(cycle)
    db.flush()
    audit(db, actor=user, action="create", entity_type="status_cycle", entity_id=str(cycle.id))
    db.commit()
    db.refresh(cycle)
    return cycle


@router.get(
    "/projects/{project_id}/service-request-summaries",
    response_model=list[WeeklyServiceRequestSummaryRead],
)
def list_service_request_summaries(
    project_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> list[WeeklyServiceRequestSummary]:
    require_project(project_id, db)
    return list(
        db.scalars(
            select(WeeklyServiceRequestSummary)
            .where(WeeklyServiceRequestSummary.project_id == project_id)
            .order_by(
                WeeklyServiceRequestSummary.period_end.desc(),
                WeeklyServiceRequestSummary.created_at.desc(),
            )
        )
    )


@router.post(
    "/projects/{project_id}/service-request-summaries",
    response_model=WeeklyServiceRequestSummaryRead,
    status_code=201,
)
def create_service_request_summary(
    project_id: uuid.UUID,
    payload: WeeklyServiceRequestSummaryCreate,
    db: DbSession,
    user: CurrentUser,
) -> WeeklyServiceRequestSummary:
    require_project(project_id, db)
    summary = WeeklyServiceRequestSummary(project_id=project_id, **payload.model_dump())
    db.add(summary)
    db.flush()
    audit(
        db,
        actor=user,
        action="create",
        entity_type="weekly_service_request_summary",
        entity_id=str(summary.id),
    )
    db.commit()
    db.refresh(summary)
    return summary

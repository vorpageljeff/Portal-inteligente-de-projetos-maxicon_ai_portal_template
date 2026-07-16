import uuid
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.operations import (
    Deliverable,
    Impediment,
    Task,
    TimeEntry,
    WeeklyServiceRequestSummary,
    WorkStatus,
)
from app.models.project import Project, ProjectStatus
from app.models.security import User
from app.models.work_items import (
    ActionItem,
    ActionStatus,
    Milestone,
    MilestoneStatus,
    Risk,
    RiskSeverity,
    RiskStatus,
)
from app.schemas.dashboard import (
    ActionItemCreate,
    ActionItemRead,
    DashboardMetric,
    DashboardSummary,
    InitiativeStatus,
    MilestoneCreate,
    MilestoneRead,
    PortfolioPoint,
    RiskCreate,
    RiskRead,
    WeeklyStatusHours,
    WeeklyStatusItem,
    WeeklyStatusMonitoring,
    WeeklyStatusSummary,
)
from app.services.audit import audit

router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def require_project(project_id: uuid.UUID, db: Session) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado.")
    return project


def current_week(today: date | None = None) -> tuple[date, date]:
    reference = today or date.today()
    start = reference - timedelta(days=reference.weekday())
    return start, start + timedelta(days=6)


def expected_progress(project: Project, reference: date) -> float:
    total_days = max((project.target_end_date - project.start_date).days, 1)
    elapsed_days = min(max((reference - project.start_date).days, 0), total_days)
    return round((elapsed_days / total_days) * 100, 1)


def health_from_weekly_status(
    *,
    progress_gap: float,
    critical_risks: int,
    open_impediments: int,
    late_tasks: int,
) -> tuple[str, int]:
    score = round(85 + progress_gap - critical_risks * 10 - open_impediments * 8 - late_tasks * 4)
    score = max(0, min(100, score))
    if score < 45 or critical_risks >= 3:
        return "Critico", score
    if score < 70 or critical_risks or open_impediments:
        return "Atencao", score
    return "Estavel", score


def latest_request_summary(
    db: Session,
    *,
    project_id: uuid.UUID,
    period_start: date,
    period_end: date,
) -> WeeklyServiceRequestSummary | None:
    current_period = db.scalar(
        select(WeeklyServiceRequestSummary)
        .where(
            WeeklyServiceRequestSummary.project_id == project_id,
            WeeklyServiceRequestSummary.period_start == period_start,
            WeeklyServiceRequestSummary.period_end == period_end,
        )
        .order_by(WeeklyServiceRequestSummary.created_at.desc())
    )
    if current_period:
        return current_period
    return db.scalar(
        select(WeeklyServiceRequestSummary)
        .where(WeeklyServiceRequestSummary.project_id == project_id)
        .order_by(
            WeeklyServiceRequestSummary.period_end.desc(),
            WeeklyServiceRequestSummary.created_at.desc(),
        )
    )


@router.get("/executive", response_model=DashboardSummary)
def executive_dashboard(db: DbSession, _: CurrentUser) -> DashboardSummary:
    projects = list(db.scalars(select(Project).order_by(Project.created_at.desc())))
    milestones = list(db.scalars(select(Milestone).order_by(Milestone.due_date.asc())))
    risks = list(db.scalars(select(Risk).order_by(Risk.created_at.desc())))
    actions = list(db.scalars(select(ActionItem).order_by(ActionItem.due_date.asc())))

    active_projects = [project for project in projects if project.status != ProjectStatus.COMPLETED]
    progress_values = [project.progress_percent for project in active_projects]
    progress_average = (
        round(sum(progress_values) / len(progress_values), 1) if progress_values else 0
    )

    total_hours = sum(project.actual_hours for project in projects)
    billable_hours = sum(project.billable_hours for project in projects)
    billable_rate = round((billable_hours / total_hours) * 100) if total_hours else 0
    critical_risks = [
        risk
        for risk in risks
        if risk.severity == RiskSeverity.CRITICAL and risk.status != RiskStatus.CLOSED
    ]
    late_milestones = [
        milestone for milestone in milestones if milestone.status == MilestoneStatus.LATE
    ]

    health_percent = max(
        0,
        min(
            100,
            round(progress_average - len(critical_risks) * 8 - len(late_milestones) * 5),
        ),
    )
    health_label = "Estavel"
    if health_percent < 55 or critical_risks:
        health_label = "Atencao"
    if health_percent < 35 or len(critical_risks) >= 3:
        health_label = "Critico"

    milestones_by_project = {
        project.id: [milestone for milestone in milestones if milestone.project_id == project.id]
        for project in projects
    }
    risks_by_project = {
        project.id: [risk for risk in risks if risk.project_id == project.id]
        for project in projects
    }

    initiatives = [
        InitiativeStatus(
            project_id=project.id,
            name=project.name,
            client_name=project.client_name,
            progress_percent=project.progress_percent,
            variation=round(max(project.progress_percent * 0.08, 1), 1),
            status_label=project.status.value,
            milestones_done=len(
                [
                    milestone
                    for milestone in milestones_by_project[project.id]
                    if milestone.status == MilestoneStatus.DONE
                ]
            ),
            milestones_total=len(milestones_by_project[project.id]),
            critical_risks=len(
                [
                    risk
                    for risk in risks_by_project[project.id]
                    if risk.severity == RiskSeverity.CRITICAL and risk.status != RiskStatus.CLOSED
                ]
            ),
        )
        for project in projects[:8]
    ]

    executive_summary = [
        f"{len(active_projects)} projetos ativos com progresso medio de {progress_average}%.",
        f"{billable_rate}% das horas apontadas sao rentaveis.",
        f"{len(critical_risks)} riscos criticos exigem acompanhamento executivo.",
        (
            f"{len([action for action in actions if action.status != ActionStatus.DONE])} "
            "acoes seguem abertas."
        ),
    ]

    return DashboardSummary(
        health_label=health_label,
        health_percent=health_percent,
        metrics=[
            DashboardMetric(
                label="Projetos ativos",
                value=str(len(active_projects)),
                delta="+1 vs semana",
            ),
            DashboardMetric(label="Progresso medio", value=f"{progress_average}%", delta="+5 p.p."),
            DashboardMetric(
                label="Horas apontadas",
                value=f"{round(total_hours)}h",
                delta=f"{billable_rate}% rentaveis",
            ),
            DashboardMetric(
                label="Riscos criticos",
                value=str(len(critical_risks)),
                delta="monitoramento executivo",
                tone="negative" if critical_risks else "positive",
            ),
        ],
        portfolio_trend=[
            PortfolioPoint(label="S24", progress_percent=max(progress_average - 18, 0)),
            PortfolioPoint(label="S25", progress_percent=max(progress_average - 14, 0)),
            PortfolioPoint(label="S26", progress_percent=max(progress_average - 10, 0)),
            PortfolioPoint(label="S27", progress_percent=max(progress_average - 6, 0)),
            PortfolioPoint(label="S28", progress_percent=max(progress_average - 3, 0)),
            PortfolioPoint(label="S29", progress_percent=progress_average),
        ],
        initiatives=initiatives,
        executive_summary=executive_summary,
        milestones=milestones[:8],
        risks=risks[:8],
        actions=actions[:8],
    )


@router.get("/weekly-status/{project_id}", response_model=WeeklyStatusSummary)
def weekly_status(project_id: uuid.UUID, db: DbSession, _: CurrentUser) -> WeeklyStatusSummary:
    project = require_project(project_id, db)
    period_start, period_end = current_week()
    today = date.today()
    tasks = list(db.scalars(select(Task).where(Task.project_id == project_id)))
    deliverables = list(db.scalars(select(Deliverable).where(Deliverable.project_id == project_id)))
    impediments = list(db.scalars(select(Impediment).where(Impediment.project_id == project_id)))
    time_entries = list(db.scalars(select(TimeEntry).where(TimeEntry.project_id == project_id)))
    milestones = list(db.scalars(select(Milestone).where(Milestone.project_id == project_id)))
    risks = list(db.scalars(select(Risk).where(Risk.project_id == project_id)))
    actions = list(db.scalars(select(ActionItem).where(ActionItem.project_id == project_id)))

    active_deliverables = [
        item for item in deliverables if item.status not in {WorkStatus.DONE, WorkStatus.CANCELLED}
    ]
    open_impediments = [item for item in impediments if item.status != WorkStatus.DONE]
    critical_risks = [
        risk
        for risk in risks
        if risk.severity == RiskSeverity.CRITICAL and risk.status != RiskStatus.CLOSED
    ]
    late_tasks = [
        task
        for task in tasks
        if task.status != WorkStatus.DONE and task.due_date < today
    ]
    approved_hours = [entry for entry in time_entries if entry.approval_status.value == "approved"]
    executed_hours = sum(entry.hours for entry in approved_hours)
    billable_hours = sum(
        entry.hours for entry in approved_hours if entry.entry_type.value == "billable"
    )
    billable_rate = round((billable_hours / executed_hours) * 100) if executed_hours else 0
    expected = expected_progress(project, today)
    progress_gap = round(project.progress_percent - expected, 1)
    health_label, health_percent = health_from_weekly_status(
        progress_gap=progress_gap,
        critical_risks=len(critical_risks),
        open_impediments=len(open_impediments),
        late_tasks=len(late_tasks),
    )
    request_summary = latest_request_summary(
        db,
        project_id=project_id,
        period_start=period_start,
        period_end=period_end,
    )

    if request_summary:
        monitoring = [
            WeeklyStatusMonitoring(
                label="Solicitacoes de projeto",
                value=str(request_summary.project_requests),
                tone="neutral",
            ),
            WeeklyStatusMonitoring(
                label="Solicitacoes GAP",
                value=str(request_summary.gap_requests),
                tone="neutral",
            ),
            WeeklyStatusMonitoring(
                label="Solicitacoes de ajuste",
                value=str(request_summary.adjustment_requests),
                tone="neutral",
            ),
            WeeklyStatusMonitoring(
                label="Abertas",
                value=str(request_summary.open_requests),
                tone="warning" if request_summary.open_requests else "positive",
            ),
            WeeklyStatusMonitoring(
                label="Concluidas",
                value=str(request_summary.completed_requests),
                tone="positive",
            ),
            WeeklyStatusMonitoring(
                label="Atrasadas",
                value=str(request_summary.late_requests),
                tone="negative" if request_summary.late_requests else "positive",
            ),
            WeeklyStatusMonitoring(
                label="Criticas",
                value=str(request_summary.critical_requests),
                tone="negative" if request_summary.critical_requests else "positive",
            ),
            WeeklyStatusMonitoring(
                label="Aguardando Maxicon",
                value=str(request_summary.waiting_maxicon),
                tone="warning" if request_summary.waiting_maxicon else "positive",
            ),
            WeeklyStatusMonitoring(
                label="Aguardando cliente/SAP",
                value=str(request_summary.waiting_client + request_summary.waiting_sap),
                tone="warning"
                if request_summary.waiting_client + request_summary.waiting_sap
                else "positive",
            ),
        ]
    else:
        monitoring = [
            WeeklyStatusMonitoring(label="Solicitacoes de projeto", value="Sem lancamento"),
            WeeklyStatusMonitoring(label="Solicitacoes GAP", value="Sem lancamento"),
            WeeklyStatusMonitoring(label="Solicitacoes de ajuste", value="Sem lancamento"),
        ]
    monitoring.extend(
        [
            WeeklyStatusMonitoring(
                label="Tarefas atrasadas",
                value=str(len(late_tasks)),
                tone="warning" if late_tasks else "positive",
            ),
            WeeklyStatusMonitoring(
                label="Impedimentos abertos",
                value=str(len(open_impediments)),
                tone="warning" if open_impediments else "positive",
            ),
            WeeklyStatusMonitoring(
                label="Riscos criticos",
                value=str(len(critical_risks)),
                tone="negative" if critical_risks else "positive",
            ),
        ]
    )

    attention_points = []
    if progress_gap < 0:
        attention_points.append(f"Progresso {abs(progress_gap)} p.p. abaixo do esperado.")
    if late_tasks:
        attention_points.append(f"{len(late_tasks)} tarefas atrasadas exigem replanejamento.")
    if open_impediments:
        attention_points.append(f"{len(open_impediments)} impedimentos aguardam desbloqueio.")
    if critical_risks:
        attention_points.append(f"{len(critical_risks)} riscos criticos exigem acompanhamento.")
    if request_summary and request_summary.late_requests:
        attention_points.append(
            f"{request_summary.late_requests} solicitacoes atrasadas precisam de tratativa."
        )
    if request_summary and request_summary.highlight_number:
        subject = request_summary.highlight_subject or "sem assunto informado"
        attention_points.append(
            f"Destaque da semana: #{request_summary.highlight_number} - {subject}."
        )
    if not attention_points:
        attention_points.append("Sem pontos criticos registrados para a semana.")

    return WeeklyStatusSummary(
        project_id=project.id,
        project_name=project.name,
        client_name=project.client_name,
        manager_name=project.manager_name,
        period_start=period_start,
        period_end=period_end,
        go_live_date=project.target_end_date,
        days_to_go_live=(project.target_end_date - today).days,
        progress_real=project.progress_percent,
        progress_expected=expected,
        progress_gap=progress_gap,
        health_label=health_label,
        health_percent=health_percent,
        hours=WeeklyStatusHours(
            negotiated=project.contracted_hours,
            executed=executed_hours or project.actual_hours,
            balance=project.contracted_hours - (executed_hours or project.actual_hours),
            billable_rate=billable_rate,
        ),
        monitoring=monitoring,
        deliverables_in_progress=[
            WeeklyStatusItem(
                title=item.title,
                status=item.status.value,
                owner=item.owner_name,
                due_date=item.due_date,
                progress_percent=None,
            )
            for item in active_deliverables[:5]
        ],
        next_steps=[
            WeeklyStatusItem(
                title=item.title,
                status=item.status.value,
                owner=None,
                due_date=item.due_date,
                progress_percent=None,
            )
            for item in actions
            if item.status != ActionStatus.DONE
        ][:5],
        milestones=[
            WeeklyStatusItem(
                title=item.title,
                status=item.status.value,
                owner=None,
                due_date=item.due_date,
                progress_percent=None,
            )
            for item in milestones[:6]
        ],
        attention_points=attention_points,
    )


@router.get("/projects/{project_id}/milestones", response_model=list[MilestoneRead])
def list_milestones(project_id: uuid.UUID, db: DbSession, _: CurrentUser) -> list[Milestone]:
    require_project(project_id, db)
    return list(db.scalars(select(Milestone).where(Milestone.project_id == project_id)))


@router.post(
    "/projects/{project_id}/milestones",
    response_model=MilestoneRead,
    status_code=status.HTTP_201_CREATED,
)
def create_milestone(
    project_id: uuid.UUID,
    payload: MilestoneCreate,
    db: DbSession,
    user: CurrentUser,
) -> Milestone:
    require_project(project_id, db)
    milestone = Milestone(project_id=project_id, **payload.model_dump())
    db.add(milestone)
    db.flush()
    audit(db, actor=user, action="create", entity_type="milestone", entity_id=str(milestone.id))
    db.commit()
    db.refresh(milestone)
    return milestone


@router.get("/projects/{project_id}/risks", response_model=list[RiskRead])
def list_risks(project_id: uuid.UUID, db: DbSession, _: CurrentUser) -> list[Risk]:
    require_project(project_id, db)
    return list(db.scalars(select(Risk).where(Risk.project_id == project_id)))


@router.post(
    "/projects/{project_id}/risks",
    response_model=RiskRead,
    status_code=status.HTTP_201_CREATED,
)
def create_risk(
    project_id: uuid.UUID,
    payload: RiskCreate,
    db: DbSession,
    user: CurrentUser,
) -> Risk:
    require_project(project_id, db)
    risk = Risk(project_id=project_id, **payload.model_dump())
    db.add(risk)
    if risk.severity in {RiskSeverity.HIGH, RiskSeverity.CRITICAL}:
        project = require_project(project_id, db)
        project.status = ProjectStatus.AT_RISK
    db.flush()
    audit(db, actor=user, action="create", entity_type="risk", entity_id=str(risk.id))
    db.commit()
    db.refresh(risk)
    return risk


@router.get("/projects/{project_id}/actions", response_model=list[ActionItemRead])
def list_actions(project_id: uuid.UUID, db: DbSession, _: CurrentUser) -> list[ActionItem]:
    require_project(project_id, db)
    return list(db.scalars(select(ActionItem).where(ActionItem.project_id == project_id)))


@router.post(
    "/projects/{project_id}/actions",
    response_model=ActionItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_action(
    project_id: uuid.UUID,
    payload: ActionItemCreate,
    db: DbSession,
    user: CurrentUser,
) -> ActionItem:
    require_project(project_id, db)
    action = ActionItem(project_id=project_id, **payload.model_dump())
    db.add(action)
    db.flush()
    audit(db, actor=user, action="create", entity_type="action_item", entity_id=str(action.id))
    db.commit()
    db.refresh(action)
    return action

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.project import Project, ProjectStatus
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
)

router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]


def require_project(project_id: uuid.UUID, db: Session) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado.")
    return project


@router.get("/executive", response_model=DashboardSummary)
def executive_dashboard(db: DbSession) -> DashboardSummary:
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


@router.get("/projects/{project_id}/milestones", response_model=list[MilestoneRead])
def list_milestones(project_id: uuid.UUID, db: DbSession) -> list[Milestone]:
    require_project(project_id, db)
    return list(db.scalars(select(Milestone).where(Milestone.project_id == project_id)))


@router.post(
    "/projects/{project_id}/milestones",
    response_model=MilestoneRead,
    status_code=status.HTTP_201_CREATED,
)
def create_milestone(project_id: uuid.UUID, payload: MilestoneCreate, db: DbSession) -> Milestone:
    require_project(project_id, db)
    milestone = Milestone(project_id=project_id, **payload.model_dump())
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.get("/projects/{project_id}/risks", response_model=list[RiskRead])
def list_risks(project_id: uuid.UUID, db: DbSession) -> list[Risk]:
    require_project(project_id, db)
    return list(db.scalars(select(Risk).where(Risk.project_id == project_id)))


@router.post(
    "/projects/{project_id}/risks",
    response_model=RiskRead,
    status_code=status.HTTP_201_CREATED,
)
def create_risk(project_id: uuid.UUID, payload: RiskCreate, db: DbSession) -> Risk:
    require_project(project_id, db)
    risk = Risk(project_id=project_id, **payload.model_dump())
    db.add(risk)
    if risk.severity in {RiskSeverity.HIGH, RiskSeverity.CRITICAL}:
        project = require_project(project_id, db)
        project.status = ProjectStatus.AT_RISK
    db.commit()
    db.refresh(risk)
    return risk


@router.get("/projects/{project_id}/actions", response_model=list[ActionItemRead])
def list_actions(project_id: uuid.UUID, db: DbSession) -> list[ActionItem]:
    require_project(project_id, db)
    return list(db.scalars(select(ActionItem).where(ActionItem.project_id == project_id)))


@router.post(
    "/projects/{project_id}/actions",
    response_model=ActionItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_action(project_id: uuid.UUID, payload: ActionItemCreate, db: DbSession) -> ActionItem:
    require_project(project_id, db)
    action = ActionItem(project_id=project_id, **payload.model_dump())
    db.add(action)
    db.commit()
    db.refresh(action)
    return action

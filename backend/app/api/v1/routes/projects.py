import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import ActiveMembership, get_current_user
from app.db.session import get_db
from app.models.lpn import Client
from app.models.project import Project
from app.models.security import User
from app.schemas.project import ProjectCreate, ProjectRead
from app.services.audit import audit

router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[ProjectRead])
def list_projects(db: DbSession, _: CurrentUser, membership: ActiveMembership) -> list[Project]:
    return list(
        db.scalars(
            select(Project)
            .where(Project.organization_id == membership.organization_id)
            .order_by(Project.created_at.desc())
        )
    )


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: DbSession,
    user: CurrentUser,
    membership: ActiveMembership,
) -> Project:
    if payload.target_end_date < payload.start_date:
        raise HTTPException(status_code=422, detail="A data final nao pode ser anterior a inicial.")
    client = db.scalar(
        select(Client).where(
            Client.organization_id == membership.organization_id,
            Client.name == payload.client_name.strip(),
        )
    )
    if not client:
        client = Client(
            organization_id=membership.organization_id,
            name=payload.client_name.strip(),
        )
        db.add(client)
        db.flush()
    project = Project(
        **payload.model_dump(),
        organization_id=membership.organization_id,
        client_id=client.id,
    )
    db.add(project)
    db.flush()
    audit(db, actor=user, action="create", entity_type="project", entity_id=str(project.id))
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
    membership: ActiveMembership,
) -> Project:
    project = db.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == membership.organization_id,
        )
    )
    if not project:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado.")
    return project


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: uuid.UUID,
    payload: ProjectCreate,
    db: DbSession,
    user: CurrentUser,
    membership: ActiveMembership,
) -> Project:
    project = db.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == membership.organization_id,
        )
    )
    if not project:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado.")
    if payload.target_end_date < payload.start_date:
        raise HTTPException(status_code=422, detail="A data final nao pode ser anterior a inicial.")
    before = ProjectRead.model_validate(project).model_dump(mode="json")
    for field, value in payload.model_dump().items():
        setattr(project, field, value)
    db.flush()
    after = ProjectRead.model_validate(project).model_dump(mode="json")
    audit(
        db,
        actor=user,
        action="update",
        entity_type="project",
        entity_id=str(project.id),
        before=before,
        after=after,
    )
    db.commit()
    db.refresh(project)
    return project

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.project import ProjectStatus


class ProjectCreate(BaseModel):
    name: str = Field(min_length=3, max_length=160)
    client_name: str = Field(min_length=2, max_length=160)
    description: str | None = None
    manager_name: str | None = None
    start_date: date
    target_end_date: date
    contracted_hours: float = Field(default=0, ge=0)
    status: ProjectStatus = ProjectStatus.PLANNING
class ProjectRead(ProjectCreate):
    id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

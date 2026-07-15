import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.security import UserRole


class UserCreate(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    full_name: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.MANAGER


class UserRead(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead

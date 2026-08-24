from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import ActiveMembership, DbSession, get_current_user, require_admin
from app.core.security import create_access_token, hash_password, verify_password
from app.models.lpn import OrganizationMembership
from app.models.security import User, UserRole
from app.schemas.auth import LoginRequest, TokenResponse, UserCreate, UserRead
from app.services.audit import audit
from app.services.tenancy import ROLE_MAP, create_default_organization

router = APIRouter()


@router.post("/bootstrap-admin", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def bootstrap_admin(payload: UserCreate, db: DbSession) -> User:
    users_count = db.scalar(select(func.count()).select_from(User))
    if users_count:
        raise HTTPException(status_code=409, detail="Bootstrap ja executado.")
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=UserRole.ADMIN,
    )
    db.add(user)
    db.flush()
    create_default_organization(db, user=user)
    audit(db, actor=user, action="bootstrap_admin", entity_type="user", entity_id=str(user.id))
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    invalid_credentials = (
        not user
        or not verify_password(payload.password, user.hashed_password)
        or not user.is_active
    )
    if invalid_credentials:
        raise HTTPException(status_code=401, detail="Credenciais invalidas.")
    assert user is not None
    token = create_access_token(user.email)
    return TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=UserRead)
def me(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: DbSession,
    admin: Annotated[User, Depends(require_admin)],
    membership: ActiveMembership,
) -> User:
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=409, detail="E-mail ja cadastrado.")
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.flush()
    db.add(
        OrganizationMembership(
            organization_id=membership.organization_id,
            user_id=user.id,
            role=ROLE_MAP[user.role],
        )
    )
    audit(db, actor=admin, action="create", entity_type="user", entity_id=str(user.id))
    db.commit()
    db.refresh(user)
    return user

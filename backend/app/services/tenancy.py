import re
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lpn import (
    MembershipRole,
    OrganizationMembership,
    TenantOrganization,
)
from app.models.security import User, UserRole

ROLE_MAP = {
    UserRole.ADMIN: MembershipRole.ADMIN,
    UserRole.MANAGER: MembershipRole.MANAGER,
    UserRole.CONSULTANT: MembershipRole.BUSINESS_ANALYST,
    UserRole.EXECUTIVE: MembershipRole.READER,
    UserRole.CLIENT: MembershipRole.CLIENT,
}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "organization"


def create_default_organization(db: Session, *, user: User) -> TenantOrganization:
    base_slug = slugify(user.email.split("@")[-1].split(".")[0] or "organization")
    slug = base_slug
    suffix = 1
    while db.scalar(select(TenantOrganization).where(TenantOrganization.slug == slug)):
        suffix += 1
        slug = f"{base_slug}-{suffix}"
    organization = TenantOrganization(name="Organização principal", slug=slug)
    db.add(organization)
    db.flush()
    db.add(
        OrganizationMembership(
            organization_id=organization.id,
            user_id=user.id,
            role=ROLE_MAP[user.role],
        )
    )
    db.flush()
    return organization


def get_membership(
    db: Session,
    *,
    user: User,
    organization_id: uuid.UUID | None = None,
) -> OrganizationMembership:
    query = select(OrganizationMembership).where(
        OrganizationMembership.user_id == user.id,
        OrganizationMembership.is_active.is_(True),
    )
    if organization_id:
        query = query.where(OrganizationMembership.organization_id == organization_id)
    membership = db.scalar(query.order_by(OrganizationMembership.created_at))
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário sem participação ativa na organização.",
        )
    return membership


def require_membership_role(
    membership: OrganizationMembership,
    *allowed: MembershipRole,
) -> None:
    if membership.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Perfil sem permissão para esta operação.",
        )

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import ActiveMembership, DbSession, get_current_user
from app.models.lpn import Client, MembershipRole, OrganizationMembership, TenantOrganization
from app.models.security import User
from app.schemas.lpn import ClientCreate, ClientRead, OrganizationCreate, OrganizationRead
from app.services.audit import audit
from app.services.tenancy import require_membership_role, slugify

router = APIRouter()
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    db: DbSession,
    user: CurrentUser,
) -> OrganizationRead:
    if user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Apenas administrador pode criar organização.")
    slug = slugify(payload.slug or payload.name)
    if db.scalar(select(TenantOrganization).where(TenantOrganization.slug == slug)):
        raise HTTPException(status_code=409, detail="Identificador da organização já utilizado.")
    organization = TenantOrganization(name=payload.name.strip(), slug=slug)
    db.add(organization)
    db.flush()
    membership = OrganizationMembership(
        organization_id=organization.id,
        user_id=user.id,
        role=MembershipRole.ADMIN,
    )
    db.add(membership)
    db.commit()
    return OrganizationRead(
        id=organization.id,
        name=organization.name,
        slug=organization.slug,
        role=membership.role,
    )


@router.get("", response_model=list[OrganizationRead])
def list_organizations(db: DbSession, user: CurrentUser) -> list[OrganizationRead]:
    rows = db.execute(
        select(TenantOrganization, OrganizationMembership.role)
        .join(
            OrganizationMembership,
            OrganizationMembership.organization_id == TenantOrganization.id,
        )
        .where(
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.is_active.is_(True),
            TenantOrganization.is_active.is_(True),
        )
        .order_by(TenantOrganization.name)
    ).all()
    return [
        OrganizationRead(
            id=organization.id,
            name=organization.name,
            slug=organization.slug,
            role=role,
        )
        for organization, role in rows
    ]


@router.get("/clients", response_model=list[ClientRead])
def list_clients(db: DbSession, membership: ActiveMembership) -> list[Client]:
    return list(
        db.scalars(
            select(Client)
            .where(
                Client.organization_id == membership.organization_id,
                Client.is_active.is_(True),
            )
            .order_by(Client.name)
        )
    )


@router.post("/clients", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> Client:
    require_membership_role(
        membership,
        MembershipRole.ADMIN,
        MembershipRole.MANAGER,
        MembershipRole.BUSINESS_ANALYST,
    )
    existing = db.scalar(
        select(Client).where(
            Client.organization_id == membership.organization_id,
            Client.name == payload.name.strip(),
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Cliente já cadastrado.")
    client = Client(
        organization_id=membership.organization_id,
        name=payload.name.strip(),
        document_number=payload.document_number,
    )
    db.add(client)
    db.flush()
    audit(db, actor=user, action="create", entity_type="client", entity_id=str(client.id))
    db.commit()
    db.refresh(client)
    return client

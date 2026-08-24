import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MembershipRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    BUSINESS_ANALYST = "business_analyst"
    FUNCTIONAL_REVIEWER = "functional_reviewer"
    TECHNICAL_REVIEWER = "technical_reviewer"
    APPROVER = "approver"
    CLIENT = "client"
    READER = "reader"


class AccessScopeType(str, enum.Enum):
    ORGANIZATION = "organization"
    CLIENT = "client"
    PROJECT = "project"
    DEMAND = "demand"


class DemandType(str, enum.Enum):
    CORRECTION = "correction"
    IMPROVEMENT = "improvement"
    NEW_FEATURE = "new_feature"
    REPORT = "report"
    INTEGRATION = "integration"
    LEGAL = "legal"


class DemandPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class LpnStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_DISCOVERY = "in_discovery"
    WAITING_INFORMATION = "waiting_information"
    AS_IS_VALIDATION = "as_is_validation"
    AS_IS_APPROVED = "as_is_approved"
    TO_BE_BUILDING = "to_be_building"
    TO_BE_VALIDATION = "to_be_validation"
    FUNCTIONAL_REVIEW = "functional_review"
    TECHNICAL_REVIEW = "technical_review"
    WAITING_APPROVAL = "waiting_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class DocumentStatus(str, enum.Enum):
    NOT_GENERATED = "not_generated"
    REQUESTED = "requested"
    PROCESSING = "processing"
    GENERATED = "generated"
    FAILED = "failed"
    OUTDATED = "outdated"


class ContentKind(str, enum.Enum):
    STORYTELLING = "storytelling"
    STAKEHOLDER = "stakeholder"
    GAP = "gap"
    OBJECTIVE = "objective"
    REQUIREMENT = "requirement"
    BUSINESS_RULE = "business_rule"
    SCREEN = "screen"
    SCREEN_FIELD = "screen_field"
    REPORT = "report"
    INTEGRATION = "integration"
    IMPACT = "impact"
    CONSTRAINT = "constraint"
    DEPENDENCY = "dependency"
    SCOPE_EXCLUSION = "scope_exclusion"
    ACCEPTANCE_CRITERION = "acceptance_criterion"
    PENDING_ISSUE = "pending_issue"


class ProcessType(str, enum.Enum):
    AS_IS = "as_is"
    TO_BE = "to_be"


class ValidationSeverity(str, enum.Enum):
    BLOCKING = "blocking"
    WARNING = "warning"


class ValidationResultStatus(str, enum.Enum):
    PASSED = "passed"
    FAILED = "failed"
    JUSTIFIED = "justified"


class ApprovalDecisionType(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class AiDecisionType(str, enum.Enum):
    ACCEPTED = "accepted"
    ACCEPTED_WITH_CHANGES = "accepted_with_changes"
    REJECTED = "rejected"
    PENDING = "pending"


class TenantOrganization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(180), index=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OrganizationMembership(Base):
    __tablename__ = "organization_memberships"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[MembershipRole] = mapped_column(Enum(MembershipRole))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AccessScope(Base):
    __tablename__ = "access_scopes"
    __table_args__ = (UniqueConstraint("membership_id", "scope_type", "scope_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    membership_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organization_memberships.id"), index=True
    )
    scope_type: Mapped[AccessScopeType] = mapped_column(Enum(AccessScopeType))
    scope_id: Mapped[uuid.UUID] = mapped_column(index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Client(Base):
    __tablename__ = "clients"
    __table_args__ = (UniqueConstraint("organization_id", "name"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"), index=True
    )
    name: Mapped[str] = mapped_column(String(180), index=True)
    document_number: Mapped[str | None] = mapped_column(String(40))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Demand(Base):
    __tablename__ = "demands"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"), index=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id"), index=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(220), index=True)
    external_number: Mapped[str | None] = mapped_column(String(80), index=True)
    business_area: Mapped[str] = mapped_column(String(120))
    business_process: Mapped[str] = mapped_column(String(160))
    system_product: Mapped[str] = mapped_column(String(160))
    requester_name: Mapped[str] = mapped_column(String(160))
    analyst_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    product_owner_name: Mapped[str | None] = mapped_column(String(160))
    priority: Mapped[DemandPriority] = mapped_column(Enum(DemandPriority))
    priority_reason: Mapped[str | None] = mapped_column(Text)
    discovery_date: Mapped[date] = mapped_column(Date)
    desired_deadline: Mapped[date | None] = mapped_column(Date)
    demand_type: Mapped[DemandType] = mapped_column(Enum(DemandType))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Lpn(Base):
    __tablename__ = "lpns"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    demand_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("demands.id"), unique=True, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"), index=True
    )
    current_version_number: Mapped[int] = mapped_column(Integer, default=1)
    approved_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("lpn_versions.id", use_alter=True, name="fk_lpns_approved_version"),
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LpnVersion(Base):
    __tablename__ = "lpn_versions"
    __table_args__ = (UniqueConstraint("lpn_id", "version_number"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lpns.id"), index=True)
    source_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    version_number: Mapped[int] = mapped_column(Integer)
    status: Mapped[LpnStatus] = mapped_column(Enum(LpnStatus), default=LpnStatus.DRAFT)
    document_status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus), default=DocumentStatus.NOT_GENERATED
    )
    change_summary: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LpnContentItem(Base):
    """Conteúdo funcional tipado e versionado da LPN.

    O payload mantém flexibilidade para os formulários extensos da especificação, enquanto
    kind/code/stable_key garantem consulta, validação e rastreabilidade explícitas.
    """

    __tablename__ = "lpn_content_items"
    __table_args__ = (UniqueConstraint("lpn_version_id", "kind", "code"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    source_item_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("lpn_content_items.id"), index=True
    )
    stable_key: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, index=True)
    kind: Mapped[ContentKind] = mapped_column(Enum(ContentKind), index=True)
    code: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(220))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LpnContentLink(Base):
    __tablename__ = "lpn_content_links"
    __table_args__ = (UniqueConstraint("source_item_id", "target_item_id", "relationship"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    source_item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_content_items.id"), index=True
    )
    target_item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_content_items.id"), index=True
    )
    relationship: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ProcessDiagram(Base):
    __tablename__ = "lpn_process_diagrams"
    __table_args__ = (UniqueConstraint("lpn_version_id", "process_type"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    source_diagram_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("lpn_process_diagrams.id"), index=True
    )
    process_type: Mapped[ProcessType] = mapped_column(Enum(ProcessType))
    name: Mapped[str] = mapped_column(String(180))
    model: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StatusTransition(Base):
    __tablename__ = "lpn_status_transitions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    from_status: Mapped[LpnStatus] = mapped_column(Enum(LpnStatus))
    to_status: Mapped[LpnStatus] = mapped_column(Enum(LpnStatus))
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    justification: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ValidationRule(Base):
    __tablename__ = "lpn_validation_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    phase: Mapped[str] = mapped_column(String(80))
    severity: Mapped[ValidationSeverity] = mapped_column(Enum(ValidationSeverity))
    message: Mapped[str] = mapped_column(String(500))
    can_justify: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ValidationResult(Base):
    __tablename__ = "lpn_validation_results"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    rule_code: Mapped[str] = mapped_column(String(40), index=True)
    severity: Mapped[ValidationSeverity] = mapped_column(Enum(ValidationSeverity))
    status: Mapped[ValidationResultStatus] = mapped_column(Enum(ValidationResultStatus))
    message: Mapped[str] = mapped_column(String(500))
    justification: Mapped[str | None] = mapped_column(Text)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ApprovalStep(Base):
    __tablename__ = "lpn_approval_steps"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    name: Mapped[str] = mapped_column(String(160))
    step_order: Mapped[int] = mapped_column(Integer)
    is_parallel: Mapped[bool] = mapped_column(Boolean, default=False)
    required_approvals: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ApprovalAssignment(Base):
    __tablename__ = "lpn_approval_assignments"
    __table_args__ = (UniqueConstraint("approval_step_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    approval_step_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_approval_steps.id"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ApprovalDecision(Base):
    __tablename__ = "lpn_approval_decisions"
    __table_args__ = (UniqueConstraint("approval_step_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    approval_step_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_approval_steps.id"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    decision: Mapped[ApprovalDecisionType] = mapped_column(Enum(ApprovalDecisionType))
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InformationSource(Base):
    __tablename__ = "lpn_information_sources"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    source_type: Mapped[str] = mapped_column(String(60))
    name: Mapped[str] = mapped_column(String(255))
    reference: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AiInteraction(Base):
    __tablename__ = "lpn_ai_interactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    use_case: Mapped[str] = mapped_column(String(80))
    provider: Mapped[str] = mapped_column(String(80))
    model: Mapped[str] = mapped_column(String(120))
    prompt_version: Mapped[str] = mapped_column(String(40))
    prompt: Mapped[str] = mapped_column(Text)
    response: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AiSuggestion(Base):
    __tablename__ = "lpn_ai_suggestions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    interaction_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_ai_interactions.id"), index=True
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("lpn_information_sources.id"), index=True
    )
    target_kind: Mapped[ContentKind] = mapped_column(Enum(ContentKind))
    suggested_content: Mapped[dict] = mapped_column(JSON)
    confidence: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AiHumanDecision(Base):
    __tablename__ = "lpn_ai_human_decisions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    suggestion_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_ai_suggestions.id"), unique=True, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    decision: Mapped[AiDecisionType] = mapped_column(Enum(AiDecisionType))
    final_content: Mapped[dict | None] = mapped_column(JSON)
    justification: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Attachment(Base):
    __tablename__ = "lpn_attachments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lpns.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AttachmentVersion(Base):
    __tablename__ = "lpn_attachment_versions"
    __table_args__ = (UniqueConstraint("attachment_id", "version_number"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    attachment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_attachments.id"), index=True
    )
    version_number: Mapped[int] = mapped_column(Integer)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(120))
    content: Mapped[bytes] = mapped_column(LargeBinary)
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Evidence(Base):
    __tablename__ = "lpn_evidences"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    attachment_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_attachment_versions.id"), index=True
    )
    content_item_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("lpn_content_items.id"), index=True
    )
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DocumentGenerationJob(Base):
    __tablename__ = "lpn_document_generation_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    requested_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    formats: Mapped[list] = mapped_column(JSON)
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus))
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)


class GeneratedDocument(Base):
    __tablename__ = "lpn_generated_documents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_document_generation_jobs.id"), index=True
    )
    lpn_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lpn_versions.id"), index=True
    )
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(120))
    content: Mapped[bytes] = mapped_column(LargeBinary)
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

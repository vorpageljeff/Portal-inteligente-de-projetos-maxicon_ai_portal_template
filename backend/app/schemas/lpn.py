import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.lpn import (
    ApprovalDecisionType,
    ContentKind,
    DemandPriority,
    DemandType,
    DocumentStatus,
    LpnStatus,
    MembershipRole,
    ProcessType,
    ValidationResultStatus,
    ValidationSeverity,
)


class OrganizationRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    role: MembershipRole


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    slug: str | None = Field(default=None, min_length=2, max_length=100)


class ClientCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    document_number: str | None = Field(default=None, max_length=40)


class ClientRead(ClientCreate):
    id: uuid.UUID
    organization_id: uuid.UUID
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DemandCreate(BaseModel):
    client_id: uuid.UUID
    project_id: uuid.UUID | None = None
    title: str = Field(min_length=3, max_length=220)
    external_number: str | None = Field(default=None, max_length=80)
    business_area: str = Field(min_length=2, max_length=120)
    business_process: str = Field(min_length=2, max_length=160)
    system_product: str = Field(min_length=2, max_length=160)
    requester_name: str = Field(min_length=2, max_length=160)
    product_owner_name: str | None = Field(default=None, max_length=160)
    priority: DemandPriority = DemandPriority.MEDIUM
    priority_reason: str | None = None
    discovery_date: date
    desired_deadline: date | None = None
    demand_type: DemandType

    @model_validator(mode="after")
    def validate_priority(self):
        if self.priority in {DemandPriority.HIGH, DemandPriority.CRITICAL}:
            if not self.priority_reason or len(self.priority_reason.strip()) < 3:
                raise ValueError("Prioridade alta ou crítica exige justificativa.")
        return self


class DemandRead(DemandCreate):
    id: uuid.UUID
    organization_id: uuid.UUID
    analyst_user_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LpnVersionRead(BaseModel):
    id: uuid.UUID
    lpn_id: uuid.UUID
    source_version_id: uuid.UUID | None
    version_number: int
    status: LpnStatus
    document_status: DocumentStatus
    change_summary: str | None
    created_by_id: uuid.UUID
    approved_at: datetime | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LpnRead(BaseModel):
    id: uuid.UUID
    demand_id: uuid.UUID
    organization_id: uuid.UUID
    current_version_number: int
    approved_version_id: uuid.UUID | None
    current_version: LpnVersionRead | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ContentItemCreate(BaseModel):
    kind: ContentKind
    code: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=2, max_length=220)
    payload: dict[str, Any] = Field(default_factory=dict)
    sort_order: int = Field(default=0, ge=0)


class ContentItemRead(ContentItemCreate):
    id: uuid.UUID
    lpn_version_id: uuid.UUID
    source_item_id: uuid.UUID | None
    stable_key: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ContentLinkCreate(BaseModel):
    source_item_id: uuid.UUID
    target_item_id: uuid.UUID
    relationship: str = Field(min_length=2, max_length=80)


class ContentLinkRead(ContentLinkCreate):
    id: uuid.UUID
    lpn_version_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ProcessDiagramUpsert(BaseModel):
    process_type: ProcessType
    name: str = Field(min_length=2, max_length=180)
    model: dict[str, Any]


class ProcessDiagramRead(ProcessDiagramUpsert):
    id: uuid.UUID
    lpn_version_id: uuid.UUID
    source_diagram_id: uuid.UUID | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StatusTransitionRequest(BaseModel):
    to_status: LpnStatus
    justification: str | None = Field(default=None, max_length=2000)


class ValidationResultRead(BaseModel):
    id: uuid.UUID
    lpn_version_id: uuid.UUID
    rule_code: str
    severity: ValidationSeverity
    status: ValidationResultStatus
    message: str
    justification: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ApprovalSetupRequest(BaseModel):
    name: str = Field(default="Aprovação final", min_length=3, max_length=160)
    approver_ids: list[uuid.UUID] = Field(min_length=1)
    required_approvals: int = Field(default=1, ge=1)
    is_parallel: bool = False


class ApprovalDecisionRequest(BaseModel):
    decision: ApprovalDecisionType
    comment: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def validate_comment(self):
        if self.decision != ApprovalDecisionType.APPROVED and not self.comment:
            raise ValueError("Reprovação ou solicitação de ajuste exige comentário.")
        return self


class CloneVersionRequest(BaseModel):
    change_summary: str = Field(min_length=3, max_length=2000)


class DocumentGenerateRequest(BaseModel):
    formats: list[str] = Field(default_factory=lambda: ["docx", "pdf"])

    @model_validator(mode="after")
    def validate_formats(self):
        allowed = {"docx", "pdf", "json", "svg"}
        invalid = set(self.formats) - allowed
        if invalid or not self.formats:
            raise ValueError("Formatos permitidos: docx, pdf, json e svg.")
        return self


class GeneratedDocumentRead(BaseModel):
    id: uuid.UUID
    lpn_version_id: uuid.UUID
    filename: str
    content_type: str
    sha256: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EvidenceCreate(BaseModel):
    attachment_version_id: uuid.UUID
    content_item_id: uuid.UUID | None = None
    description: str | None = Field(default=None, max_length=2000)


class EvidenceRead(EvidenceCreate):
    id: uuid.UUID
    lpn_version_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LpnAiPreviewRequest(BaseModel):
    use_case: ContentKind
    input_text: str = Field(min_length=20, max_length=30000)
    source_ids: list[uuid.UUID] = Field(default_factory=list, max_length=20)


class LpnAiQuestion(BaseModel):
    question: str
    reason: str


class LpnAiSuggestionDraft(BaseModel):
    kind: ContentKind
    title: str = Field(min_length=2, max_length=220)
    payload: dict[str, Any]
    confidence: int = Field(default=70, ge=0, le=100)


class LpnAiOutput(BaseModel):
    status: str
    analysis: str
    questions: list[LpnAiQuestion] = Field(default_factory=list)
    suggestions: list[LpnAiSuggestionDraft] = Field(default_factory=list)


class LpnAiPreviewRead(LpnAiOutput):
    interaction_id: uuid.UUID
    suggestion_ids: list[uuid.UUID] = Field(default_factory=list)


class LpnAiDecisionRequest(BaseModel):
    decision: str
    final_content: dict[str, Any] | None = None
    justification: str | None = Field(default=None, max_length=4000)

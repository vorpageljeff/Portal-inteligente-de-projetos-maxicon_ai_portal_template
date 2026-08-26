import hashlib
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import delete, func, select

from app.api.deps import ActiveMembership, DbSession, get_current_user
from app.models.lpn import (
    AiDecisionType,
    AiHumanDecision,
    AiInteraction,
    AiSuggestion,
    ApprovalAssignment,
    ApprovalDecision,
    ApprovalStep,
    Attachment,
    AttachmentVersion,
    Client,
    Demand,
    DocumentGenerationJob,
    DocumentStatus,
    Evidence,
    GeneratedDocument,
    InformationSource,
    Lpn,
    LpnContentItem,
    LpnContentLink,
    LpnStatus,
    LpnVersion,
    MembershipRole,
    OrganizationMembership,
    ProcessDiagram,
    ValidationResult,
)
from app.models.project import Project
from app.models.security import User
from app.schemas.lpn import (
    ApprovalDecisionRequest,
    ApprovalSetupRequest,
    CloneVersionRequest,
    ContentItemCreate,
    ContentItemRead,
    ContentLinkCreate,
    ContentLinkRead,
    DemandCreate,
    DemandRead,
    DocumentGenerateRequest,
    EvidenceCreate,
    EvidenceRead,
    GeneratedDocumentRead,
    LpnAiComposeRequest,
    LpnAiDecisionRequest,
    LpnAiPreviewRead,
    LpnAiPreviewRequest,
    LpnRead,
    LpnVersionRead,
    ProcessDiagramRead,
    ProcessDiagramUpsert,
    StatusTransitionRequest,
    ValidationResultRead,
)
from app.services.audit import audit
from app.services.lpn import (
    clone_version,
    ensure_editable,
    require_lpn_version,
    run_validation,
    transition_version,
)
from app.services.lpn_ai import LpnAiError, LpnAiService, serialize_ai_output
from app.services.lpn_documents import generate_documents
from app.services.tenancy import require_membership_role

router = APIRouter()
CurrentUser = Annotated[User, Depends(get_current_user)]

ALLOWED_UPLOAD_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "text/plain",
    "text/csv",
}
MAX_UPLOAD_SIZE = 20 * 1024 * 1024


def _read_lpn(db: DbSession, lpn: Lpn) -> LpnRead:
    version = db.scalar(
        select(LpnVersion)
        .where(LpnVersion.lpn_id == lpn.id)
        .order_by(LpnVersion.version_number.desc())
    )
    return LpnRead.model_validate(lpn).model_copy(
        update={"current_version": LpnVersionRead.model_validate(version) if version else None}
    )


def _require_lpn(db: DbSession, lpn_id: uuid.UUID, membership: ActiveMembership) -> Lpn:
    lpn = db.scalar(
        select(Lpn).where(
            Lpn.id == lpn_id,
            Lpn.organization_id == membership.organization_id,
        )
    )
    if not lpn:
        raise HTTPException(status_code=404, detail="LPN não encontrada.")
    return lpn


@router.get("/demands", response_model=list[DemandRead])
def list_demands(db: DbSession, membership: ActiveMembership) -> list[Demand]:
    return list(
        db.scalars(
            select(Demand)
            .where(Demand.organization_id == membership.organization_id)
            .order_by(Demand.created_at.desc())
        )
    )


@router.post("/demands", response_model=DemandRead, status_code=status.HTTP_201_CREATED)
def create_demand(
    payload: DemandCreate,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> Demand:
    require_membership_role(
        membership,
        MembershipRole.ADMIN,
        MembershipRole.MANAGER,
        MembershipRole.BUSINESS_ANALYST,
    )
    client = db.scalar(
        select(Client).where(
            Client.id == payload.client_id,
            Client.organization_id == membership.organization_id,
        )
    )
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    if payload.project_id:
        project = db.scalar(
            select(Project).where(
                Project.id == payload.project_id,
                Project.organization_id == membership.organization_id,
                Project.client_id == client.id,
            )
        )
        if not project:
            raise HTTPException(
                status_code=422,
                detail="O projeto precisa pertencer ao cliente informado.",
            )
    demand = Demand(
        **payload.model_dump(),
        organization_id=membership.organization_id,
        analyst_user_id=user.id,
    )
    db.add(demand)
    db.flush()
    audit(db, actor=user, action="create", entity_type="demand", entity_id=str(demand.id))
    db.commit()
    db.refresh(demand)
    return demand


@router.get("", response_model=list[LpnRead])
def list_lpns(db: DbSession, membership: ActiveMembership) -> list[LpnRead]:
    lpns = list(
        db.scalars(
            select(Lpn)
            .where(Lpn.organization_id == membership.organization_id)
            .order_by(Lpn.created_at.desc())
        )
    )
    return [_read_lpn(db, item) for item in lpns]


@router.post("/from-demand/{demand_id}", response_model=LpnRead, status_code=201)
def create_lpn(
    demand_id: uuid.UUID,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> LpnRead:
    require_membership_role(
        membership,
        MembershipRole.ADMIN,
        MembershipRole.MANAGER,
        MembershipRole.BUSINESS_ANALYST,
    )
    demand = db.scalar(
        select(Demand).where(
            Demand.id == demand_id,
            Demand.organization_id == membership.organization_id,
        )
    )
    if not demand:
        raise HTTPException(status_code=404, detail="Demanda não encontrada.")
    if db.scalar(select(Lpn).where(Lpn.demand_id == demand.id)):
        raise HTTPException(status_code=409, detail="A demanda já possui LPN.")
    lpn = Lpn(demand_id=demand.id, organization_id=membership.organization_id)
    db.add(lpn)
    db.flush()
    version = LpnVersion(lpn_id=lpn.id, version_number=1, created_by_id=user.id)
    db.add(version)
    db.flush()
    audit(db, actor=user, action="create", entity_type="lpn", entity_id=str(lpn.id))
    db.commit()
    db.refresh(lpn)
    return _read_lpn(db, lpn)


@router.get("/detail/{lpn_id}", response_model=LpnRead)
def get_lpn(lpn_id: uuid.UUID, db: DbSession, membership: ActiveMembership) -> LpnRead:
    return _read_lpn(db, _require_lpn(db, lpn_id, membership))


@router.get("/versions/{version_id}/content", response_model=list[ContentItemRead])
def list_content(
    version_id: uuid.UUID,
    db: DbSession,
    membership: ActiveMembership,
) -> list[LpnContentItem]:
    require_lpn_version(db, version_id=version_id, membership=membership)
    return list(
        db.scalars(
            select(LpnContentItem)
            .where(LpnContentItem.lpn_version_id == version_id)
            .order_by(LpnContentItem.kind, LpnContentItem.sort_order)
        )
    )


@router.post(
    "/versions/{version_id}/content", response_model=ContentItemRead, status_code=201
)
def create_content(
    version_id: uuid.UUID,
    payload: ContentItemCreate,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> LpnContentItem:
    _, version = require_lpn_version(db, version_id=version_id, membership=membership)
    ensure_editable(version, membership)
    item = LpnContentItem(lpn_version_id=version.id, **payload.model_dump())
    db.add(item)
    db.flush()
    audit(db, actor=user, action="create", entity_type=payload.kind.value, entity_id=str(item.id))
    db.commit()
    db.refresh(item)
    return item


@router.put("/versions/{version_id}/content/{item_id}", response_model=ContentItemRead)
def update_content(
    version_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: ContentItemCreate,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> LpnContentItem:
    _, version = require_lpn_version(db, version_id=version_id, membership=membership)
    ensure_editable(version, membership)
    item = db.scalar(
        select(LpnContentItem).where(
            LpnContentItem.id == item_id,
            LpnContentItem.lpn_version_id == version.id,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")
    before = {
        "kind": item.kind.value,
        "code": item.code,
        "title": item.title,
        "payload": item.payload,
    }
    for field, value in payload.model_dump().items():
        setattr(item, field, value)
    audit(
        db,
        actor=user,
        action="update",
        entity_type=payload.kind.value,
        entity_id=str(item.id),
        before=before,
        after=payload.model_dump(mode="json"),
    )
    db.commit()
    db.refresh(item)
    return item


@router.delete("/versions/{version_id}/content/{item_id}", status_code=204)
def delete_content(
    version_id: uuid.UUID,
    item_id: uuid.UUID,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> Response:
    _, version = require_lpn_version(db, version_id=version_id, membership=membership)
    ensure_editable(version, membership)
    item = db.scalar(
        select(LpnContentItem).where(
            LpnContentItem.id == item_id,
            LpnContentItem.lpn_version_id == version.id,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")
    db.execute(
        delete(LpnContentLink).where(
            (LpnContentLink.source_item_id == item.id)
            | (LpnContentLink.target_item_id == item.id)
        )
    )
    db.delete(item)
    audit(db, actor=user, action="delete", entity_type=item.kind.value, entity_id=str(item.id))
    db.commit()
    return Response(status_code=204)


@router.get("/versions/{version_id}/links", response_model=list[ContentLinkRead])
def list_links(
    version_id: uuid.UUID,
    db: DbSession,
    membership: ActiveMembership,
) -> list[LpnContentLink]:
    require_lpn_version(db, version_id=version_id, membership=membership)
    return list(
        db.scalars(select(LpnContentLink).where(LpnContentLink.lpn_version_id == version_id))
    )


@router.post("/versions/{version_id}/links", response_model=ContentLinkRead, status_code=201)
def create_link(
    version_id: uuid.UUID,
    payload: ContentLinkCreate,
    db: DbSession,
    membership: ActiveMembership,
) -> LpnContentLink:
    _, version = require_lpn_version(db, version_id=version_id, membership=membership)
    ensure_editable(version, membership)
    items = list(
        db.scalars(
            select(LpnContentItem).where(
                LpnContentItem.lpn_version_id == version.id,
                LpnContentItem.id.in_([payload.source_item_id, payload.target_item_id]),
            )
        )
    )
    if len(items) != 2 or payload.source_item_id == payload.target_item_id:
        raise HTTPException(status_code=422, detail="Vínculo deve usar dois conteúdos da versão.")
    link = LpnContentLink(lpn_version_id=version.id, **payload.model_dump())
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.put("/versions/{version_id}/diagrams", response_model=ProcessDiagramRead)
def upsert_diagram(
    version_id: uuid.UUID,
    payload: ProcessDiagramUpsert,
    db: DbSession,
    membership: ActiveMembership,
) -> ProcessDiagram:
    _, version = require_lpn_version(db, version_id=version_id, membership=membership)
    ensure_editable(version, membership)
    diagram = db.scalar(
        select(ProcessDiagram).where(
            ProcessDiagram.lpn_version_id == version.id,
            ProcessDiagram.process_type == payload.process_type,
        )
    )
    if diagram:
        diagram.name = payload.name
        diagram.model = payload.model
    else:
        diagram = ProcessDiagram(lpn_version_id=version.id, **payload.model_dump())
        db.add(diagram)
    db.commit()
    db.refresh(diagram)
    return diagram


@router.get("/versions/{version_id}/diagrams", response_model=list[ProcessDiagramRead])
def list_diagrams(
    version_id: uuid.UUID,
    db: DbSession,
    membership: ActiveMembership,
) -> list[ProcessDiagram]:
    require_lpn_version(db, version_id=version_id, membership=membership)
    return list(
        db.scalars(select(ProcessDiagram).where(ProcessDiagram.lpn_version_id == version_id))
    )


@router.post("/versions/{version_id}/validate", response_model=list[ValidationResultRead])
def validate_version(
    version_id: uuid.UUID,
    db: DbSession,
    membership: ActiveMembership,
) -> list[ValidationResult]:
    _, version = require_lpn_version(db, version_id=version_id, membership=membership)
    results = run_validation(db, version=version)
    db.commit()
    return results


@router.post("/versions/{version_id}/transition", response_model=LpnVersionRead)
def transition(
    version_id: uuid.UUID,
    payload: StatusTransitionRequest,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> LpnVersion:
    lpn, version = require_lpn_version(db, version_id=version_id, membership=membership)
    require_membership_role(
        membership,
        MembershipRole.ADMIN,
        MembershipRole.MANAGER,
        MembershipRole.BUSINESS_ANALYST,
        MembershipRole.FUNCTIONAL_REVIEWER,
        MembershipRole.TECHNICAL_REVIEWER,
        MembershipRole.APPROVER,
    )
    transition_version(
        db,
        lpn=lpn,
        version=version,
        to_status=payload.to_status,
        actor_id=user.id,
        justification=payload.justification,
    )
    audit(db, actor=user, action="transition", entity_type="lpn_version", entity_id=str(version.id))
    db.commit()
    db.refresh(version)
    return version


@router.post("/versions/{version_id}/clone", response_model=LpnVersionRead, status_code=201)
def clone(
    version_id: uuid.UUID,
    payload: CloneVersionRequest,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> LpnVersion:
    lpn, source = require_lpn_version(db, version_id=version_id, membership=membership)
    require_membership_role(membership, MembershipRole.ADMIN, MembershipRole.MANAGER)
    target = clone_version(
        db,
        lpn=lpn,
        source=source,
        actor_id=user.id,
        change_summary=payload.change_summary,
    )
    audit(db, actor=user, action="clone", entity_type="lpn_version", entity_id=str(target.id))
    db.commit()
    db.refresh(target)
    return target


@router.post("/versions/{version_id}/approval", status_code=201)
def configure_approval(
    version_id: uuid.UUID,
    payload: ApprovalSetupRequest,
    db: DbSession,
    membership: ActiveMembership,
) -> dict[str, str]:
    _, version = require_lpn_version(db, version_id=version_id, membership=membership)
    require_membership_role(membership, MembershipRole.ADMIN, MembershipRole.MANAGER)
    ensure_editable(version, membership)
    if payload.required_approvals > len(set(payload.approver_ids)):
        raise HTTPException(status_code=422, detail="Quantidade de aprovações inválida.")
    members = set(
        db.scalars(
            select(OrganizationMembership.user_id).where(
                OrganizationMembership.organization_id == membership.organization_id,
                OrganizationMembership.user_id.in_(payload.approver_ids),
                OrganizationMembership.is_active.is_(True),
            )
        )
    )
    if members != set(payload.approver_ids):
        raise HTTPException(status_code=422, detail="Aprovador fora da organização.")
    order = (
        db.scalar(
            select(func.max(ApprovalStep.step_order)).where(
                ApprovalStep.lpn_version_id == version.id
            )
        )
        or 0
    ) + 1
    step = ApprovalStep(
        lpn_version_id=version.id,
        name=payload.name,
        step_order=order,
        is_parallel=payload.is_parallel,
        required_approvals=payload.required_approvals,
    )
    db.add(step)
    db.flush()
    db.add_all(
        [ApprovalAssignment(approval_step_id=step.id, user_id=user_id) for user_id in members]
    )
    db.commit()
    return {"id": str(step.id)}


@router.get("/versions/{version_id}/approval")
def list_approval_steps(
    version_id: uuid.UUID,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> list[dict]:
    require_lpn_version(db, version_id=version_id, membership=membership)
    steps = list(
        db.scalars(
            select(ApprovalStep)
            .where(ApprovalStep.lpn_version_id == version_id)
            .order_by(ApprovalStep.step_order)
        )
    )
    result = []
    for step in steps:
        assigned = bool(
            db.scalar(
                select(ApprovalAssignment.id).where(
                    ApprovalAssignment.approval_step_id == step.id,
                    ApprovalAssignment.user_id == user.id,
                )
            )
        )
        decision = db.scalar(
            select(ApprovalDecision).where(
                ApprovalDecision.approval_step_id == step.id,
                ApprovalDecision.user_id == user.id,
            )
        )
        result.append(
            {
                "id": str(step.id),
                "name": step.name,
                "step_order": step.step_order,
                "assigned_to_current_user": assigned,
                "current_user_decision": decision.decision.value if decision else None,
            }
        )
    return result


@router.post("/approval/{step_id}/decision", status_code=201)
def decide_approval(
    step_id: uuid.UUID,
    payload: ApprovalDecisionRequest,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> dict[str, str]:
    step = db.scalar(
        select(ApprovalStep)
        .join(LpnVersion, LpnVersion.id == ApprovalStep.lpn_version_id)
        .join(Lpn, Lpn.id == LpnVersion.lpn_id)
        .where(ApprovalStep.id == step_id, Lpn.organization_id == membership.organization_id)
    )
    if not step:
        raise HTTPException(status_code=404, detail="Etapa de aprovação não encontrada.")
    assignment = db.scalar(
        select(ApprovalAssignment).where(
            ApprovalAssignment.approval_step_id == step.id,
            ApprovalAssignment.user_id == user.id,
        )
    )
    if not assignment:
        raise HTTPException(status_code=403, detail="Usuário não designado como aprovador.")
    existing = db.scalar(
        select(ApprovalDecision).where(
            ApprovalDecision.approval_step_id == step.id,
            ApprovalDecision.user_id == user.id,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Decisão já registrada.")
    decision = ApprovalDecision(
        lpn_version_id=step.lpn_version_id,
        approval_step_id=step.id,
        user_id=user.id,
        **payload.model_dump(),
    )
    db.add(decision)
    db.commit()
    return {"id": str(decision.id), "decision": decision.decision.value}


@router.post("/{lpn_id}/attachments", status_code=201)
async def upload_attachment(
    lpn_id: uuid.UUID,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
    file: Annotated[UploadFile, File()],
) -> dict[str, str]:
    lpn = _require_lpn(db, lpn_id, membership)
    if file.content_type not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(status_code=415, detail="Tipo de arquivo não permitido.")
    content = await file.read(MAX_UPLOAD_SIZE + 1)
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de 20 MB.")
    attachment = Attachment(lpn_id=lpn.id, name=file.filename or "anexo")
    db.add(attachment)
    db.flush()
    version = AttachmentVersion(
        attachment_id=attachment.id,
        version_number=1,
        filename=file.filename or "anexo",
        content_type=file.content_type or "application/octet-stream",
        content=content,
        sha256=hashlib.sha256(content).hexdigest(),
        uploaded_by_id=user.id,
    )
    db.add(version)
    db.commit()
    return {"attachment_id": str(attachment.id), "version_id": str(version.id)}


@router.post("/versions/{version_id}/evidences", response_model=EvidenceRead, status_code=201)
def create_evidence(
    version_id: uuid.UUID,
    payload: EvidenceCreate,
    db: DbSession,
    membership: ActiveMembership,
) -> Evidence:
    lpn, version = require_lpn_version(db, version_id=version_id, membership=membership)
    ensure_editable(version, membership)
    attachment_version = db.scalar(
        select(AttachmentVersion)
        .join(Attachment, Attachment.id == AttachmentVersion.attachment_id)
        .where(
            AttachmentVersion.id == payload.attachment_version_id,
            Attachment.lpn_id == lpn.id,
        )
    )
    if not attachment_version:
        raise HTTPException(status_code=404, detail="Versão do anexo não encontrada.")
    if payload.content_item_id and not db.scalar(
        select(LpnContentItem.id).where(
            LpnContentItem.id == payload.content_item_id,
            LpnContentItem.lpn_version_id == version.id,
        )
    ):
        raise HTTPException(status_code=422, detail="Conteúdo fora da versão.")
    evidence = Evidence(lpn_version_id=version.id, **payload.model_dump())
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence


@router.post(
    "/versions/{version_id}/documents",
    response_model=list[GeneratedDocumentRead],
    status_code=201,
)
def create_documents(
    version_id: uuid.UUID,
    payload: DocumentGenerateRequest,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> list[GeneratedDocument]:
    _, version = require_lpn_version(db, version_id=version_id, membership=membership)
    if version.status != LpnStatus.APPROVED:
        raise HTTPException(status_code=409, detail="Somente versão aprovada pode ser exportada.")
    job = DocumentGenerationJob(
        lpn_version_id=version.id,
        requested_by_id=user.id,
        formats=payload.formats,
        status=DocumentStatus.REQUESTED,
    )
    db.add(job)
    db.flush()
    documents = generate_documents(db, version=version, job=job)
    db.commit()
    for document in documents:
        db.refresh(document)
    return documents


@router.get(
    "/versions/{version_id}/documents", response_model=list[GeneratedDocumentRead]
)
def list_documents(
    version_id: uuid.UUID,
    db: DbSession,
    membership: ActiveMembership,
) -> list[GeneratedDocument]:
    require_lpn_version(db, version_id=version_id, membership=membership)
    return list(
        db.scalars(
            select(GeneratedDocument)
            .where(GeneratedDocument.lpn_version_id == version_id)
            .order_by(GeneratedDocument.created_at.desc())
        )
    )


@router.get("/documents/{document_id}")
def download_document(
    document_id: uuid.UUID,
    db: DbSession,
    membership: ActiveMembership,
) -> Response:
    document = db.scalar(
        select(GeneratedDocument)
        .join(LpnVersion, LpnVersion.id == GeneratedDocument.lpn_version_id)
        .join(Lpn, Lpn.id == LpnVersion.lpn_id)
        .where(
            GeneratedDocument.id == document_id,
            Lpn.organization_id == membership.organization_id,
        )
    )
    if not document:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")
    return Response(
        content=document.content,
        media_type=document.content_type,
        headers={"Content-Disposition": f'attachment; filename="{document.filename}"'},
    )


@router.post("/versions/{version_id}/ai/preview", response_model=LpnAiPreviewRead)
def ai_preview(
    version_id: uuid.UUID,
    payload: LpnAiPreviewRequest,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> LpnAiPreviewRead:
    _, version = require_lpn_version(db, version_id=version_id, membership=membership)
    ensure_editable(version, membership)
    try:
        provider, model, output = LpnAiService().analyze(
            use_case=payload.use_case,
            input_text=payload.input_text,
        )
    except LpnAiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    interaction = AiInteraction(
        lpn_version_id=version.id,
        user_id=user.id,
        use_case=payload.use_case.value,
        provider=provider,
        model=model,
        prompt_version=LpnAiService.prompt_version,
        prompt=payload.input_text,
        response=serialize_ai_output(output),
    )
    db.add(interaction)
    db.flush()
    source = InformationSource(
        lpn_version_id=version.id,
        source_type="user_input",
        name=f"Entrada para {payload.use_case.value}",
        reference=payload.input_text,
    )
    db.add(source)
    db.flush()
    suggestions = [
        AiSuggestion(
            lpn_version_id=version.id,
            interaction_id=interaction.id,
            source_id=source.id,
            target_kind=item.kind,
            suggested_content={"title": item.title, "payload": item.payload},
            confidence=item.confidence,
        )
        for item in output.suggestions
    ]
    db.add_all(suggestions)
    db.flush()
    db.commit()
    return LpnAiPreviewRead(
        **output.model_dump(),
        interaction_id=interaction.id,
        suggestion_ids=[item.id for item in suggestions],
    )


@router.post("/versions/{version_id}/ai/compose", response_model=LpnAiPreviewRead)
def ai_compose(
    version_id: uuid.UUID,
    payload: LpnAiComposeRequest,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> LpnAiPreviewRead:
    _, version = require_lpn_version(db, version_id=version_id, membership=membership)
    ensure_editable(version, membership)
    try:
        provider, model, output = LpnAiService().compose(**payload.model_dump())
    except LpnAiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    source_text = (
        f"AS IS:\n{payload.as_is}\n\nTO BE:\n{payload.to_be}\n\n"
        f"RESTRIÇÕES:\n{payload.constraints or 'Não informadas.'}\n\n"
        f"CONTEXTO ADICIONAL:\n{payload.additional_context or 'Não informado.'}"
    )
    interaction = AiInteraction(
        lpn_version_id=version.id,
        user_id=user.id,
        use_case="full_lpn",
        provider=provider,
        model=model,
        prompt_version=LpnAiService.prompt_version,
        prompt=source_text,
        response=serialize_ai_output(output),
    )
    db.add(interaction)
    db.flush()
    source = InformationSource(
        lpn_version_id=version.id,
        source_type="user_input",
        name="Briefing AS IS / TO BE",
        reference=source_text,
    )
    db.add(source)
    db.flush()
    suggestions = [
        AiSuggestion(
            lpn_version_id=version.id,
            interaction_id=interaction.id,
            source_id=source.id,
            target_kind=item.kind,
            suggested_content={"title": item.title, "payload": item.payload},
            confidence=item.confidence,
        )
        for item in output.suggestions
    ]
    db.add_all(suggestions)
    db.flush()
    db.commit()
    return LpnAiPreviewRead(
        **output.model_dump(),
        interaction_id=interaction.id,
        suggestion_ids=[item.id for item in suggestions],
    )


@router.post("/ai/suggestions/{suggestion_id}/decision", status_code=201)
def decide_ai_suggestion(
    suggestion_id: uuid.UUID,
    payload: LpnAiDecisionRequest,
    db: DbSession,
    membership: ActiveMembership,
    user: CurrentUser,
) -> dict[str, str | None]:
    suggestion = db.scalar(
        select(AiSuggestion)
        .join(LpnVersion, LpnVersion.id == AiSuggestion.lpn_version_id)
        .join(Lpn, Lpn.id == LpnVersion.lpn_id)
        .where(
            AiSuggestion.id == suggestion_id,
            Lpn.organization_id == membership.organization_id,
        )
    )
    if not suggestion:
        raise HTTPException(status_code=404, detail="Sugestão não encontrada.")
    _, version = require_lpn_version(
        db, version_id=suggestion.lpn_version_id, membership=membership
    )
    ensure_editable(version, membership)
    try:
        decision_type = AiDecisionType(payload.decision)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Decisão de IA inválida.") from exc
    if db.scalar(select(AiHumanDecision).where(AiHumanDecision.suggestion_id == suggestion.id)):
        raise HTTPException(status_code=409, detail="Sugestão já revisada.")
    source_content = suggestion.suggested_content
    final_content = payload.final_content or source_content
    if decision_type == AiDecisionType.ACCEPTED_WITH_CHANGES and not payload.final_content:
        raise HTTPException(status_code=422, detail="Conteúdo final é obrigatório.")
    decision = AiHumanDecision(
        suggestion_id=suggestion.id,
        user_id=user.id,
        decision=decision_type,
        final_content=final_content if decision_type != AiDecisionType.REJECTED else None,
        justification=payload.justification,
    )
    db.add(decision)
    item_id: uuid.UUID | None = None
    if decision_type in {AiDecisionType.ACCEPTED, AiDecisionType.ACCEPTED_WITH_CHANGES}:
        count = db.scalar(
            select(func.count())
            .select_from(LpnContentItem)
            .where(
                LpnContentItem.lpn_version_id == version.id,
                LpnContentItem.kind == suggestion.target_kind,
            )
        ) or 0
        item = LpnContentItem(
            lpn_version_id=version.id,
            kind=suggestion.target_kind,
            code=f"{suggestion.target_kind.value[:3].upper()}-{count + 1:03d}",
            title=str(final_content.get("title") or "Conteúdo revisado pela IA")[:220],
            payload=final_content.get("payload", final_content),
            sort_order=count,
        )
        db.add(item)
        db.flush()
        item_id = item.id
    db.commit()
    return {"decision_id": str(decision.id), "content_item_id": str(item_id) if item_id else None}

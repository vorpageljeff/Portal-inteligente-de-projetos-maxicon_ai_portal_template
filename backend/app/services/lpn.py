import copy
import uuid
from collections import defaultdict
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.lpn import (
    AiDecisionType,
    AiHumanDecision,
    AiSuggestion,
    ApprovalDecision,
    ApprovalDecisionType,
    ApprovalStep,
    ContentKind,
    Evidence,
    Lpn,
    LpnContentItem,
    LpnContentLink,
    LpnStatus,
    LpnVersion,
    MembershipRole,
    OrganizationMembership,
    ProcessDiagram,
    ProcessType,
    StatusTransition,
    ValidationResult,
    ValidationResultStatus,
    ValidationSeverity,
)

ALLOWED_TRANSITIONS: dict[LpnStatus, set[LpnStatus]] = {
    LpnStatus.DRAFT: {LpnStatus.IN_DISCOVERY, LpnStatus.CANCELLED},
    LpnStatus.IN_DISCOVERY: {
        LpnStatus.WAITING_INFORMATION,
        LpnStatus.AS_IS_VALIDATION,
        LpnStatus.CANCELLED,
    },
    LpnStatus.WAITING_INFORMATION: {LpnStatus.IN_DISCOVERY, LpnStatus.CANCELLED},
    LpnStatus.AS_IS_VALIDATION: {LpnStatus.IN_DISCOVERY, LpnStatus.AS_IS_APPROVED},
    LpnStatus.AS_IS_APPROVED: {LpnStatus.TO_BE_BUILDING},
    LpnStatus.TO_BE_BUILDING: {
        LpnStatus.TO_BE_VALIDATION,
        LpnStatus.WAITING_INFORMATION,
    },
    LpnStatus.TO_BE_VALIDATION: {
        LpnStatus.TO_BE_BUILDING,
        LpnStatus.FUNCTIONAL_REVIEW,
    },
    LpnStatus.FUNCTIONAL_REVIEW: {
        LpnStatus.TO_BE_BUILDING,
        LpnStatus.TECHNICAL_REVIEW,
        LpnStatus.WAITING_APPROVAL,
    },
    LpnStatus.TECHNICAL_REVIEW: {
        LpnStatus.TO_BE_BUILDING,
        LpnStatus.WAITING_APPROVAL,
    },
    LpnStatus.WAITING_APPROVAL: {
        LpnStatus.FUNCTIONAL_REVIEW,
        LpnStatus.APPROVED,
        LpnStatus.REJECTED,
    },
    LpnStatus.REJECTED: {
        LpnStatus.IN_DISCOVERY,
        LpnStatus.TO_BE_BUILDING,
        LpnStatus.CANCELLED,
    },
    LpnStatus.APPROVED: set(),
    LpnStatus.CANCELLED: {LpnStatus.DRAFT},
}


EDIT_ROLES = {
    MembershipRole.ADMIN,
    MembershipRole.MANAGER,
    MembershipRole.BUSINESS_ANALYST,
}


def require_lpn_version(
    db: Session,
    *,
    version_id: uuid.UUID,
    membership: OrganizationMembership,
) -> tuple[Lpn, LpnVersion]:
    row = db.execute(
        select(Lpn, LpnVersion)
        .join(LpnVersion, LpnVersion.lpn_id == Lpn.id)
        .where(
            LpnVersion.id == version_id,
            Lpn.organization_id == membership.organization_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Versão da LPN não encontrada.")
    return row[0], row[1]


def ensure_editable(version: LpnVersion, membership: OrganizationMembership) -> None:
    if membership.role not in EDIT_ROLES:
        raise HTTPException(status_code=403, detail="Perfil sem permissão de edição.")
    if version.status == LpnStatus.APPROVED:
        raise HTTPException(
            status_code=409,
            detail="Versão aprovada é imutável. Crie uma nova versão.",
        )


def run_validation(db: Session, *, version: LpnVersion) -> list[ValidationResult]:
    db.execute(delete(ValidationResult).where(ValidationResult.lpn_version_id == version.id))
    items = list(
        db.scalars(
            select(LpnContentItem).where(LpnContentItem.lpn_version_id == version.id)
        )
    )
    diagrams = list(
        db.scalars(select(ProcessDiagram).where(ProcessDiagram.lpn_version_id == version.id))
    )
    links = list(
        db.scalars(select(LpnContentLink).where(LpnContentLink.lpn_version_id == version.id))
    )
    evidences = list(
        db.scalars(select(Evidence).where(Evidence.lpn_version_id == version.id))
    )
    pending_ai = db.scalar(
        select(func.count())
        .select_from(AiSuggestion)
        .outerjoin(AiHumanDecision, AiHumanDecision.suggestion_id == AiSuggestion.id)
        .where(
            AiSuggestion.lpn_version_id == version.id,
            (AiHumanDecision.id.is_(None)) | (AiHumanDecision.decision == AiDecisionType.PENDING),
        )
    ) or 0

    by_kind: dict[ContentKind, list[LpnContentItem]] = defaultdict(list)
    for item in items:
        by_kind[item.kind].append(item)
    evidence_item_ids = {item.content_item_id for item in evidences if item.content_item_id}
    items_by_id = {item.id: item for item in items}
    linked_to_acceptance = {
        link.source_item_id
        for link in links
        if items_by_id.get(link.target_item_id)
        and items_by_id[link.target_item_id].kind == ContentKind.ACCEPTANCE_CRITERION
    }
    storytelling_fields = {
        "actor",
        "current_situation",
        "problem",
        "consequence",
        "desired_result",
    }

    def valid_diagram(diagram: ProcessDiagram) -> bool:
        lanes = diagram.model.get("lanes", [])
        nodes = diagram.model.get("nodes", [])
        edges = diagram.model.get("edges", [])
        if (
            not isinstance(lanes, list)
            or not isinstance(nodes, list)
            or not isinstance(edges, list)
        ):
            return False
        lane_ids = {lane.get("id") for lane in lanes if isinstance(lane, dict)}
        node_ids = {node.get("id") for node in nodes if isinstance(node, dict)}
        if not lane_ids or not node_ids or None in lane_ids or None in node_ids:
            return False
        if any(node.get("lane_id") not in lane_ids for node in nodes):
            return False
        if any(
            edge.get("source") not in node_ids or edge.get("target") not in node_ids
            for edge in edges
        ):
            return False
        for node in nodes:
            if node.get("type") == "decision":
                outgoing = [edge for edge in edges if edge.get("source") == node.get("id")]
                if len(outgoing) < 2:
                    return False
        return True

    checks: list[tuple[str, ValidationSeverity, bool, str, str]] = [
        (
            "LPN-ATUAL-001",
            ValidationSeverity.BLOCKING,
            bool(by_kind[ContentKind.STORYTELLING])
            and all(
                bool(item.payload.get("description"))
                or storytelling_fields.issubset(item.payload)
                for item in by_kind[ContentKind.STORYTELLING]
            ),
            "Processo atual informado.",
            "Detalhamento do processo atual não informado.",
        ),
        (
            "LPN-OBJ-001",
            ValidationSeverity.BLOCKING,
            bool(by_kind[ContentKind.OBJECTIVE])
            and all(
                item.payload.get("description") for item in by_kind[ContentKind.OBJECTIVE]
            ),
            "Objetivo e resultados esperados informados.",
            "Objetivo e resultados esperados não informados.",
        ),
        (
            "LPN-PROPOSTO-001",
            ValidationSeverity.BLOCKING,
            bool(by_kind[ContentKind.REQUIREMENT])
            and all(
                item.payload.get("description")
                for item in by_kind[ContentKind.REQUIREMENT]
            ),
            "Processo proposto informado.",
            "Detalhamento do processo proposto não informado.",
        ),
        (
            "LPN-FLOW-001",
            ValidationSeverity.BLOCKING,
            any(
                item.process_type == ProcessType.TO_BE and valid_diagram(item)
                for item in diagrams
            ),
            "Fluxo do processo proposto cadastrado.",
            "Diagrama do processo proposto não cadastrado ou inválido.",
        ),
        (
            "LPN-REST-001",
            ValidationSeverity.WARNING,
            all(
                item.id in evidence_item_ids or item.payload.get("evidence_justification")
                for item in by_kind[ContentKind.GAP]
            ),
            "Não existem gaps sem evidência ou justificativa.",
            "Existe gap sem evidência ou justificativa.",
        ),
        (
            "LPN-TRACE-001",
            ValidationSeverity.WARNING,
            all(
                item.id in linked_to_acceptance
                for kind in (ContentKind.REQUIREMENT, ContentKind.BUSINESS_RULE)
                for item in by_kind[kind]
            ),
            "Requisitos e regras estão vinculados aos critérios de aceite.",
            "Requisito ou regra sem vínculo rastreável.",
        ),
        (
            "LPN-AI-001",
            ValidationSeverity.BLOCKING,
            pending_ai == 0,
            "Todas as sugestões da IA possuem decisão humana.",
            "Existe sugestão da IA sem decisão humana.",
        ),
    ]
    results = [
        ValidationResult(
            lpn_version_id=version.id,
            rule_code=code,
            severity=severity,
            status=(
                ValidationResultStatus.PASSED if passed else ValidationResultStatus.FAILED
            ),
            message=success_message if passed else failure_message,
        )
        for code, severity, passed, success_message, failure_message in checks
    ]
    db.add_all(results)
    db.flush()
    return results


def has_blocking_failures(db: Session, *, version_id: uuid.UUID) -> bool:
    count = db.scalar(
        select(func.count())
        .select_from(ValidationResult)
        .where(
            ValidationResult.lpn_version_id == version_id,
            ValidationResult.severity == ValidationSeverity.BLOCKING,
            ValidationResult.status == ValidationResultStatus.FAILED,
        )
    )
    return bool(count)


def transition_version(
    db: Session,
    *,
    lpn: Lpn,
    version: LpnVersion,
    to_status: LpnStatus,
    actor_id: uuid.UUID,
    justification: str | None,
) -> StatusTransition:
    if to_status not in ALLOWED_TRANSITIONS[version.status]:
        raise HTTPException(
            status_code=409,
            detail=f"Transição de {version.status.value} para {to_status.value} não permitida.",
        )
    if to_status in {LpnStatus.WAITING_APPROVAL, LpnStatus.APPROVED}:
        run_validation(db, version=version)
        if has_blocking_failures(db, version_id=version.id):
            raise HTTPException(status_code=409, detail="Existem validações bloqueantes.")
    if to_status == LpnStatus.APPROVED:
        steps = list(
            db.scalars(select(ApprovalStep).where(ApprovalStep.lpn_version_id == version.id))
        )
        if not steps:
            raise HTTPException(status_code=409, detail="Fluxo de aprovação não configurado.")
        for step in steps:
            approvals = db.scalar(
                select(func.count())
                .select_from(ApprovalDecision)
                .where(
                    ApprovalDecision.approval_step_id == step.id,
                    ApprovalDecision.decision == ApprovalDecisionType.APPROVED,
                )
            ) or 0
            if approvals < step.required_approvals:
                raise HTTPException(status_code=409, detail=f"Etapa '{step.name}' ainda pendente.")
    previous = version.status
    version.status = to_status
    transition = StatusTransition(
        lpn_version_id=version.id,
        from_status=previous,
        to_status=to_status,
        actor_id=actor_id,
        justification=justification,
    )
    db.add(transition)
    if to_status == LpnStatus.APPROVED:
        version.approved_at = datetime.utcnow()
        lpn.approved_version_id = version.id
    return transition


def clone_version(
    db: Session,
    *,
    lpn: Lpn,
    source: LpnVersion,
    actor_id: uuid.UUID,
    change_summary: str,
) -> LpnVersion:
    if source.status != LpnStatus.APPROVED:
        raise HTTPException(status_code=409, detail="Somente versão aprovada pode ser clonada.")
    next_number = lpn.current_version_number + 1
    target = LpnVersion(
        lpn_id=lpn.id,
        source_version_id=source.id,
        version_number=next_number,
        status=LpnStatus.DRAFT,
        change_summary=change_summary,
        created_by_id=actor_id,
    )
    db.add(target)
    db.flush()

    source_items = list(
        db.scalars(select(LpnContentItem).where(LpnContentItem.lpn_version_id == source.id))
    )
    item_map: dict[uuid.UUID, LpnContentItem] = {}
    for item in source_items:
        clone = LpnContentItem(
            lpn_version_id=target.id,
            source_item_id=item.id,
            stable_key=item.stable_key,
            kind=item.kind,
            code=item.code,
            title=item.title,
            payload=copy.deepcopy(item.payload),
            sort_order=item.sort_order,
        )
        db.add(clone)
        db.flush()
        item_map[item.id] = clone
    source_links = list(
        db.scalars(select(LpnContentLink).where(LpnContentLink.lpn_version_id == source.id))
    )
    db.add_all(
        [
            LpnContentLink(
                lpn_version_id=target.id,
                source_item_id=item_map[link.source_item_id].id,
                target_item_id=item_map[link.target_item_id].id,
                relationship=link.relationship,
            )
            for link in source_links
        ]
    )
    diagrams = list(
        db.scalars(select(ProcessDiagram).where(ProcessDiagram.lpn_version_id == source.id))
    )
    db.add_all(
        [
            ProcessDiagram(
                lpn_version_id=target.id,
                source_diagram_id=diagram.id,
                process_type=diagram.process_type,
                name=diagram.name,
                model=copy.deepcopy(diagram.model),
            )
            for diagram in diagrams
        ]
    )
    evidences = list(
        db.scalars(select(Evidence).where(Evidence.lpn_version_id == source.id))
    )
    db.add_all(
        [
            Evidence(
                lpn_version_id=target.id,
                attachment_version_id=evidence.attachment_version_id,
                content_item_id=(
                    item_map[evidence.content_item_id].id
                    if evidence.content_item_id in item_map
                    else None
                ),
                description=evidence.description,
            )
            for evidence in evidences
        ]
    )
    lpn.current_version_number = next_number
    return target

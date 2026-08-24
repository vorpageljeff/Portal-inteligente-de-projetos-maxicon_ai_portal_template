# ruff: noqa: E501
"""LPN domain, tenancy, governance and documents.

Revision ID: 202608240001
Revises: 202607300002
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202608240001"
down_revision: str | None = "202607300002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def enum(name: str, *values: str) -> postgresql.ENUM:
    return postgresql.ENUM(*values, name=name, create_type=False)


membership_role = enum(
    "membershiprole",
    "ADMIN", "MANAGER", "BUSINESS_ANALYST", "FUNCTIONAL_REVIEWER",
    "TECHNICAL_REVIEWER", "APPROVER", "CLIENT", "READER",
)
access_scope_type = enum("accessscopetype", "ORGANIZATION", "CLIENT", "PROJECT", "DEMAND")
demand_type = enum(
    "demandtype", "CORRECTION", "IMPROVEMENT", "NEW_FEATURE", "REPORT", "INTEGRATION", "LEGAL"
)
demand_priority = enum("demandpriority", "LOW", "MEDIUM", "HIGH", "CRITICAL")
lpn_status = enum(
    "lpnstatus", "DRAFT", "IN_DISCOVERY", "WAITING_INFORMATION", "AS_IS_VALIDATION",
    "AS_IS_APPROVED", "TO_BE_BUILDING", "TO_BE_VALIDATION", "FUNCTIONAL_REVIEW",
    "TECHNICAL_REVIEW", "WAITING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED",
)
document_status = enum(
    "documentstatus", "NOT_GENERATED", "REQUESTED", "PROCESSING", "GENERATED", "FAILED", "OUTDATED"
)
content_kind = enum(
    "contentkind", "STORYTELLING", "STAKEHOLDER", "GAP", "OBJECTIVE", "REQUIREMENT",
    "BUSINESS_RULE", "SCREEN", "SCREEN_FIELD", "REPORT", "INTEGRATION", "IMPACT",
    "CONSTRAINT", "DEPENDENCY", "SCOPE_EXCLUSION", "ACCEPTANCE_CRITERION", "PENDING_ISSUE",
)
process_type = enum("processtype", "AS_IS", "TO_BE")
validation_severity = enum("validationseverity", "BLOCKING", "WARNING")
validation_result_status = enum("validationresultstatus", "PASSED", "FAILED", "JUSTIFIED")
approval_decision_type = enum(
    "approvaldecisiontype", "APPROVED", "REJECTED", "CHANGES_REQUESTED"
)
ai_decision_type = enum(
    "aidecisiontype", "ACCEPTED", "ACCEPTED_WITH_CHANGES", "REJECTED", "PENDING"
)

ALL_ENUMS = (
    membership_role, access_scope_type, demand_type, demand_priority, lpn_status,
    document_status, content_kind, process_type, validation_severity,
    validation_result_status, approval_decision_type, ai_decision_type,
)


def uuid_column(name: str, *, nullable: bool = False) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def timestamps() -> sa.Column:
    return sa.Column("created_at", sa.DateTime(), nullable=False)


def upgrade() -> None:
    bind = op.get_bind()
    for enum_type in ALL_ENUMS:
        enum_type.create(bind, checkfirst=True)

    op.create_table(
        "organizations",
        uuid_column("id"), sa.Column("name", sa.String(180), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False), timestamps(),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_organizations_name", "organizations", ["name"])
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)

    op.create_table(
        "organization_memberships",
        uuid_column("id"), uuid_column("organization_id"), uuid_column("user_id"),
        sa.Column("role", membership_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False), timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]), sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "user_id"),
    )
    op.create_index("ix_org_memberships_org", "organization_memberships", ["organization_id"])
    op.create_index("ix_org_memberships_user", "organization_memberships", ["user_id"])

    op.create_table(
        "access_scopes",
        uuid_column("id"), uuid_column("membership_id"),
        sa.Column("scope_type", access_scope_type, nullable=False), uuid_column("scope_id"), timestamps(),
        sa.ForeignKeyConstraint(["membership_id"], ["organization_memberships.id"]),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("membership_id", "scope_type", "scope_id"),
    )
    op.create_index("ix_access_scopes_membership", "access_scopes", ["membership_id"])
    op.create_index("ix_access_scopes_scope", "access_scopes", ["scope_id"])

    op.create_table(
        "clients",
        uuid_column("id"), uuid_column("organization_id"),
        sa.Column("name", sa.String(180), nullable=False),
        sa.Column("document_number", sa.String(40), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False), timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("organization_id", "name"),
    )
    op.create_index("ix_clients_org", "clients", ["organization_id"])
    op.create_index("ix_clients_name", "clients", ["name"])

    op.add_column("audit_logs", uuid_column("actor_id", nullable=True))
    op.add_column("audit_logs", uuid_column("organization_id", nullable=True))
    op.add_column("audit_logs", sa.Column("context", sa.JSON(), nullable=True))
    op.create_foreign_key("fk_audit_actor", "audit_logs", "users", ["actor_id"], ["id"])
    op.create_foreign_key(
        "fk_audit_organization", "audit_logs", "organizations", ["organization_id"], ["id"]
    )
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])
    op.create_index("ix_audit_logs_organization_id", "audit_logs", ["organization_id"])

    op.add_column("projects", uuid_column("organization_id", nullable=True))
    op.add_column("projects", uuid_column("client_id", nullable=True))
    op.create_foreign_key("fk_projects_org", "projects", "organizations", ["organization_id"], ["id"])
    op.create_foreign_key("fk_projects_client", "projects", "clients", ["client_id"], ["id"])
    op.create_index("ix_projects_organization_id", "projects", ["organization_id"])
    op.create_index("ix_projects_client_id", "projects", ["client_id"])

    organization_id = "00000000-0000-0000-0000-000000000001"
    op.execute(
        sa.text(
            "INSERT INTO organizations (id, name, slug, is_active, created_at) "
            "VALUES (:id, 'Organização principal', 'principal', true, CURRENT_TIMESTAMP)"
        ).bindparams(id=organization_id)
    )
    op.execute(
        sa.text(
            "INSERT INTO organization_memberships "
            "(id, organization_id, user_id, role, is_active, created_at) "
            "SELECT md5('membership-' || id::text)::uuid, :organization_id, id, "
            "CASE role::text WHEN 'ADMIN' THEN 'ADMIN'::membershiprole "
            "WHEN 'MANAGER' THEN 'MANAGER'::membershiprole "
            "WHEN 'CONSULTANT' THEN 'BUSINESS_ANALYST'::membershiprole "
            "WHEN 'CLIENT' THEN 'CLIENT'::membershiprole ELSE 'READER'::membershiprole END, "
            "true, CURRENT_TIMESTAMP FROM users"
        ).bindparams(organization_id=organization_id)
    )
    op.execute(
        sa.text(
            "INSERT INTO clients (id, organization_id, name, is_active, created_at) "
            "SELECT md5(:organization_id || '-client-' || client_name)::uuid, "
            ":organization_id, client_name, true, CURRENT_TIMESTAMP "
            "FROM projects GROUP BY client_name"
        ).bindparams(organization_id=organization_id)
    )
    op.execute(
        sa.text(
            "UPDATE projects p SET organization_id=:organization_id, client_id=c.id "
            "FROM clients c WHERE c.organization_id=:organization_id AND c.name=p.client_name"
        ).bindparams(organization_id=organization_id)
    )
    op.alter_column("projects", "organization_id", nullable=False)
    op.alter_column("projects", "client_id", nullable=False)

    op.create_table(
        "demands",
        uuid_column("id"), uuid_column("organization_id"), uuid_column("client_id"),
        uuid_column("project_id", nullable=True), sa.Column("title", sa.String(220), nullable=False),
        sa.Column("external_number", sa.String(80), nullable=True),
        sa.Column("business_area", sa.String(120), nullable=False),
        sa.Column("business_process", sa.String(160), nullable=False),
        sa.Column("system_product", sa.String(160), nullable=False),
        sa.Column("requester_name", sa.String(160), nullable=False), uuid_column("analyst_user_id"),
        sa.Column("product_owner_name", sa.String(160), nullable=True),
        sa.Column("priority", demand_priority, nullable=False),
        sa.Column("priority_reason", sa.Text(), nullable=True),
        sa.Column("discovery_date", sa.Date(), nullable=False),
        sa.Column("desired_deadline", sa.Date(), nullable=True),
        sa.Column("demand_type", demand_type, nullable=False), timestamps(),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["analyst_user_id"], ["users.id"]), sa.PrimaryKeyConstraint("id"),
    )
    for column in ("organization_id", "client_id", "project_id", "analyst_user_id", "title", "external_number"):
        op.create_index(f"ix_demands_{column}", "demands", [column])

    op.create_table(
        "lpns", uuid_column("id"), uuid_column("demand_id"), uuid_column("organization_id"),
        sa.Column("current_version_number", sa.Integer(), nullable=False),
        uuid_column("approved_version_id", nullable=True), timestamps(),
        sa.ForeignKeyConstraint(["demand_id"], ["demands.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("demand_id"),
    )
    op.create_index("ix_lpns_demand_id", "lpns", ["demand_id"], unique=True)
    op.create_index("ix_lpns_organization_id", "lpns", ["organization_id"])

    op.create_table(
        "lpn_versions", uuid_column("id"), uuid_column("lpn_id"),
        uuid_column("source_version_id", nullable=True),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("status", lpn_status, nullable=False),
        sa.Column("document_status", document_status, nullable=False),
        sa.Column("change_summary", sa.Text(), nullable=True), uuid_column("created_by_id"),
        sa.Column("approved_at", sa.DateTime(), nullable=True), timestamps(),
        sa.ForeignKeyConstraint(["lpn_id"], ["lpns.id"]),
        sa.ForeignKeyConstraint(["source_version_id"], ["lpn_versions.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("lpn_id", "version_number"),
    )
    op.create_index("ix_lpn_versions_lpn_id", "lpn_versions", ["lpn_id"])
    op.create_index("ix_lpn_versions_source", "lpn_versions", ["source_version_id"])
    op.create_index("ix_lpn_versions_creator", "lpn_versions", ["created_by_id"])
    op.create_foreign_key(
        "fk_lpns_approved_version", "lpns", "lpn_versions", ["approved_version_id"], ["id"],
        use_alter=True,
    )
    op.create_index("ix_lpns_approved_version_id", "lpns", ["approved_version_id"])

    op.create_table(
        "lpn_content_items", uuid_column("id"), uuid_column("lpn_version_id"),
        uuid_column("source_item_id", nullable=True), uuid_column("stable_key"),
        sa.Column("kind", content_kind, nullable=False), sa.Column("code", sa.String(40), nullable=False),
        sa.Column("title", sa.String(220), nullable=False), sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False), timestamps(),
        sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]),
        sa.ForeignKeyConstraint(["source_item_id"], ["lpn_content_items.id"]),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("lpn_version_id", "kind", "code"),
    )
    for column in ("lpn_version_id", "source_item_id", "stable_key", "kind"):
        op.create_index(f"ix_lpn_content_items_{column}", "lpn_content_items", [column])

    op.create_table(
        "lpn_content_links", uuid_column("id"), uuid_column("lpn_version_id"),
        uuid_column("source_item_id"), uuid_column("target_item_id"),
        sa.Column("relationship", sa.String(80), nullable=False), timestamps(),
        sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]),
        sa.ForeignKeyConstraint(["source_item_id"], ["lpn_content_items.id"]),
        sa.ForeignKeyConstraint(["target_item_id"], ["lpn_content_items.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_item_id", "target_item_id", "relationship"),
    )
    for column in ("lpn_version_id", "source_item_id", "target_item_id"):
        op.create_index(f"ix_lpn_content_links_{column}", "lpn_content_links", [column])

    op.create_table(
        "lpn_process_diagrams", uuid_column("id"), uuid_column("lpn_version_id"),
        uuid_column("source_diagram_id", nullable=True),
        sa.Column("process_type", process_type, nullable=False),
        sa.Column("name", sa.String(180), nullable=False), sa.Column("model", sa.JSON(), nullable=False),
        timestamps(), sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]),
        sa.ForeignKeyConstraint(["source_diagram_id"], ["lpn_process_diagrams.id"]),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("lpn_version_id", "process_type"),
    )
    op.create_index("ix_lpn_diagrams_version", "lpn_process_diagrams", ["lpn_version_id"])

    op.create_table(
        "lpn_status_transitions", uuid_column("id"), uuid_column("lpn_version_id"),
        sa.Column("from_status", lpn_status, nullable=False),
        sa.Column("to_status", lpn_status, nullable=False), uuid_column("actor_id"),
        sa.Column("justification", sa.Text(), nullable=True), timestamps(),
        sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]), sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lpn_transitions_version", "lpn_status_transitions", ["lpn_version_id"])

    op.create_table(
        "lpn_validation_rules", uuid_column("id"), sa.Column("code", sa.String(40), nullable=False),
        sa.Column("phase", sa.String(80), nullable=False),
        sa.Column("severity", validation_severity, nullable=False),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column("can_justify", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("code"),
    )
    op.create_index("ix_lpn_validation_rules_code", "lpn_validation_rules", ["code"], unique=True)

    op.create_table(
        "lpn_validation_results", uuid_column("id"), uuid_column("lpn_version_id"),
        sa.Column("rule_code", sa.String(40), nullable=False),
        sa.Column("severity", validation_severity, nullable=False),
        sa.Column("status", validation_result_status, nullable=False),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column("justification", sa.Text(), nullable=True), uuid_column("actor_id", nullable=True),
        timestamps(), sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]), sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lpn_validation_results_version", "lpn_validation_results", ["lpn_version_id"])
    op.create_index("ix_lpn_validation_results_rule", "lpn_validation_results", ["rule_code"])

    op.create_table(
        "lpn_approval_steps", uuid_column("id"), uuid_column("lpn_version_id"),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("step_order", sa.Integer(), nullable=False),
        sa.Column("is_parallel", sa.Boolean(), nullable=False),
        sa.Column("required_approvals", sa.Integer(), nullable=False), timestamps(),
        sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]), sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lpn_approval_steps_version", "lpn_approval_steps", ["lpn_version_id"])
    op.create_table(
        "lpn_approval_assignments", uuid_column("id"), uuid_column("approval_step_id"),
        uuid_column("user_id"), timestamps(),
        sa.ForeignKeyConstraint(["approval_step_id"], ["lpn_approval_steps.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]), sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("approval_step_id", "user_id"),
    )
    op.create_index("ix_lpn_approval_assignments_step", "lpn_approval_assignments", ["approval_step_id"])
    op.create_index("ix_lpn_approval_assignments_user", "lpn_approval_assignments", ["user_id"])
    op.create_table(
        "lpn_approval_decisions", uuid_column("id"), uuid_column("lpn_version_id"),
        uuid_column("approval_step_id"), uuid_column("user_id"),
        sa.Column("decision", approval_decision_type, nullable=False),
        sa.Column("comment", sa.Text(), nullable=True), timestamps(),
        sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]),
        sa.ForeignKeyConstraint(["approval_step_id"], ["lpn_approval_steps.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]), sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("approval_step_id", "user_id"),
    )
    for column in ("lpn_version_id", "approval_step_id", "user_id"):
        op.create_index(f"ix_lpn_approval_decisions_{column}", "lpn_approval_decisions", [column])

    op.create_table(
        "lpn_information_sources", uuid_column("id"), uuid_column("lpn_version_id"),
        sa.Column("source_type", sa.String(60), nullable=False),
        sa.Column("name", sa.String(255), nullable=False), sa.Column("reference", sa.Text(), nullable=True),
        timestamps(), sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lpn_information_sources_version", "lpn_information_sources", ["lpn_version_id"])
    op.create_table(
        "lpn_ai_interactions", uuid_column("id"), uuid_column("lpn_version_id"),
        uuid_column("user_id"), sa.Column("use_case", sa.String(80), nullable=False),
        sa.Column("provider", sa.String(80), nullable=False), sa.Column("model", sa.String(120), nullable=False),
        sa.Column("prompt_version", sa.String(40), nullable=False), sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("response", sa.Text(), nullable=False), timestamps(),
        sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]), sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lpn_ai_interactions_version", "lpn_ai_interactions", ["lpn_version_id"])
    op.create_table(
        "lpn_ai_suggestions", uuid_column("id"), uuid_column("lpn_version_id"),
        uuid_column("interaction_id"), uuid_column("source_id", nullable=True),
        sa.Column("target_kind", content_kind, nullable=False),
        sa.Column("suggested_content", sa.JSON(), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=True), timestamps(),
        sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]),
        sa.ForeignKeyConstraint(["interaction_id"], ["lpn_ai_interactions.id"]),
        sa.ForeignKeyConstraint(["source_id"], ["lpn_information_sources.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lpn_ai_suggestions_version", "lpn_ai_suggestions", ["lpn_version_id"])
    op.create_table(
        "lpn_ai_human_decisions", uuid_column("id"), uuid_column("suggestion_id"),
        uuid_column("user_id"), sa.Column("decision", ai_decision_type, nullable=False),
        sa.Column("final_content", sa.JSON(), nullable=True),
        sa.Column("justification", sa.Text(), nullable=True), timestamps(),
        sa.ForeignKeyConstraint(["suggestion_id"], ["lpn_ai_suggestions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]), sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("suggestion_id"),
    )
    op.create_index("ix_lpn_ai_decisions_suggestion", "lpn_ai_human_decisions", ["suggestion_id"], unique=True)

    op.create_table(
        "lpn_attachments", uuid_column("id"), uuid_column("lpn_id"),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False), timestamps(),
        sa.ForeignKeyConstraint(["lpn_id"], ["lpns.id"]), sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lpn_attachments_lpn_id", "lpn_attachments", ["lpn_id"])
    op.create_table(
        "lpn_attachment_versions", uuid_column("id"), uuid_column("attachment_id"),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(120), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False), uuid_column("uploaded_by_id"), timestamps(),
        sa.ForeignKeyConstraint(["attachment_id"], ["lpn_attachments.id"]),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"]), sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("attachment_id", "version_number"),
    )
    op.create_index("ix_lpn_attachment_versions_attachment", "lpn_attachment_versions", ["attachment_id"])
    op.create_index("ix_lpn_attachment_versions_sha256", "lpn_attachment_versions", ["sha256"])
    op.create_table(
        "lpn_evidences", uuid_column("id"), uuid_column("lpn_version_id"),
        uuid_column("attachment_version_id"), uuid_column("content_item_id", nullable=True),
        sa.Column("description", sa.Text(), nullable=True), timestamps(),
        sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]),
        sa.ForeignKeyConstraint(["attachment_version_id"], ["lpn_attachment_versions.id"]),
        sa.ForeignKeyConstraint(["content_item_id"], ["lpn_content_items.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("lpn_version_id", "attachment_version_id", "content_item_id"):
        op.create_index(f"ix_lpn_evidences_{column}", "lpn_evidences", [column])

    op.create_table(
        "lpn_document_generation_jobs", uuid_column("id"), uuid_column("lpn_version_id"),
        uuid_column("requested_by_id"), sa.Column("formats", sa.JSON(), nullable=False),
        sa.Column("status", document_status, nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True), timestamps(),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]),
        sa.ForeignKeyConstraint(["requested_by_id"], ["users.id"]), sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lpn_document_jobs_version", "lpn_document_generation_jobs", ["lpn_version_id"])
    op.create_table(
        "lpn_generated_documents", uuid_column("id"), uuid_column("job_id"),
        uuid_column("lpn_version_id"), sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(120), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False), timestamps(),
        sa.ForeignKeyConstraint(["job_id"], ["lpn_document_generation_jobs.id"]),
        sa.ForeignKeyConstraint(["lpn_version_id"], ["lpn_versions.id"]), sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lpn_generated_documents_job", "lpn_generated_documents", ["job_id"])
    op.create_index("ix_lpn_generated_documents_version", "lpn_generated_documents", ["lpn_version_id"])
    op.create_index("ix_lpn_generated_documents_sha256", "lpn_generated_documents", ["sha256"])


def downgrade() -> None:
    op.drop_constraint("fk_lpns_approved_version", "lpns", type_="foreignkey")
    for table in (
        "lpn_generated_documents", "lpn_document_generation_jobs", "lpn_evidences",
        "lpn_attachment_versions", "lpn_attachments", "lpn_ai_human_decisions",
        "lpn_ai_suggestions", "lpn_ai_interactions", "lpn_information_sources",
        "lpn_approval_decisions", "lpn_approval_assignments", "lpn_approval_steps",
        "lpn_validation_results", "lpn_validation_rules", "lpn_status_transitions",
        "lpn_process_diagrams", "lpn_content_links", "lpn_content_items", "lpn_versions",
        "lpns", "demands",
    ):
        op.drop_table(table)
    op.drop_index("ix_projects_client_id", table_name="projects")
    op.drop_index("ix_projects_organization_id", table_name="projects")
    op.drop_constraint("fk_projects_client", "projects", type_="foreignkey")
    op.drop_constraint("fk_projects_org", "projects", type_="foreignkey")
    op.drop_column("projects", "client_id")
    op.drop_column("projects", "organization_id")
    op.drop_index("ix_audit_logs_organization_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_actor_id", table_name="audit_logs")
    op.drop_constraint("fk_audit_organization", "audit_logs", type_="foreignkey")
    op.drop_constraint("fk_audit_actor", "audit_logs", type_="foreignkey")
    op.drop_column("audit_logs", "context")
    op.drop_column("audit_logs", "organization_id")
    op.drop_column("audit_logs", "actor_id")
    op.drop_table("access_scopes")
    op.drop_table("organization_memberships")
    op.drop_table("clients")
    op.drop_table("organizations")
    for enum_type in reversed(ALL_ENUMS):
        enum_type.drop(op.get_bind(), checkfirst=True)

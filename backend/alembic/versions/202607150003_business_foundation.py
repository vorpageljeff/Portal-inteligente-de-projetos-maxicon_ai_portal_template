"""business foundation

Revision ID: 202607150003
Revises: 202607150002
Create Date: 2026-07-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202607150003"
down_revision: str | None = "202607150002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

userrole = postgresql.ENUM(
    "ADMIN",
    "MANAGER",
    "CONSULTANT",
    "EXECUTIVE",
    "CLIENT",
    name="userrole",
    create_type=False,
)
organization = postgresql.ENUM(
    "MAXICON",
    "CLIENT",
    "SAP",
    "THIRD_PARTY",
    name="organization",
    create_type=False,
)
workstatus = postgresql.ENUM(
    "TODO",
    "IN_PROGRESS",
    "BLOCKED",
    "DONE",
    "CANCELLED",
    name="workstatus",
    create_type=False,
)
priority = postgresql.ENUM(
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
    name="priority",
    create_type=False,
)
timeentrytype = postgresql.ENUM(
    "BILLABLE",
    "NON_BILLABLE",
    "INTERNAL",
    "SUPPORT",
    "REWORK",
    "MEETING",
    "TRAINING",
    "TRAVEL",
    "IMPLEMENTATION",
    "DEVELOPMENT",
    name="timeentrytype",
    create_type=False,
)
approvalstatus = postgresql.ENUM(
    "DRAFT",
    "SUBMITTED",
    "APPROVED",
    "REJECTED",
    "CORRECTED",
    name="approvalstatus",
    create_type=False,
)
reportstatus = postgresql.ENUM(
    "COLLECTING",
    "DRAFT",
    "IN_REVIEW",
    "APPROVED",
    "PRESENTED",
    "ARCHIVED",
    name="reportstatus",
    create_type=False,
)


def upgrade() -> None:
    for enum_type in (
        userrole,
        organization,
        workstatus,
        priority,
        timeentrytype,
        approvalstatus,
        reportstatus,
    ):
        enum_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", userrole, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("owner_name", sa.String(length=160), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("estimated_hours", sa.Float(), nullable=False),
        sa.Column("progress_percent", sa.Float(), nullable=False),
        sa.Column("status", workstatus, nullable=False),
        sa.Column("priority", priority, nullable=False),
        sa.Column("responsible_org", organization, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasks_project_id", "tasks", ["project_id"])

    op.create_table(
        "deliverables",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("acceptance_criteria", sa.Text(), nullable=False),
        sa.Column("owner_name", sa.String(length=160), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("actual_date", sa.Date(), nullable=True),
        sa.Column("status", workstatus, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_deliverables_project_id", "deliverables", ["project_id"])

    op.create_table(
        "impediments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("affected_activity", sa.String(length=220), nullable=False),
        sa.Column("owner_name", sa.String(length=160), nullable=False),
        sa.Column("responsible_org", organization, nullable=False),
        sa.Column("impact", sa.Text(), nullable=False),
        sa.Column("opened_at", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("status", workstatus, nullable=False),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_impediments_project_id", "impediments", ["project_id"])

    op.create_table(
        "time_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_name", sa.String(length=160), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("hours", sa.Float(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("entry_type", timeentrytype, nullable=False),
        sa.Column("approval_status", approvalstatus, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_time_entries_project_id", "time_entries", ["project_id"])
    op.create_index("ix_time_entries_task_id", "time_entries", ["task_id"])
    op.create_index("ix_time_entries_entry_date", "time_entries", ["entry_date"])

    op.create_table(
        "status_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("status", reportstatus, nullable=False),
        sa.Column("approved_by", sa.String(length=160), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_status_reports_project_id", "status_reports", ["project_id"])
    op.create_index("ix_status_reports_period_start", "status_reports", ["period_start"])
    op.create_index("ix_status_reports_period_end", "status_reports", ["period_end"])

    op.create_table(
        "status_report_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("generated_by", sa.String(length=160), nullable=False),
        sa.Column("ai_provider", sa.String(length=80), nullable=False),
        sa.Column("prompt_version", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["report_id"], ["status_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_status_report_versions_report_id",
        "status_report_versions",
        ["report_id"],
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor", sa.String(length=160), nullable=False),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.String(length=80), nullable=False),
        sa.Column("before_value", sa.Text(), nullable=True),
        sa.Column("after_value", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_actor", "audit_logs", ["actor"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_entity_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_actor", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index("ix_status_report_versions_report_id", table_name="status_report_versions")
    op.drop_table("status_report_versions")
    op.drop_index("ix_status_reports_period_end", table_name="status_reports")
    op.drop_index("ix_status_reports_period_start", table_name="status_reports")
    op.drop_index("ix_status_reports_project_id", table_name="status_reports")
    op.drop_table("status_reports")
    op.drop_index("ix_time_entries_entry_date", table_name="time_entries")
    op.drop_index("ix_time_entries_task_id", table_name="time_entries")
    op.drop_index("ix_time_entries_project_id", table_name="time_entries")
    op.drop_table("time_entries")
    op.drop_index("ix_impediments_project_id", table_name="impediments")
    op.drop_table("impediments")
    op.drop_index("ix_deliverables_project_id", table_name="deliverables")
    op.drop_table("deliverables")
    op.drop_index("ix_tasks_project_id", table_name="tasks")
    op.drop_table("tasks")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    for enum_type in (
        reportstatus,
        approvalstatus,
        timeentrytype,
        priority,
        workstatus,
        organization,
        userrole,
    ):
        enum_type.drop(op.get_bind(), checkfirst=True)

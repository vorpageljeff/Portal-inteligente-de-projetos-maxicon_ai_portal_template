"""dashboard work items

Revision ID: 202607150002
Revises: 202607150001
Create Date: 2026-07-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202607150002"
down_revision: str | None = "202607150001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


milestone_status = postgresql.ENUM(
    "PENDING",
    "DONE",
    "LATE",
    name="milestonestatus",
    create_type=False,
)
risk_severity = postgresql.ENUM(
    "MEDIUM",
    "HIGH",
    "CRITICAL",
    name="riskseverity",
    create_type=False,
)
risk_status = postgresql.ENUM(
    "OPEN",
    "MITIGATING",
    "CLOSED",
    name="riskstatus",
    create_type=False,
)
action_priority = postgresql.ENUM(
    "LOW",
    "MEDIUM",
    "HIGH",
    name="actionpriority",
    create_type=False,
)
action_status = postgresql.ENUM(
    "TODO",
    "IN_PROGRESS",
    "DONE",
    name="actionstatus",
    create_type=False,
)


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("progress_percent", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "projects",
        sa.Column("planned_hours", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "projects",
        sa.Column("actual_hours", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "projects",
        sa.Column("billable_hours", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "projects",
        sa.Column("non_billable_hours", sa.Float(), nullable=False, server_default="0"),
    )

    milestone_status.create(op.get_bind(), checkfirst=True)
    risk_severity.create(op.get_bind(), checkfirst=True)
    risk_status.create(op.get_bind(), checkfirst=True)
    action_priority.create(op.get_bind(), checkfirst=True)
    action_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "milestones",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("status", milestone_status, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_milestones_project_id", "milestones", ["project_id"])

    op.create_table(
        "risks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", risk_severity, nullable=False),
        sa.Column("status", risk_status, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_risks_project_id", "risks", ["project_id"])

    op.create_table(
        "action_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("priority", action_priority, nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("status", action_status, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_action_items_project_id", "action_items", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_action_items_project_id", table_name="action_items")
    op.drop_table("action_items")
    op.drop_index("ix_risks_project_id", table_name="risks")
    op.drop_table("risks")
    op.drop_index("ix_milestones_project_id", table_name="milestones")
    op.drop_table("milestones")

    action_status.drop(op.get_bind(), checkfirst=True)
    action_priority.drop(op.get_bind(), checkfirst=True)
    risk_status.drop(op.get_bind(), checkfirst=True)
    risk_severity.drop(op.get_bind(), checkfirst=True)
    milestone_status.drop(op.get_bind(), checkfirst=True)

    op.drop_column("projects", "non_billable_hours")
    op.drop_column("projects", "billable_hours")
    op.drop_column("projects", "actual_hours")
    op.drop_column("projects", "planned_hours")
    op.drop_column("projects", "progress_percent")

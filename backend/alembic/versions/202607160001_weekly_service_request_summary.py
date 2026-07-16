"""weekly service request summary

Revision ID: 202607160001
Revises: 202607150003
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202607160001"
down_revision: str | None = "202607150003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "weekly_service_request_summaries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("project_requests", sa.Integer(), nullable=False),
        sa.Column("gap_requests", sa.Integer(), nullable=False),
        sa.Column("adjustment_requests", sa.Integer(), nullable=False),
        sa.Column("open_requests", sa.Integer(), nullable=False),
        sa.Column("completed_requests", sa.Integer(), nullable=False),
        sa.Column("late_requests", sa.Integer(), nullable=False),
        sa.Column("critical_requests", sa.Integer(), nullable=False),
        sa.Column("waiting_maxicon", sa.Integer(), nullable=False),
        sa.Column("waiting_client", sa.Integer(), nullable=False),
        sa.Column("waiting_sap", sa.Integer(), nullable=False),
        sa.Column("highlight_number", sa.String(length=40), nullable=True),
        sa.Column("highlight_subject", sa.String(length=220), nullable=True),
        sa.Column("highlight_owner", sa.String(length=120), nullable=True),
        sa.Column("highlight_due_date", sa.Date(), nullable=True),
        sa.Column("highlight_status", sa.String(length=80), nullable=True),
        sa.Column("highlight_impact", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_weekly_service_request_summaries_project_id",
        "weekly_service_request_summaries",
        ["project_id"],
    )
    op.create_index(
        "ix_weekly_service_request_summaries_period_start",
        "weekly_service_request_summaries",
        ["period_start"],
    )
    op.create_index(
        "ix_weekly_service_request_summaries_period_end",
        "weekly_service_request_summaries",
        ["period_end"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_weekly_service_request_summaries_period_end",
        table_name="weekly_service_request_summaries",
    )
    op.drop_index(
        "ix_weekly_service_request_summaries_period_start",
        table_name="weekly_service_request_summaries",
    )
    op.drop_index(
        "ix_weekly_service_request_summaries_project_id",
        table_name="weekly_service_request_summaries",
    )
    op.drop_table("weekly_service_request_summaries")

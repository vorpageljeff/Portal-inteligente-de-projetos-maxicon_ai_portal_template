"""status cycles

Revision ID: 202607160002
Revises: 202607160001
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202607160002"
down_revision: str | None = "202607160001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

status_cycle_status = postgresql.ENUM(
    "COLLECTING",
    "READY",
    "PRESENTED",
    "APPROVED",
    "ARCHIVED",
    name="statuscyclestatus",
    create_type=False,
)


def upgrade() -> None:
    status_cycle_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "status_cycles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("meeting_date", sa.Date(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("status", status_cycle_status, nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_status_cycles_project_id", "status_cycles", ["project_id"])
    op.create_index("ix_status_cycles_meeting_date", "status_cycles", ["meeting_date"])
    op.create_index("ix_status_cycles_period_start", "status_cycles", ["period_start"])
    op.create_index("ix_status_cycles_period_end", "status_cycles", ["period_end"])


def downgrade() -> None:
    op.drop_index("ix_status_cycles_period_end", table_name="status_cycles")
    op.drop_index("ix_status_cycles_period_start", table_name="status_cycles")
    op.drop_index("ix_status_cycles_meeting_date", table_name="status_cycles")
    op.drop_index("ix_status_cycles_project_id", table_name="status_cycles")
    op.drop_table("status_cycles")
    status_cycle_status.drop(op.get_bind(), checkfirst=True)

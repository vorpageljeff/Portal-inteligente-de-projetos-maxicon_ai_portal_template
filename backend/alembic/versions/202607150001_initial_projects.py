"""initial projects

Revision ID: 202607150001
Revises:
Create Date: 2026-07-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202607150001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


project_status = postgresql.ENUM(
    "PLANNING",
    "ACTIVE",
    "AT_RISK",
    "COMPLETED",
    "CANCELLED",
    name="projectstatus",
    create_type=False,
)


def upgrade() -> None:
    project_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("client_name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("manager_name", sa.String(length=160), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("target_end_date", sa.Date(), nullable=False),
        sa.Column("contracted_hours", sa.Float(), nullable=False),
        sa.Column("status", project_status, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projects_name", "projects", ["name"])
    op.create_index("ix_projects_client_name", "projects", ["client_name"])


def downgrade() -> None:
    op.drop_index("ix_projects_client_name", table_name="projects")
    op.drop_index("ix_projects_name", table_name="projects")
    op.drop_table("projects")
    project_status.drop(op.get_bind(), checkfirst=True)

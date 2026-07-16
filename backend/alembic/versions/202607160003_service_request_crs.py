"""service request crs

Revision ID: 202607160003
Revises: 202607160002
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202607160003"
down_revision: str | None = "202607160002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "weekly_service_request_summaries",
        sa.Column("cr_requests", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("weekly_service_request_summaries", "cr_requests")

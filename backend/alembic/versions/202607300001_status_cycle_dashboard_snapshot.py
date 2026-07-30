"""status cycle dashboard snapshot

Revision ID: 202607300001
Revises: 202607160003
Create Date: 2026-07-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202607300001"
down_revision: str | None = "202607160003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("status_cycles", sa.Column("dashboard_snapshot", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("status_cycles", "dashboard_snapshot")

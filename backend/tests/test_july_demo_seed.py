import importlib.util
import uuid
from datetime import date, datetime
from pathlib import Path

import sqlalchemy as sa


def load_migration():
    migration_path = (
        Path(__file__).parents[1]
        / "alembic"
        / "versions"
        / "202607300002_seed_july_demo_cycles.py"
    )
    spec = importlib.util.spec_from_file_location("seed_july_demo_cycles", migration_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def create_schema(engine: sa.Engine) -> tuple[sa.Table, sa.Table, sa.Table]:
    metadata = sa.MetaData()
    projects = sa.Table(
        "projects",
        metadata,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("client_name", sa.String(160), nullable=False),
        sa.Column("manager_name", sa.String(160)),
        sa.Column("target_end_date", sa.Date(), nullable=False),
        sa.Column("contracted_hours", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    status_cycles = sa.Table(
        "status_cycles",
        metadata,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("meeting_date", sa.Date(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("dashboard_snapshot", sa.JSON()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    audit_logs = sa.Table(
        "audit_logs",
        metadata,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("actor", sa.String(160), nullable=False),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("entity_id", sa.String(80), nullable=False),
        sa.Column("before_value", sa.Text()),
        sa.Column("after_value", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    metadata.create_all(engine)
    return projects, status_cycles, audit_logs


def test_seed_is_idempotent_and_downgrade_preserves_real_cycles(monkeypatch) -> None:
    migration = load_migration()
    engine = sa.create_engine("sqlite://")
    projects, status_cycles, audit_logs = create_schema(engine)
    project_id = uuid.uuid4()
    real_cycle_id = uuid.uuid4()
    original_uuid4 = uuid.uuid4

    with engine.begin() as connection:
        connection.execute(
            projects.insert().values(
                id=project_id,
                name="Implantacao Cotrijal",
                client_name="Cotrijal",
                manager_name="Gerente",
                target_end_date=date(2026, 8, 31),
                contracted_hours=120,
                created_at=datetime(2026, 7, 1),
            )
        )
        connection.execute(
            status_cycles.insert().values(
                id=real_cycle_id,
                project_id=project_id,
                title="Ciclo real",
                meeting_date=date(2026, 7, 30),
                period_start=date(2026, 7, 27),
                period_end=date(2026, 7, 31),
                status="PRESENTED",
                notes=None,
                dashboard_snapshot=None,
                created_at=datetime(2026, 7, 30),
            )
        )
        monkeypatch.setattr(migration.op, "get_bind", lambda: connection)
        monkeypatch.setattr(migration.uuid, "uuid4", lambda: str(original_uuid4()))

        migration.upgrade()
        migration.upgrade()

        demo_cycles = connection.execute(
            sa.select(status_cycles)
            .where(status_cycles.c.notes.like(f"{migration.MARKER}%"))
            .order_by(status_cycles.c.period_end)
        ).mappings().all()
        demo_audits = connection.scalar(
            sa.select(sa.func.count()).select_from(audit_logs)
        )

        assert len(demo_cycles) == 5
        assert demo_audits == 5
        assert [
            cycle["dashboard_snapshot"]["progress_real"] for cycle in demo_cycles
        ] == [22, 41, 60, 78, 96]

        migration.downgrade()

        remaining_cycles = connection.scalars(sa.select(status_cycles.c.id)).all()
        remaining_audits = connection.scalar(
            sa.select(sa.func.count()).select_from(audit_logs)
        )
        assert remaining_cycles == [real_cycle_id]
        assert remaining_audits == 0

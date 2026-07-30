"""seed july demo cycles

Revision ID: 202607300002
Revises: 202607300001
Create Date: 2026-07-30
"""

import json
import uuid
from collections.abc import Sequence
from datetime import date, datetime, timedelta

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine import RowMapping

revision: str = "202607300002"
down_revision: str | None = "202607300001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

MARKER = "mock:july-2026-evolution:v1"
WEEKS = [
    {
        "period_start": date(2026, 6, 29),
        "period_end": date(2026, 7, 3),
        "meeting_date": date(2026, 7, 6),
        "progress": 22,
        "expected": 18,
        "health": 72,
        "executed": 10,
        "cumulative": 10,
        "billable_rate": 70,
        "critical_risks": 2,
        "late_tasks": 3,
    },
    {
        "period_start": date(2026, 7, 6),
        "period_end": date(2026, 7, 10),
        "meeting_date": date(2026, 7, 13),
        "progress": 41,
        "expected": 34,
        "health": 76,
        "executed": 16,
        "cumulative": 26,
        "billable_rate": 75,
        "critical_risks": 2,
        "late_tasks": 2,
    },
    {
        "period_start": date(2026, 7, 13),
        "period_end": date(2026, 7, 17),
        "meeting_date": date(2026, 7, 20),
        "progress": 60,
        "expected": 50,
        "health": 80,
        "executed": 18,
        "cumulative": 44,
        "billable_rate": 83,
        "critical_risks": 1,
        "late_tasks": 2,
    },
    {
        "period_start": date(2026, 7, 20),
        "period_end": date(2026, 7, 24),
        "meeting_date": date(2026, 7, 27),
        "progress": 78,
        "expected": 66,
        "health": 86,
        "executed": 20,
        "cumulative": 64,
        "billable_rate": 85,
        "critical_risks": 1,
        "late_tasks": 1,
    },
    {
        "period_start": date(2026, 7, 27),
        "period_end": date(2026, 7, 31),
        "meeting_date": date(2026, 7, 31),
        "progress": 96,
        "expected": 82,
        "health": 94,
        "executed": 16,
        "cumulative": 80,
        "billable_rate": 88,
        "critical_risks": 0,
        "late_tasks": 0,
    },
]


def build_snapshot(project: RowMapping, week: dict) -> dict:
    executed = float(week["executed"])
    billable_hours = round(executed * week["billable_rate"] / 100, 1)
    travel_hours = 1.0 if executed >= 16 else 0.5
    outside_hours = round(max(executed - billable_hours - travel_hours, 0), 1)
    contracted = float(project["contracted_hours"] or 0)
    balance = contracted - float(week["cumulative"])
    target_end = project["target_end_date"]
    attention_points = [
        f"Progresso acumulado chegou a {week['progress']}% no fechamento.",
        f"{week['late_tasks']} tarefa(s) atrasada(s) permaneceram no ciclo.",
    ]
    if week["critical_risks"]:
        attention_points.append(
            f"{week['critical_risks']} risco(s) critico(s) exigiram acompanhamento."
        )
    else:
        attention_points.append("Nenhum risco critico aberto no fechamento.")

    return {
        "project_id": str(project["id"]),
        "project_name": project["name"],
        "client_name": project["client_name"],
        "manager_name": project["manager_name"],
        "period_start": week["period_start"].isoformat(),
        "period_end": week["period_end"].isoformat(),
        "go_live_date": target_end.isoformat(),
        "days_to_go_live": (target_end - week["period_end"]).days,
        "progress_real": week["progress"],
        "progress_expected": week["expected"],
        "progress_gap": week["progress"] - week["expected"],
        "health_label": "Estavel" if week["health"] >= 80 else "Atencao",
        "health_percent": week["health"],
        "hours": {
            "negotiated": contracted,
            "executed": executed,
            "balance": balance,
            "billable_rate": week["billable_rate"],
            "exceeded": max(-balance, 0),
            "outside_project": outside_hours,
            "travel": travel_hours,
        },
        "monitoring": [
            {
                "label": "Solicitacoes de projeto",
                "value": str(8 - week["late_tasks"]),
                "tone": "neutral",
            },
            {"label": "CRs", "value": str(2 + week["critical_risks"]), "tone": "neutral"},
            {
                "label": "Tarefas atrasadas",
                "value": str(week["late_tasks"]),
                "tone": "warning" if week["late_tasks"] else "positive",
            },
            {
                "label": "Impedimentos abertos",
                "value": str(max(week["late_tasks"] - 1, 0)),
                "tone": "warning" if week["late_tasks"] > 1 else "positive",
            },
            {
                "label": "Riscos criticos",
                "value": str(week["critical_risks"]),
                "tone": "negative" if week["critical_risks"] else "positive",
            },
        ],
        "hours_by_professional": [
            {"label": "Consultor Funcional", "value": round(executed * 0.6, 1)},
            {"label": "Consultor Tecnico", "value": round(executed * 0.4, 1)},
        ],
        "hours_by_month": [{"label": "2026-07", "value": week["cumulative"]}],
        "deliverables_in_progress": [
            {
                "title": f"Pacote de implantacao - {week['progress']}%",
                "status": "in_progress" if week["progress"] < 96 else "done",
                "owner": "Equipe Maxicon",
                "due_date": week["period_end"].isoformat(),
                "progress_percent": week["progress"],
            }
        ],
        "next_steps": [
            {
                "title": "Validar entregas e pendencias da proxima semana",
                "status": "todo",
                "owner": "Gerente do projeto",
                "due_date": (week["period_end"] + timedelta(days=7)).isoformat(),
                "progress_percent": None,
            }
        ],
        "milestones": [
            {
                "title": f"Fechamento demonstrativo de {week['period_end']:%d/%m}",
                "status": "done",
                "owner": "Equipe Maxicon",
                "due_date": week["period_end"].isoformat(),
                "progress_percent": week["progress"],
            }
        ],
        "attention_points": attention_points,
    }


def upgrade() -> None:
    bind = op.get_bind()
    metadata = sa.MetaData()
    projects = sa.Table("projects", metadata, autoload_with=bind)
    status_cycles = sa.Table("status_cycles", metadata, autoload_with=bind)
    audit_logs = sa.Table("audit_logs", metadata, autoload_with=bind)
    project = bind.execute(
        sa.select(projects)
        .where(sa.func.lower(projects.c.name).like("%cotrijal%"))
        .order_by(projects.c.created_at.asc())
        .limit(1)
    ).mappings().first()
    if not project:
        return

    created_at = datetime.utcnow()
    for index, week in enumerate(WEEKS, start=1):
        note = f"{MARKER}:week-{index}"
        snapshot = build_snapshot(project, week)
        existing_id = bind.scalar(
            sa.select(status_cycles.c.id).where(
                status_cycles.c.project_id == project["id"],
                status_cycles.c.notes == note,
            )
        )
        values = {
            "title": f"[DEMO] Evolucao julho - Semana {index}",
            "meeting_date": week["meeting_date"],
            "period_start": week["period_start"],
            "period_end": week["period_end"],
            "status": "PRESENTED",
            "notes": note,
            "dashboard_snapshot": snapshot,
        }
        if existing_id:
            bind.execute(
                status_cycles.update().where(status_cycles.c.id == existing_id).values(**values)
            )
            cycle_id = existing_id
        else:
            cycle_id = uuid.uuid4()
            bind.execute(
                status_cycles.insert().values(
                    id=cycle_id,
                    project_id=project["id"],
                    created_at=created_at + timedelta(seconds=index),
                    **values,
                )
            )
        audit_exists = bind.scalar(
            sa.select(audit_logs.c.id).where(
                audit_logs.c.action == "seed_demo",
                audit_logs.c.entity_type == "status_cycle",
                audit_logs.c.entity_id == str(cycle_id),
            )
        )
        if not audit_exists:
            bind.execute(
                audit_logs.insert().values(
                    id=uuid.uuid4(),
                    actor="system",
                    action="seed_demo",
                    entity_type="status_cycle",
                    entity_id=str(cycle_id),
                    before_value=None,
                    after_value=json.dumps(
                        {"marker": note, "progress_real": week["progress"]},
                        default=str,
                    ),
                    created_at=created_at + timedelta(seconds=index),
                )
            )


def downgrade() -> None:
    bind = op.get_bind()
    metadata = sa.MetaData()
    status_cycles = sa.Table("status_cycles", metadata, autoload_with=bind)
    audit_logs = sa.Table("audit_logs", metadata, autoload_with=bind)
    demo_cycle_ids = [
        str(cycle_id)
        for cycle_id in bind.scalars(
            sa.select(status_cycles.c.id).where(
                status_cycles.c.notes.like(f"{MARKER}%")
            )
        )
    ]
    if demo_cycle_ids:
        bind.execute(
            audit_logs.delete().where(
                audit_logs.c.action == "seed_demo",
                audit_logs.c.entity_type == "status_cycle",
                audit_logs.c.entity_id.in_(demo_cycle_ids),
            )
        )
    bind.execute(status_cycles.delete().where(status_cycles.c.notes.like(f"{MARKER}%")))

from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.operations import (
    ApprovalStatus,
    Deliverable,
    Impediment,
    StatusReport,
    StatusReportVersion,
    Task,
    TimeEntry,
    WorkStatus,
)
from app.models.project import Project
from app.models.security import User
from app.models.work_items import Risk, RiskSeverity, RiskStatus


@dataclass
class StatusReportInput:
    project_name: str
    period_start: date
    period_end: date
    completed_items: list[str]
    ongoing_items: list[str]
    delayed_items: list[str]
    risks: list[str]
    impediments: list[str]
    next_steps: list[str]


class StatusReportService:
    def generate_draft(self, data: StatusReportInput) -> str:
        completed = "; ".join(data.completed_items) or "Nenhuma entrega registrada"
        delayed = "; ".join(data.delayed_items) or "Nenhum atraso critico registrado"
        risks = "; ".join(data.risks) or "Nenhum risco critico registrado"
        next_steps = "; ".join(data.next_steps) or "Atualizar o planejamento da proxima semana"
        return (
            "RASCUNHO GERADO AUTOMATICAMENTE\n\n"
            f"No periodo de {data.period_start:%d/%m/%Y} a {data.period_end:%d/%m/%Y}, "
            f"o projeto {data.project_name} registrou: {completed}. "
            f"Atrasos: {delayed}. Riscos: {risks}. "
            f"Proximos passos: {next_steps}.\n\n"
            "Exige revisao e aprovacao humana."
        )

    def generate_from_project(
        self,
        db: Session,
        *,
        project: Project,
        report: StatusReport,
        actor: User,
    ) -> StatusReportVersion:
        tasks = list(
            db.scalars(
                select(Task).where(
                    Task.project_id == project.id,
                    Task.due_date >= report.period_start,
                    Task.due_date <= report.period_end,
                )
            )
        )
        deliverables = list(
            db.scalars(
                select(Deliverable).where(
                    Deliverable.project_id == project.id,
                    Deliverable.due_date >= report.period_start,
                    Deliverable.due_date <= report.period_end,
                )
            )
        )
        time_entries = list(
            db.scalars(
                select(TimeEntry).where(
                    TimeEntry.project_id == project.id,
                    TimeEntry.entry_date >= report.period_start,
                    TimeEntry.entry_date <= report.period_end,
                    TimeEntry.approval_status == ApprovalStatus.APPROVED,
                )
            )
        )
        risks = list(
            db.scalars(
                select(Risk).where(
                    Risk.project_id == project.id,
                    Risk.status != RiskStatus.CLOSED,
                )
            )
        )
        impediments = list(
            db.scalars(
                select(Impediment).where(
                    Impediment.project_id == project.id,
                    Impediment.status != WorkStatus.DONE,
                )
            )
        )

        total_hours = sum(entry.hours for entry in time_entries)
        billable_hours = sum(
            entry.hours for entry in time_entries if entry.entry_type.value == "billable"
        )
        billable_rate = round((billable_hours / total_hours) * 100) if total_hours else 0
        done_tasks = [task for task in tasks if task.status == WorkStatus.DONE]
        delayed_tasks = [
            task
            for task in tasks
            if task.status != WorkStatus.DONE and task.due_date < report.period_end
        ]
        critical_risks = [risk for risk in risks if risk.severity == RiskSeverity.CRITICAL]
        previous_version = db.scalar(
            select(StatusReportVersion.version_number)
            .where(StatusReportVersion.report_id == report.id)
            .order_by(StatusReportVersion.version_number.desc())
        )
        version_number = (previous_version or 0) + 1

        content = (
            "RASCUNHO GERADO AUTOMATICAMENTE\n\n"
            f"Projeto: {project.name}\n"
            f"Periodo: {report.period_start:%d/%m/%Y} a {report.period_end:%d/%m/%Y}\n"
            f"Progresso informado: {project.progress_percent}%\n"
            f"Horas aprovadas no periodo: {total_hours:.1f}h ({billable_rate}% rentaveis)\n"
            f"Tarefas concluidas: {len(done_tasks)} de {len(tasks)}\n"
            f"Entregas no periodo: {len(deliverables)}\n"
            f"Tarefas atrasadas: {len(delayed_tasks)}\n"
            f"Riscos criticos abertos: {len(critical_risks)}\n"
            f"Impedimentos abertos: {len(impediments)}\n\n"
            "Evidencias consideradas:\n"
            f"- Tarefas: {', '.join(task.title for task in tasks) or 'nenhuma'}\n"
            f"- Entregas: {', '.join(item.title for item in deliverables) or 'nenhuma'}\n"
            f"- Riscos: {', '.join(risk.title for risk in risks) or 'nenhum'}\n"
            "- Impedimentos: "
            f"{', '.join(item.affected_activity for item in impediments) or 'nenhum'}\n\n"
            "Status: rascunho. Exige revisao, aprovacao humana e nova versao em caso de ajuste."
        )
        version = StatusReportVersion(
            report_id=report.id,
            version_number=version_number,
            content=content,
            generated_by=actor.email,
            ai_provider=settings.ai_provider,
        )
        db.add(version)
        return version

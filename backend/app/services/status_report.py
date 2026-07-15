from dataclasses import dataclass
from datetime import date


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

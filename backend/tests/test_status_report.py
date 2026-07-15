from datetime import date

from app.services.status_report import StatusReportInput, StatusReportService


def test_status_report_draft_requires_human_review() -> None:
    payload = StatusReportInput(
        project_name="Implantacao Cotrijal - Demonstracao",
        period_start=date(2026, 7, 6),
        period_end=date(2026, 7, 10),
        completed_items=["Treinamento key users"],
        ongoing_items=[],
        delayed_items=["Homologacao fiscal"],
        risks=["Disponibilidade de agenda do cliente"],
        impediments=[],
        next_steps=["Validar cutover"],
    )

    draft = StatusReportService().generate_draft(payload)

    assert "RASCUNHO GERADO AUTOMATICAMENTE" in draft
    assert "revisao" in draft.lower() or "revisão" in draft.lower()
    assert "Implantacao Cotrijal" in draft

from collections.abc import Generator

import pytest
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import *  # noqa: F403
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def authenticate(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/bootstrap-admin",
        json={
            "email": "admin@maxicon.com.br",
            "full_name": "Admin Maxicon",
            "password": "senha-forte-123",
        },
    )
    assert response.status_code == 201

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@maxicon.com.br", "password": "senha-forte-123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_project(client: TestClient, headers: dict[str, str]) -> str:
    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "name": "Implantacao Cotrijal",
            "client_name": "Cotrijal",
            "description": "Projeto demonstrativo auditavel.",
            "manager_name": "Jefferson",
            "start_date": "2026-07-01",
            "target_end_date": "2026-08-31",
            "contracted_hours": 240,
            "progress_percent": 40,
            "planned_hours": 120,
            "actual_hours": 0,
            "billable_hours": 0,
            "non_billable_hours": 0,
            "status": "active",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_api_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/projects")

    assert response.status_code == 401


def test_admin_can_create_user_and_regular_user_cannot(client: TestClient) -> None:
    admin_headers = authenticate(client)
    payload = {
        "email": "consultor@maxicon.com.br",
        "full_name": "Consultor Maxicon",
        "password": "senha-forte-456",
        "role": "consultant",
    }

    response = client.post("/api/v1/auth/users", headers=admin_headers, json=payload)

    assert response.status_code == 201
    assert response.json()["role"] == "consultant"

    duplicate_response = client.post("/api/v1/auth/users", headers=admin_headers, json=payload)
    assert duplicate_response.status_code == 409

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login_response.status_code == 200
    consultant_headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}",
    }

    forbidden_response = client.post(
        "/api/v1/auth/users",
        headers=consultant_headers,
        json={
            "email": "outro@maxicon.com.br",
            "full_name": "Outro Usuario",
            "password": "senha-forte-789",
            "role": "manager",
        },
    )
    assert forbidden_response.status_code == 403


def test_status_report_uses_persisted_business_records(client: TestClient) -> None:
    headers = authenticate(client)
    project_id = create_project(client, headers)

    task_response = client.post(
        f"/api/v1/operations/projects/{project_id}/tasks",
        headers=headers,
        json={
            "title": "Configurar integracao fiscal",
            "owner_name": "Consultor Maxicon",
            "start_date": "2026-07-06",
            "due_date": "2026-07-10",
            "estimated_hours": 12,
            "progress_percent": 100,
            "status": "done",
            "priority": "high",
            "responsible_org": "maxicon",
        },
    )
    assert task_response.status_code == 201

    time_response = client.post(
        f"/api/v1/operations/projects/{project_id}/time-entries",
        headers=headers,
        json={
            "task_id": task_response.json()["id"],
            "user_name": "Consultor Maxicon",
            "entry_date": "2026-07-08",
            "hours": 4,
            "description": "Parametrizacao validada com key users.",
            "entry_type": "billable",
            "approval_status": "approved",
        },
    )
    assert time_response.status_code == 201

    request_summary_response = client.post(
        f"/api/v1/operations/projects/{project_id}/service-request-summaries",
        headers=headers,
        json={
            "period_start": "2026-07-06",
            "period_end": "2026-07-10",
            "project_requests": 7,
            "cr_requests": 4,
            "gap_requests": 2,
            "adjustment_requests": 3,
            "open_requests": 4,
            "completed_requests": 3,
            "late_requests": 1,
            "critical_requests": 1,
            "waiting_maxicon": 2,
            "waiting_client": 1,
            "waiting_sap": 1,
            "highlight_number": "225135",
            "highlight_subject": "Ajustes de contrato e ordem de venda",
            "highlight_owner": "Maxicon",
            "highlight_due_date": "2026-07-10",
            "highlight_status": "Em tratativa",
            "highlight_impact": "Pode afetar aceite do pacote.",
        },
    )
    assert request_summary_response.status_code == 201
    assert request_summary_response.json()["total_requests"] == 16

    action_response = client.post(
        f"/api/v1/dashboard/projects/{project_id}/actions",
        headers=headers,
        json={
            "title": "Alinhar pendencias da semana",
            "priority": "high",
            "due_date": "2026-07-10",
            "status": "todo",
        },
    )
    assert action_response.status_code == 201
    action_id = action_response.json()["id"]

    move_action_response = client.patch(
        f"/api/v1/dashboard/projects/{project_id}/actions/{action_id}",
        headers=headers,
        json={"status": "in_progress"},
    )
    assert move_action_response.status_code == 200
    assert move_action_response.json()["status"] == "in_progress"

    cycle_response = client.post(
        f"/api/v1/operations/projects/{project_id}/status-cycles",
        headers=headers,
        json={
            "title": "Status semanal Cotrijal",
            "meeting_date": "2026-07-11",
            "period_start": "2026-07-06",
            "period_end": "2026-07-10",
            "status": "collecting",
            "notes": "Periodo ajustado pela reuniao semanal.",
        },
    )
    assert cycle_response.status_code == 201
    cycle_id = cycle_response.json()["id"]

    report_response = client.post(
        "/api/v1/status-reports",
        headers=headers,
        json={
            "project_id": project_id,
            "period_start": "2026-07-06",
            "period_end": "2026-07-10",
        },
    )
    assert report_response.status_code == 201
    report = report_response.json()
    assert report["status"] == "draft"
    assert "Horas aprovadas no periodo: 4.0h" in report["latest_content"]
    assert "Configurar integracao fiscal" in report["latest_content"]
    assert "Solicitacoes da semana:" in report["latest_content"]
    assert "- Projeto: 7" in report["latest_content"]
    assert "- CRs: 4" in report["latest_content"]
    assert "#225135" in report["latest_content"]

    approve_response = client.post(
        f"/api/v1/status-reports/{report['id']}/approve",
        headers=headers,
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "approved"

    later_time_response = client.post(
        f"/api/v1/operations/projects/{project_id}/time-entries",
        headers=headers,
        json={
            "task_id": task_response.json()["id"],
            "user_name": "Outro consultor",
            "entry_date": "2026-07-09",
            "hours": 3,
            "description": "Apontamento lancado depois da apresentacao.",
            "entry_type": "billable",
            "approval_status": "approved",
        },
    )
    assert later_time_response.status_code == 201

    weekly_response = client.get(
        f"/api/v1/dashboard/weekly-status/{project_id}?status_cycle_id={cycle_id}",
        headers=headers,
    )
    assert weekly_response.status_code == 200
    weekly = weekly_response.json()
    assert weekly["project_name"] == "Implantacao Cotrijal"
    assert weekly["period_start"] == "2026-07-06"
    assert weekly["period_end"] == "2026-07-10"
    assert weekly["days_to_go_live"] == 52
    assert weekly["hours"]["executed"] == 4
    assert weekly["hours"]["billable_rate"] == 100
    assert any(
        item["label"] == "Solicitacoes de projeto" and item["value"] == "7"
        for item in weekly["monitoring"]
    )
    assert any(item["label"] == "CRs" and item["value"] == "4" for item in weekly["monitoring"])
    assert any(
        item["label"] == "Criticas" and item["value"] == "1"
        for item in weekly["monitoring"]
    )
    assert any("#225135" in point for point in weekly["attention_points"])
    assert any(item["status"] == "in_progress" for item in weekly["next_steps"])

    create_consultant_response = client.post(
        "/api/v1/auth/users",
        headers=headers,
        json={
            "email": "retroativo@maxicon.com.br",
            "full_name": "Consultor Retroativo",
            "password": "senha-forte-987",
            "role": "consultant",
        },
    )
    assert create_consultant_response.status_code == 201
    consultant_login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "retroativo@maxicon.com.br", "password": "senha-forte-987"},
    )
    consultant_headers = {
        "Authorization": f"Bearer {consultant_login_response.json()['access_token']}",
    }
    forbidden_rebuild_response = client.post(
        f"/api/v1/operations/projects/{project_id}/status-cycles/{cycle_id}/rebuild-snapshot",
        headers=consultant_headers,
    )
    assert forbidden_rebuild_response.status_code == 403

    rebuild_response = client.post(
        f"/api/v1/operations/projects/{project_id}/status-cycles/{cycle_id}/rebuild-snapshot",
        headers=headers,
    )
    assert rebuild_response.status_code == 200
    assert rebuild_response.json()["snapshot"]["hours"]["executed"] == 7

    rebuilt_weekly_response = client.get(
        f"/api/v1/dashboard/weekly-status/{project_id}?status_cycle_id={cycle_id}",
        headers=headers,
    )
    assert rebuilt_weekly_response.status_code == 200
    assert rebuilt_weekly_response.json()["hours"]["executed"] == 7

    cycles_response = client.get(
        f"/api/v1/operations/projects/{project_id}/status-cycles",
        headers=headers,
    )
    assert cycles_response.status_code == 200
    assert cycles_response.json()[0]["status"] == "presented"

    update_project_response = client.patch(
        f"/api/v1/projects/{project_id}",
        headers=headers,
        json={
            "name": "Implantacao Cotrijal",
            "client_name": "Cotrijal",
            "description": "Projeto demonstrativo auditavel.",
            "manager_name": "Jefferson",
            "start_date": "2026-07-01",
            "target_end_date": "2026-08-31",
            "contracted_hours": 240,
            "progress_percent": 55,
            "planned_hours": 120,
            "actual_hours": 7,
            "billable_hours": 7,
            "non_billable_hours": 0,
            "status": "active",
        },
    )
    assert update_project_response.status_code == 200

    second_cycle_response = client.post(
        f"/api/v1/operations/projects/{project_id}/status-cycles",
        headers=headers,
        json={
            "title": "Status semanal Cotrijal 2",
            "meeting_date": "2026-07-18",
            "period_start": "2026-07-13",
            "period_end": "2026-07-17",
            "status": "collecting",
        },
    )
    assert second_cycle_response.status_code == 201
    second_cycle_id = second_cycle_response.json()["id"]

    second_report_response = client.post(
        "/api/v1/status-reports",
        headers=headers,
        json={
            "project_id": project_id,
            "period_start": "2026-07-13",
            "period_end": "2026-07-17",
        },
    )
    assert second_report_response.status_code == 201
    second_approve_response = client.post(
        f"/api/v1/status-reports/{second_report_response.json()['id']}/approve",
        headers=headers,
    )
    assert second_approve_response.status_code == 200

    first_cycle_history = client.get(
        f"/api/v1/dashboard/cycle-history/{project_id}?status_cycle_id={cycle_id}",
        headers=headers,
    )
    assert first_cycle_history.status_code == 200
    assert [point["progress_percent"] for point in first_cycle_history.json()] == [40]

    second_cycle_history = client.get(
        f"/api/v1/dashboard/cycle-history/{project_id}?status_cycle_id={second_cycle_id}",
        headers=headers,
    )
    assert second_cycle_history.status_code == 200
    assert [point["progress_percent"] for point in second_cycle_history.json()] == [40, 55]

    second_weekly_response = client.get(
        f"/api/v1/dashboard/weekly-status/{project_id}?status_cycle_id={second_cycle_id}",
        headers=headers,
    )
    assert second_weekly_response.status_code == 200
    assert second_weekly_response.json()["hours"]["executed"] == 0
    assert second_weekly_response.json()["hours"]["balance"] == 233


def test_backend_rejects_invalid_operational_rules(client: TestClient) -> None:
    headers = authenticate(client)
    project_id = create_project(client, headers)

    invalid_deliverable = client.post(
        f"/api/v1/operations/projects/{project_id}/deliverables",
        headers=headers,
        json={
            "title": "Entrega concluida sem data",
            "acceptance_criteria": "Aceite formal registrado",
            "owner_name": "Gerente",
            "due_date": "2026-07-10",
            "status": "done",
        },
    )
    assert invalid_deliverable.status_code == 422

    invalid_impediment = client.post(
        f"/api/v1/operations/projects/{project_id}/impediments",
        headers=headers,
        json={
            "description": "Dependencia externa",
            "affected_activity": "Homologacao",
            "owner_name": "Cliente",
            "responsible_org": "client",
            "impact": "Bloqueia aceite",
            "opened_at": "2026-07-10",
            "due_date": "2026-07-09",
            "status": "blocked",
        },
    )
    assert invalid_impediment.status_code == 422

    invalid_time_entry = client.post(
        f"/api/v1/operations/projects/{project_id}/time-entries",
        headers=headers,
        json={
            "task_id": "00000000-0000-0000-0000-000000000000",
            "user_name": "Consultor",
            "entry_date": "2026-07-08",
            "hours": 2,
            "description": "Apontamento em tarefa inexistente",
            "entry_type": "billable",
            "approval_status": "approved",
        },
    )
    assert invalid_time_entry.status_code == 404

    invalid_request_summary = client.post(
        f"/api/v1/operations/projects/{project_id}/service-request-summaries",
        headers=headers,
        json={
            "period_start": "2026-07-10",
            "period_end": "2026-07-09",
            "project_requests": 1,
        },
    )
    assert invalid_request_summary.status_code == 422


def test_ai_intake_mock_preview_and_apply(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "ai_provider", "mock")
    headers = authenticate(client)
    project_id = create_project(client, headers)

    preview_response = client.post(
        "/api/v1/ai/intake-preview",
        headers=headers,
        json={
            "project_id": project_id,
            "prompt": (
                "Reuniao semanal do projeto Cotrijal com solicitacoes, riscos, "
                "acoes e horas para preencher o portal."
            ),
        },
    )
    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert preview["provider"] == "mock"
    assert preview["draft"]["status_cycle"]["title"].startswith("Status semanal")
    preview["draft"].update(
        {
            "progress_percent": 55,
            "status_cycle": {
                "title": "Status semanal completo",
                "meeting_date": "2026-07-31",
                "period_start": "2026-07-27",
                "period_end": "2026-07-31",
                "notes": "Ciclo gerado e revisado com IA.",
            },
            "service_requests": {
                "project_requests": 2,
                "cr_requests": 1,
                "gap_requests": 1,
                "adjustment_requests": 0,
                "open_requests": 2,
                "completed_requests": 2,
                "late_requests": 1,
                "critical_requests": 1,
                "waiting_maxicon": 0,
                "waiting_client": 1,
                "waiting_sap": 1,
                "highlight_number": "SR-1042",
                "highlight_subject": "Credenciais bancarias",
                "highlight_owner": "Ana Souza",
                "highlight_due_date": "2026-08-04",
                "highlight_status": "aguardando cliente",
                "highlight_impact": "Alto",
            },
            "tasks": [
                {
                    "title": "Concluir testes bancarios",
                    "owner_name": "Carlos Almeida",
                    "start_date": "2026-07-27",
                    "due_date": "2026-07-31",
                    "estimated_hours": 16,
                    "progress_percent": 60,
                    "status": "in_progress",
                    "priority": "high",
                    "responsible_org": "maxicon",
                }
            ],
            "deliverables": [
                {
                    "title": "Integracao bancaria",
                    "acceptance_criteria": "Arquivo de retorno validado sem erros.",
                    "owner_name": "Carlos Almeida",
                    "due_date": "2026-07-31",
                    "actual_date": None,
                    "status": "in_progress",
                }
            ],
            "impediments": [
                {
                    "description": "Credenciais bancarias pendentes",
                    "affected_activity": "Testes bancarios",
                    "owner_name": "Ana Souza",
                    "responsible_org": "client",
                    "impact": "Alto no go-live",
                    "opened_at": "2026-07-29",
                    "due_date": "2026-08-04",
                    "status": "blocked",
                    "resolution": None,
                }
            ],
            "milestones": [
                {
                    "title": "Homologacao bancaria",
                    "due_date": "2026-07-31",
                    "status": "pending",
                }
            ],
            "actions": [
                {
                    "title": "Enviar credenciais bancarias",
                    "priority": "high",
                    "due_date": "2026-08-04",
                    "status": "todo",
                }
            ],
            "risks": [
                {
                    "title": "Credenciais nao recebidas",
                    "description": "Pode atrasar os testes.",
                    "severity": "critical",
                    "status": "open",
                }
            ],
            "time_entries": [
                {
                    "user_name": "Carlos Almeida",
                    "entry_date": "2026-07-31",
                    "hours": 8,
                    "description": "Testes bancarios",
                    "entry_type": "billable",
                }
            ],
        }
    )

    apply_response = client.post(
        "/api/v1/ai/intake-apply",
        headers=headers,
        json={"project_id": project_id, "draft": preview["draft"]},
    )
    assert apply_response.status_code == 201
    result = apply_response.json()
    assert result["status_cycle_id"]
    assert result["service_request_summary_id"]
    assert len(result["task_ids"]) == 1
    assert len(result["deliverable_ids"]) == 1
    assert len(result["impediment_ids"]) == 1
    assert len(result["milestone_ids"]) == 1
    assert len(result["action_ids"]) == 1
    assert len(result["risk_ids"]) == 1
    assert len(result["time_entry_ids"]) == 1

    project = client.get(f"/api/v1/projects/{project_id}", headers=headers).json()
    assert project["progress_percent"] == 55
    assert project["actual_hours"] == 8
    assert project["billable_hours"] == 8

    dashboard_response = client.get(
        f"/api/v1/dashboard/weekly-status/{project_id}",
        headers=headers,
        params={"status_cycle_id": result["status_cycle_id"]},
    )
    assert dashboard_response.status_code == 200
    dashboard = dashboard_response.json()
    assert dashboard["progress_real"] == 55
    assert dashboard["hours"]["executed"] == 8
    assert dashboard["deliverables_in_progress"][0]["title"] == "Integracao bancaria"
    assert dashboard["milestones"][0]["title"] == "Homologacao bancaria"

from collections.abc import Generator

import pytest
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

    approve_response = client.post(
        f"/api/v1/status-reports/{report['id']}/approve",
        headers=headers,
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "approved"


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

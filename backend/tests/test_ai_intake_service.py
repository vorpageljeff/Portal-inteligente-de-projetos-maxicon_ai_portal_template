from types import SimpleNamespace

import httpx
import pytest
from app.core.config import settings
from app.schemas.ai import AiClarificationAnswer, AiIntakeAnalysis, AiValidationQuestion
from app.services.ai_intake import AiIntakeError, AiIntakeService


def test_extract_output_from_interactions_rest_steps() -> None:
    raw = {
        "id": "int_test",
        "status": "completed",
        "steps": [
            {
                "type": "user_input",
                "content": [{"type": "text", "text": "Entrada"}],
            },
            {
                "type": "model_output",
                "status": "done",
                "content": [
                    {
                        "type": "text",
                        "text": '{"summary":"Rascunho estruturado"}',
                    }
                ],
            },
        ],
    }

    assert (
        AiIntakeService()._extract_output(raw)
        == '{"summary":"Rascunho estruturado"}'
    )


def test_extract_output_rejects_response_without_model_text() -> None:
    raw = {
        "id": "int_test",
        "status": "failed",
        "steps": [{"type": "user_input", "content": []}],
    }

    with pytest.raises(AiIntakeError, match="sem conteudo textual"):
        AiIntakeService()._extract_output(raw)


def test_extract_output_from_generate_content_candidates() -> None:
    raw = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": '{"summary":"Rascunho via generateContent"}'}],
                }
            }
        ]
    }

    assert (
        AiIntakeService()._extract_output(raw)
        == '{"summary":"Rascunho via generateContent"}'
    )


def test_gemini_uses_generate_content_with_structured_output(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}
    project = SimpleNamespace(name="Projeto Teste", client_name="Cliente Teste")
    draft = AiIntakeService()._mock(project=project, prompt="Texto de teste")
    expected = AiIntakeAnalysis(
        status="ready",
        analysis="Dados suficientes para montar o ciclo.",
        draft=draft,
    )

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured["json"] = kwargs["json"]
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": expected.model_dump_json()}],
                        }
                    }
                ]
            },
            request=request,
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(settings, "ai_model", "gemini-3.5-flash")
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")

    result = AiIntakeService()._from_gemini(
        project=project,
        prompt="Resumo semanal suficientemente longo para o teste.",
    )

    assert captured["url"].endswith(
        "/v1beta/models/gemini-3.5-flash:generateContent"
    )
    generation_config = captured["json"]["generationConfig"]
    assert generation_config["responseMimeType"] == "application/json"
    assert generation_config["responseJsonSchema"]["type"] == "object"
    assert "responseFormat" not in generation_config
    assert result.status == "ready"
    assert result.draft is not None
    assert result.draft.summary == draft.summary


def test_gemini_returns_questions_without_releasing_incomplete_draft(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}
    project = SimpleNamespace(name="Projeto Teste", client_name="Cliente Teste")
    expected = AiIntakeAnalysis(
        status="needs_information",
        analysis="A data da reuniao nao foi informada.",
        questions=[
            AiValidationQuestion(
                field="meeting_date",
                question="Qual foi a data da reuniao?",
                reason="A data identifica o ciclo no portal.",
                expected_format="DD/MM/AAAA",
            )
        ],
        draft=None,
    )

    def fake_post(url, **kwargs):
        captured["instruction"] = kwargs["json"]["contents"][0]["parts"][0]["text"]
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {"content": {"parts": [{"text": expected.model_dump_json()}]}}
                ]
            },
            request=request,
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(settings, "ai_model", "gemini-3.5-flash")
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")

    result = AiIntakeService()._from_gemini(
        project=project,
        prompt="A semana teve evolucao, mas ainda faltam os dados do ciclo.",
        clarifications=[
            AiClarificationAnswer(
                field="progress_percent",
                question="Qual e o progresso acumulado?",
                answer="O progresso atual e 78%.",
            )
        ],
    )

    assert result.status == "needs_information"
    assert result.draft is None
    assert result.questions[0].field == "meeting_date"
    assert "O progresso atual e 78%." in captured["instruction"]


def test_gemini_read_timeout_returns_actionable_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request = httpx.Request(
        "POST",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
    )

    def raise_timeout(*args, **kwargs):
        raise httpx.ReadTimeout("timeout", request=request)

    monkeypatch.setattr(httpx, "post", raise_timeout)
    monkeypatch.setattr(settings, "ai_timeout_seconds", 120)

    project = SimpleNamespace(name="Projeto Teste", client_name="Cliente Teste")
    with pytest.raises(AiIntakeError, match="demorou mais que o limite"):
        AiIntakeService()._from_gemini(
            project=project,
            prompt="Resumo semanal suficientemente longo para o teste.",
        )


def test_gemini_falls_back_to_flash_lite_when_primary_is_busy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project = SimpleNamespace(name="Projeto Teste", client_name="Cliente Teste")
    draft = AiIntakeService()._mock(project=project, prompt="Texto de teste")
    expected = AiIntakeAnalysis(
        status="ready",
        analysis="Dados suficientes para montar o ciclo.",
        draft=draft,
    )
    requested_urls: list[str] = []

    def fake_post(url, **kwargs):
        requested_urls.append(url)
        request = httpx.Request("POST", url)
        if url.endswith("/gemini-3.5-flash:generateContent"):
            return httpx.Response(
                503,
                json={"error": {"message": "high demand"}},
                request=request,
            )
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": expected.model_dump_json()}],
                        }
                    }
                ]
            },
            request=request,
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(settings, "ai_model", "gemini-3.5-flash")

    result = AiIntakeService()._from_gemini(
        project=project,
        prompt="Resumo semanal suficientemente longo para o teste.",
    )

    assert requested_urls[0].endswith("/gemini-3.5-flash:generateContent")
    assert requested_urls[1].endswith("/gemini-3.5-flash-lite:generateContent")
    assert result.status == "ready"
    assert result.draft is not None
    assert result.draft.summary == draft.summary

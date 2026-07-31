from types import SimpleNamespace

import httpx
import pytest
from app.core.config import settings
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
    expected = AiIntakeService()._mock(project=project, prompt="Texto de teste")

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
    assert result.summary == expected.summary


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
    expected = AiIntakeService()._mock(project=project, prompt="Texto de teste")
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
    assert result.summary == expected.summary

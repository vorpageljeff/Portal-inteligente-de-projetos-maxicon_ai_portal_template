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


def test_gemini_read_timeout_returns_actionable_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request = httpx.Request(
        "POST",
        "https://generativelanguage.googleapis.com/v1beta/interactions",
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

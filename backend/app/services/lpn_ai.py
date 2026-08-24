import json
from typing import Any

import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.models.lpn import ContentKind
from app.schemas.lpn import (
    LpnAiOutput,
    LpnAiQuestion,
    LpnAiSuggestionDraft,
)


class LpnAiError(RuntimeError):
    pass


class LpnAiService:
    prompt_version = "lpn-v1"

    def analyze(self, *, use_case: ContentKind, input_text: str) -> tuple[str, str, LpnAiOutput]:
        provider = settings.ai_provider.lower()
        if provider == "gemini" and (settings.gemini_api_key or settings.ai_api_key):
            model = settings.ai_model or "gemini-3.5-flash"
            return "gemini", model, self._gemini(
                use_case=use_case,
                input_text=input_text,
                model=model,
            )
        return "mock", "local-rules", self._mock(use_case=use_case, input_text=input_text)

    def _mock(self, *, use_case: ContentKind, input_text: str) -> LpnAiOutput:
        if len(input_text.strip()) < 40:
            return LpnAiOutput(
                status="needs_information",
                analysis="O relato ainda não contém contexto suficiente para uma sugestão segura.",
                questions=[
                    LpnAiQuestion(
                        question="Qual é o comportamento atual, o problema e o resultado esperado?",
                        reason=(
                            "Esses elementos evitam que a sugestão complete informações "
                            "por inferência."
                        ),
                    )
                ],
            )
        return LpnAiOutput(
            status="ready",
            analysis="Rascunho estruturado para revisão humana.",
            suggestions=[
                LpnAiSuggestionDraft(
                    kind=use_case,
                    title=f"Sugestão de {use_case.value.replace('_', ' ')}",
                    payload={
                        "description": input_text.strip(),
                        "origin": "suggested_by_ai",
                        "requires_human_validation": True,
                    },
                    confidence=45,
                )
            ],
        )

    def _gemini(
        self,
        *,
        use_case: ContentKind,
        input_text: str,
        model: str,
    ) -> LpnAiOutput:
        schema = LpnAiOutput.model_json_schema()
        instruction = (
            "Você apoia um levantamento de LPN. Organize somente fatos presentes no texto; "
            "não invente pessoas, regras, datas, causas, sistemas ou decisões. "
            "Se faltar informação "
            "essencial, retorne status needs_information, perguntas objetivas e nenhuma sugestão. "
            "Caso haja informação suficiente, retorne status ready. "
            "Toda sugestão deve usar exatamente "
            f"o tipo {use_case.value} e marcar no payload que exige validação humana. "
            f"Texto informado:\n{input_text}"
        )
        response = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": settings.gemini_api_key or settings.ai_api_key or "",
            },
            json={
                "contents": [{"role": "user", "parts": [{"text": instruction}]}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "responseJsonSchema": schema,
                },
            },
            timeout=httpx.Timeout(connect=10, read=settings.ai_timeout_seconds, write=30, pool=10),
        )
        try:
            response.raise_for_status()
            raw: dict[str, Any] = response.json()
            content = raw["candidates"][0]["content"]["parts"][0]["text"]
            output = LpnAiOutput.model_validate_json(content)
        except (
            httpx.HTTPError,
            ValueError,
            KeyError,
            IndexError,
            TypeError,
            ValidationError,
        ) as exc:
            raise LpnAiError("Não foi possível obter uma sugestão estruturada da IA.") from exc
        if any(item.kind != use_case for item in output.suggestions):
            raise LpnAiError("A IA retornou conteúdo fora do caso de uso solicitado.")
        return output


def serialize_ai_output(output: LpnAiOutput) -> str:
    return json.dumps(output.model_dump(mode="json"), ensure_ascii=False)

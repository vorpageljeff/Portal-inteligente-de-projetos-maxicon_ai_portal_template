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
    prompt_version = "lpn-v2"

    compose_kinds = (
        ContentKind.STORYTELLING,
        ContentKind.OBJECTIVE,
        ContentKind.REQUIREMENT,
        ContentKind.CONSTRAINT,
        ContentKind.PENDING_ISSUE,
        ContentKind.ACCEPTANCE_CRITERION,
    )

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

    def compose(
        self,
        *,
        as_is: str,
        to_be: str,
        constraints: str | None = None,
        additional_context: str | None = None,
    ) -> tuple[str, str, LpnAiOutput]:
        provider = settings.ai_provider.lower()
        if provider == "gemini" and (settings.gemini_api_key or settings.ai_api_key):
            model = settings.ai_model or "gemini-3.5-flash"
            return "gemini", model, self._gemini_compose(
                as_is=as_is,
                to_be=to_be,
                constraints=constraints,
                additional_context=additional_context,
                model=model,
            )
        return "mock", "local-rules", self._mock_compose(
            as_is=as_is,
            to_be=to_be,
            constraints=constraints,
            additional_context=additional_context,
        )

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

    def _mock_compose(
        self,
        *,
        as_is: str,
        to_be: str,
        constraints: str | None,
        additional_context: str | None,
    ) -> LpnAiOutput:
        shared = {
            "origin": "suggested_by_ai",
            "requires_human_validation": True,
        }
        constraint_text = constraints or (
            "Preservar as regras de negócio, permissões e fontes de dados atuais."
        )
        context_text = additional_context or (
            "Validar com os usuários envolvidos eventuais exceções não descritas no levantamento."
        )
        steps = [
            value.strip(" -•\t")
            for value in to_be.replace(". ", ".\n").splitlines()
            if len(value.strip(" -•\t")) >= 3
        ][:8]
        if len(steps) < 2:
            steps = ["Iniciar o processo proposto", "Validar as informações", "Concluir o processo"]
        return LpnAiOutput(
            status="ready",
            analysis="Estrutura completa criada a partir do AS IS e do TO BE para revisão humana.",
            suggestions=[
                LpnAiSuggestionDraft(
                    kind=ContentKind.STORYTELLING,
                    title="Processo atual — AS IS",
                    payload={**shared, "description": as_is.strip()},
                    confidence=60,
                ),
                LpnAiSuggestionDraft(
                    kind=ContentKind.OBJECTIVE,
                    title="Objetivo e resultados esperados",
                    payload={
                        **shared,
                        "description": (
                            "Evoluir o processo atual para o cenário proposto, reduzindo "
                            "atividades manuais, facilitando a execução pelos usuários e "
                            "aumentando a clareza "
                            "das informações utilizadas na operação."
                        ),
                    },
                    confidence=45,
                ),
                LpnAiSuggestionDraft(
                    kind=ContentKind.REQUIREMENT,
                    title="Processo proposto — TO BE",
                    payload={**shared, "description": to_be.strip(), "process_steps": steps},
                    confidence=60,
                ),
                LpnAiSuggestionDraft(
                    kind=ContentKind.CONSTRAINT,
                    title="Restrições e premissas",
                    payload={**shared, "description": constraint_text.strip()},
                    confidence=45,
                ),
                LpnAiSuggestionDraft(
                    kind=ContentKind.PENDING_ISSUE,
                    title="Informações complementares e pontos a validar",
                    payload={**shared, "description": context_text.strip()},
                    confidence=40,
                ),
                LpnAiSuggestionDraft(
                    kind=ContentKind.ACCEPTANCE_CRITERION,
                    title="Critérios de aceite",
                    payload={
                        **shared,
                        "description": (
                            "O processo proposto deverá permitir a execução do cenário "
                            "TO BE descrito, preservar as regras informadas e apresentar "
                            "mensagens claras quando não "
                            "for possível concluir uma etapa."
                        ),
                    },
                    confidence=40,
                ),
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

    def _gemini_compose(
        self,
        *,
        as_is: str,
        to_be: str,
        constraints: str | None,
        additional_context: str | None,
        model: str,
    ) -> LpnAiOutput:
        schema = LpnAiOutput.model_json_schema()
        allowed_kinds = ", ".join(item.value for item in self.compose_kinds)
        instruction = f"""
Você é um analista de negócios responsável por elaborar um rascunho completo de LPN.
Transforme o AS IS e o TO BE informados em seis blocos funcionais, claros e editáveis.
Não invente pessoas, sistemas, datas, cálculos ou regras. Quando precisar inferir algo,
registre como premissa a validar no bloco pending_issue.

Retorne status ready e exatamente um bloco para cada tipo: {allowed_kinds}.
Use títulos objetivos e texto profissional em português do Brasil.
Cada payload deve possuir description, origin="suggested_by_ai" e
requires_human_validation=true. No bloco requirement, inclua também process_steps,
uma lista ordenada com 3 a 8 etapas curtas para desenhar o fluxo TO BE.
Critérios de aceite devem ser verificáveis. Restrições devem preservar somente o que foi informado.

AS IS:
{as_is}

TO BE:
{to_be}

RESTRIÇÕES INFORMADAS:
{constraints or "Não informadas."}

CONTEXTO ADICIONAL:
{additional_context or "Não informado."}
""".strip()
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
            raise LpnAiError("Não foi possível gerar o rascunho completo da LPN.") from exc
        returned_kinds = {item.kind for item in output.suggestions}
        if returned_kinds != set(self.compose_kinds) or len(output.suggestions) != len(
            self.compose_kinds
        ):
            raise LpnAiError("A IA não retornou todos os blocos esperados da LPN.")
        if any(
            not isinstance(item.payload.get("description"), str)
            or len(item.payload["description"].strip()) < 10
            for item in output.suggestions
        ):
            raise LpnAiError("A IA retornou um bloco sem conteúdo suficiente.")
        requirement = next(
            item for item in output.suggestions if item.kind == ContentKind.REQUIREMENT
        )
        steps = requirement.payload.get("process_steps")
        if not isinstance(steps, list) or len(steps) < 2 or not all(
            isinstance(step, str) and step.strip() for step in steps
        ):
            raise LpnAiError("A IA não retornou etapas válidas para o fluxo TO BE.")
        return output


def serialize_ai_output(output: LpnAiOutput) -> str:
    return json.dumps(output.model_dump(mode="json"), ensure_ascii=False)

import json
from datetime import date, timedelta
from typing import Any

import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.models.project import Project
from app.schemas.ai import (
    AiActionDraft,
    AiIntakeDraft,
    AiRiskDraft,
    AiServiceRequestDraft,
    AiStatusCycleDraft,
)


class AiIntakeError(RuntimeError):
    pass


class AiIntakeService:
    def build_preview(self, *, project: Project, prompt: str) -> tuple[str, AiIntakeDraft]:
        provider = settings.ai_provider.lower()
        if provider == "gemini" and (settings.gemini_api_key or settings.ai_api_key):
            return "gemini", self._from_gemini(project=project, prompt=prompt)
        return "mock", self._mock(project=project, prompt=prompt)

    def _mock(self, *, project: Project, prompt: str) -> AiIntakeDraft:
        today = date.today()
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=4)
        return AiIntakeDraft(
            project_name=project.name,
            confidence=0.45,
            summary=(
                "Rascunho local gerado sem consumo de IA. Configure GEMINI_API_KEY "
                "para extrair automaticamente os dados do texto."
            ),
            status_cycle=AiStatusCycleDraft(
                title=f"Status semanal - {project.client_name}",
                meeting_date=end,
                period_start=start,
                period_end=end,
                notes=prompt[:300],
            ),
            service_requests=AiServiceRequestDraft(),
            actions=[
                AiActionDraft(
                    title="Revisar rascunho gerado por IA antes de aplicar",
                    due_date=end,
                )
            ],
            risks=[
                AiRiskDraft(
                    title="Rascunho sem IA configurada",
                    description="Configure GEMINI_API_KEY no Render para extracao automatica.",
                )
            ],
            warnings=["IA real nao configurada; nenhum dado foi inferido do texto."],
        )

    def _from_gemini(self, *, project: Project, prompt: str) -> AiIntakeDraft:
        schema = AiIntakeDraft.model_json_schema()
        instruction = (
            "Extraia do texto um rascunho estruturado para o portal de gestao de projetos. "
            "Use apenas informacoes presentes ou inferencias seguras. Se algo estiver ausente, "
            "use zero/lista vazia e adicione aviso em warnings. Datas devem usar YYYY-MM-DD. "
            f"Projeto atual: {project.name}. Cliente: {project.client_name}.\n\n"
            f"Texto do usuario:\n{prompt}"
        )
        payload: dict[str, Any] = {
            "model": settings.ai_model or "gemini-3.5-flash",
            "input": instruction,
            "response_format": {
                "type": "text",
                "mime_type": "application/json",
                "schema": schema,
            },
        }
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": settings.gemini_api_key or settings.ai_api_key or "",
        }
        try:
            response = httpx.post(
                "https://generativelanguage.googleapis.com/v1beta/interactions",
                headers=headers,
                json=payload,
                timeout=45,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise AiIntakeError(f"Falha ao chamar Gemini: {exc}") from exc

        raw = response.json()
        content = self._extract_output(raw)
        try:
            return AiIntakeDraft.model_validate_json(content)
        except ValidationError as exc:
            raise AiIntakeError("Gemini retornou JSON fora do contrato esperado.") from exc

    def _extract_output(self, raw: dict[str, Any]) -> str:
        if isinstance(raw.get("output_text"), str):
            return raw["output_text"]
        if isinstance(raw.get("text"), str):
            return raw["text"]
        if "candidates" in raw:
            try:
                return raw["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError, TypeError):
                pass
        return json.dumps(raw)

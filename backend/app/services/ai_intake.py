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
    gemini_fallback_model = "gemini-3.5-flash-lite"

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
            progress_percent=getattr(project, "progress_percent", None),
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
        model = settings.ai_model or "gemini-3.5-flash"
        instruction = (
            "Extraia do texto um pacote estruturado completo para atualizar o ciclo semanal "
            "do portal de gestao de projetos. Preencha, quando informados: data da reuniao, "
            "periodo, progresso acumulado, solicitacoes, tarefas, entregas, impedimentos, "
            "marcos, riscos, acoes e horas por profissional. Use apenas informacoes presentes; "
            "nao invente nomes, datas, percentuais ou quantidades. Se algo estiver ausente, "
            "use zero, nulo ou lista vazia conforme o schema e descreva a ausencia em warnings. "
            "O progress_percent representa o progresso acumulado atual do projeto. "
            "Datas devem usar YYYY-MM-DD. "
            f"Projeto atual: {project.name}. Cliente: {project.client_name}.\n\n"
            f"Texto do usuario:\n{prompt}"
        )
        payload: dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": instruction}],
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseJsonSchema": schema,
            },
        }
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": settings.gemini_api_key or settings.ai_api_key or "",
        }
        models = [model]
        if model != self.gemini_fallback_model:
            models.append(self.gemini_fallback_model)

        response: httpx.Response | None = None
        for candidate_model in models:
            try:
                response = httpx.post(
                    "https://generativelanguage.googleapis.com/v1beta/"
                    f"models/{candidate_model}:generateContent",
                    headers=headers,
                    json=payload,
                    timeout=httpx.Timeout(
                        connect=10,
                        read=settings.ai_timeout_seconds,
                        write=30,
                        pool=10,
                    ),
                )
                response.raise_for_status()
                break
            except httpx.ReadTimeout as exc:
                raise AiIntakeError(
                    "O Gemini demorou mais que o limite esperado. "
                    "Tente novamente com um texto menor."
                ) from exc
            except httpx.HTTPStatusError as exc:
                can_fallback = (
                    exc.response.status_code in {429, 503}
                    and candidate_model != models[-1]
                )
                if can_fallback:
                    continue
                detail = self._google_error_detail(exc.response)
                raise AiIntakeError(
                    f"Gemini recusou a solicitacao ({exc.response.status_code}): {detail}"
                ) from exc
            except httpx.HTTPError as exc:
                raise AiIntakeError("Falha de comunicacao com o Gemini.") from exc

        if response is None:
            raise AiIntakeError("Gemini nao retornou uma resposta.")

        try:
            raw = response.json()
        except ValueError as exc:
            raise AiIntakeError("Gemini retornou uma resposta que nao e JSON.") from exc
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

        steps = raw.get("steps")
        if isinstance(steps, list):
            for step in reversed(steps):
                if not isinstance(step, dict) or step.get("type") != "model_output":
                    continue
                content = step.get("content")
                if not isinstance(content, list):
                    continue
                for item in content:
                    if (
                        isinstance(item, dict)
                        and item.get("type") == "text"
                        and isinstance(item.get("text"), str)
                    ):
                        return item["text"]

        if "candidates" in raw:
            try:
                return raw["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError, TypeError):
                pass
        raise AiIntakeError("Gemini respondeu sem conteudo textual.")

    @staticmethod
    def _google_error_detail(response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return "resposta invalida do provedor"
        message = payload.get("error", {}).get("message")
        return str(message)[:300] if message else "erro nao detalhado pelo provedor"

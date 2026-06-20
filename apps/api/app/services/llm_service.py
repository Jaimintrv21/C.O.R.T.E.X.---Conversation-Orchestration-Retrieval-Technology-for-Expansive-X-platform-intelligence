"""LLM routing and structured generation helpers."""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Protocol

from app.config import Settings, get_settings


ROUTING_RULES = {
    "summarization": "ollama/llama3.2:3b",
    "topic_extraction": "ollama/mistral:7b",
    "artifact_generation": "ollama/llama3.1:8b",
    "knowledge_graph": "ollama/qwen2.5:7b",
    "fallback": "openai/gpt-4o-mini",
}


@dataclass(slots=True)
class LLMGenerationRequest:
    task_type: str
    prompt: str
    system_prompt: str | None = None
    output_schema: dict[str, Any] | None = None
    temperature: float = 0.1
    model: str | None = None
    local_only: bool | None = None


class LiteLLMClient(Protocol):
    async def complete(self, *, model: str, messages: list[dict[str, str]], temperature: float) -> str:
        """Return raw model text."""


class DefaultLiteLLMClient:
    async def complete(self, *, model: str, messages: list[dict[str, str]], temperature: float) -> str:
        try:
            from litellm import acompletion
        except ImportError as exc:
            raise RuntimeError("LiteLLM is required for LLM routing") from exc

        response = await acompletion(model=model, messages=messages, temperature=temperature)
        return response["choices"][0]["message"]["content"]


class LLMRouterService:
    def __init__(self, settings: Settings | None = None, client: LiteLLMClient | None = None) -> None:
        self.settings = settings or get_settings()
        self.client = client or DefaultLiteLLMClient()
        self.routing_rules = {
            "summarization": self.settings.llm_summarization_model,
            "topic_extraction": self.settings.llm_topic_extraction_model,
            "artifact_generation": self.settings.llm_artifact_generation_model,
            "knowledge_graph": self.settings.llm_knowledge_graph_model,
            "fallback": self.settings.llm_fallback_model,
        }

    def resolve_model(
        self,
        task_type: str,
        *,
        override_model: str | None = None,
        local_only: bool | None = None,
    ) -> str:
        local_only = self.settings.ai_local_only if local_only is None else local_only
        model = override_model or self.routing_rules.get(task_type) or self.routing_rules["fallback"]
        if local_only and not model.startswith("ollama/"):
            fallback_model = self.routing_rules.get(task_type)
            if fallback_model and fallback_model.startswith("ollama/"):
                return fallback_model
            raise ValueError(f"No local model configured for task type '{task_type}'")
        return model

    async def generate_text(self, request: LLMGenerationRequest) -> str:
        model = self.resolve_model(
            request.task_type,
            override_model=request.model,
            local_only=request.local_only,
        )
        return await self.client.complete(
            model=model,
            messages=self._build_messages(request),
            temperature=request.temperature,
        )

    async def generate_structured(self, request: LLMGenerationRequest) -> dict[str, Any]:
        raw = await self.generate_text(request)
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError("Model did not return valid JSON") from exc

    def _build_messages(self, request: LLMGenerationRequest) -> list[dict[str, str]]:
        system_prompt = request.system_prompt or "You are a precise backend generation engine."
        if request.output_schema:
            schema_blob = json.dumps(request.output_schema, indent=2, sort_keys=True)
            system_prompt = f"{system_prompt}\nReturn valid JSON matching this schema:\n{schema_blob}"
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": request.prompt},
        ]

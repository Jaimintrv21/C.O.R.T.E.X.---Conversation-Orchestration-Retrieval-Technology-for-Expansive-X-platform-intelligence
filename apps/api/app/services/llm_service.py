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
    "primary_chat": "glm-5.2:cloud",
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
    
    async def stream_complete(self, *, model: str, messages: list[dict[str, str]], temperature: float):
        """Yield raw model text chunks."""


class DefaultLiteLLMClient:
    async def complete(self, *, model: str, messages: list[dict[str, str]], temperature: float) -> str:
        try:
            from litellm import acompletion
        except ImportError as exc:
            raise RuntimeError("LiteLLM is required for LLM routing") from exc

        response = await acompletion(model=model, messages=messages, temperature=temperature)
        return response["choices"][0]["message"]["content"]

    async def stream_complete(self, *, model: str, messages: list[dict[str, str]], temperature: float):
        try:
            from litellm import acompletion
        except ImportError as exc:
            raise RuntimeError("LiteLLM is required for LLM routing") from exc

        response = await acompletion(model=model, messages=messages, temperature=temperature, stream=True)
        async for chunk in response:
            if "choices" in chunk and len(chunk["choices"]) > 0:
                delta = chunk["choices"][0].get("delta", {}).get("content")
                if delta:
                    yield delta


class OllamaCloudClient:
    """Routes primary chat requests through Ollama's cloud-hosted
    model proxy, distinct from local Ollama models which are reached
    through LiteLLM's existing ollama/* routing."""
    
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def complete(self, *, model: str, messages: list[dict[str, str]], temperature: float) -> str:
        import httpx
        
        if not self.settings.ollama_cloud_api_key:
            raise ValueError("ollama_cloud_api_key is unset, cannot use cloud-hosted Ollama model.")
            
        headers = {"Authorization": f"Bearer {self.settings.ollama_cloud_api_key}"}
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature}
        }
        
        # Trim ollama/ prefix if accidentally passed, though we use glm-5.2:cloud
        if payload["model"].startswith("ollama/"):
            payload["model"] = payload["model"][7:]
            
        async with httpx.AsyncClient(base_url=self.settings.ollama_cloud_base_url) as client:
            response = await client.post("/api/chat", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "")

    async def stream_complete(self, *, model: str, messages: list[dict[str, str]], temperature: float):
        import httpx
        import json
        
        if not self.settings.ollama_cloud_api_key:
            raise ValueError("ollama_cloud_api_key is unset, cannot use cloud-hosted Ollama model.")
            
        headers = {"Authorization": f"Bearer {self.settings.ollama_cloud_api_key}"}
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": {"temperature": temperature}
        }
        
        if payload["model"].startswith("ollama/"):
            payload["model"] = payload["model"][7:]
            
        async with httpx.AsyncClient(base_url=self.settings.ollama_cloud_base_url) as client:
            async with client.stream("POST", "/api/chat", json=payload, headers=headers) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        if "message" in data and "content" in data["message"]:
                            yield data["message"]["content"]
                    except json.JSONDecodeError:
                        continue


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
            "primary_chat": self.settings.primary_chat_model,
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
        
        if model.endswith(":cloud") and local_only:
            raise ValueError(
                "glm-5.2:cloud is a cloud-hosted model and cannot be used "
                "when local_only is enabled. Use a local Ollama model "
                "instead, or disable local_only for this request."
            )
            
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
        
        client = OllamaCloudClient(self.settings) if model.endswith(":cloud") else self.client
        
        return await client.complete(
            model=model,
            messages=self._build_messages(request),
            temperature=request.temperature,
        )

    async def stream_text(self, request: LLMGenerationRequest):
        model = self.resolve_model(
            request.task_type,
            override_model=request.model,
            local_only=request.local_only,
        )
        
        client = OllamaCloudClient(self.settings) if model.endswith(":cloud") else self.client
        
        async for chunk in client.stream_complete(
            model=model,
            messages=self._build_messages(request),
            temperature=request.temperature,
        ):
            yield chunk

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

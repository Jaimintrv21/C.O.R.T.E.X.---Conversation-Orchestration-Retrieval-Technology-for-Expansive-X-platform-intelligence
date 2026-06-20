"""User-owned external model chat integrations."""
from __future__ import annotations

import asyncio
import json
import math
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, AsyncIterator

from fastapi import HTTPException, status

from app.firestore import FirestoreStore
from app.services.external_chat_errors import ExternalChatError, normalize_external_chat_exception

try:  # pragma: no cover - optional dependency
    from openai import AsyncOpenAI
except ImportError:  # pragma: no cover - optional dependency
    AsyncOpenAI = None  # type: ignore[assignment]

try:  # pragma: no cover - optional dependency
    from anthropic import AsyncAnthropic
except ImportError:  # pragma: no cover - optional dependency
    AsyncAnthropic = None  # type: ignore[assignment]

try:  # pragma: no cover - optional dependency
    import google.generativeai as genai
except ImportError:  # pragma: no cover - optional dependency
    genai = None  # type: ignore[assignment]


DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-sonnet-latest",
    "gemini": "gemini-2.5-flash",
    "grok": "grok-3-mini",
}

# Illustrative cost estimates only. Keep these aligned with provider pricing pages.
APPROX_PRICING_USD_PER_1K = {
    "openai": {
        "gpt-4o-mini": {"prompt": 0.00015, "completion": 0.0006},
        "default": {"prompt": 0.00015, "completion": 0.0006},
    },
    "anthropic": {
        "claude-3-5-sonnet-latest": {"prompt": 0.003, "completion": 0.015},
        "claude-3-5-haiku-latest": {"prompt": 0.0008, "completion": 0.004},
        "default": {"prompt": 0.003, "completion": 0.015},
    },
    "gemini": {
        "gemini-2.5-flash": {"prompt": 0.00035, "completion": 0.00105},
        "default": {"prompt": 0.00035, "completion": 0.00105},
    },
    "grok": {
        "grok-3-mini": {"prompt": 0.0003, "completion": 0.0015},
        "default": {"prompt": 0.0003, "completion": 0.0015},
    },
}


@dataclass(slots=True)
class UsageSnapshot:
    prompt_tokens: int
    completion_tokens: int
    estimated_cost_usd: float
    model: str
    provider_slug: str


class ExternalChatService:
    def __init__(self, store: FirestoreStore | None = None) -> None:
        self.store = store or FirestoreStore()
        self.last_usage: UsageSnapshot | None = None
        self.last_provider_account: dict[str, Any] | None = None

    async def get_decrypted_api_key(self, user_id: str, provider_slug: str) -> str:
        """Fetch and decrypt the user's connected API key for a provider."""
        account = self._get_active_provider_account(user_id, provider_slug)
        if not account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No connected {provider_slug} API key found. Connect one in Settings.",
            )
        if account.get("needs_reauth"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Your {provider_slug} API key needs to be reconnected in Settings.",
            )
        if account.get("connection_type") != "api_key" or not account.get("encrypted_api_key"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No connected {provider_slug} API key found. Connect one in Settings.",
            )

        self.last_provider_account = account
        cap = account.get("monthly_cap_usd")
        if cap is not None:
            cap_check = self.store.check_spend_cap(
                user_id=user_id,
                provider_account_id=account["id"],
                monthly_cap_usd=float(cap),
            )
            if cap_check["exceeded"]:
                raise ExternalChatError(
                    code="SPEND_CAP_REACHED",
                    message="Your monthly spend cap has been reached for this provider. Try again next month.",
                    retryable=False,
                    provider=provider_slug,
                )

        try:
            decrypted = self.store.decrypt_for_user(
                user_id,
                bytes(account["encrypted_api_key"]),
                bytes(account["api_key_nonce"]),
            )
        except Exception as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The stored {provider_slug} API key could not be decrypted. Reconnect it in Settings.",
            ) from exc
        return decrypted.decode("utf-8")

    async def stream_completion(
        self,
        *,
        provider_slug: str,
        api_key: str,
        messages: list[dict],
        model: str | None,
        temperature: float = 0.7,
        user_id: str | None = None,
        provider_account_id: str | None = None,
    ) -> AsyncIterator[str]:
        provider_slug = provider_slug.lower()
        resolved_model = model or DEFAULT_MODELS.get(provider_slug) or model or "gpt-4o-mini"
        self.last_usage = None
        chunks: list[str] = []

        try:
            if provider_slug in {"openai", "grok"}:
                async for chunk in self._stream_openai_compatible(
                    provider_slug=provider_slug,
                    api_key=api_key,
                    messages=messages,
                    model=resolved_model,
                    temperature=temperature,
                ):
                    chunks.append(chunk)
                    yield chunk
            elif provider_slug == "anthropic":
                async for chunk in self._stream_anthropic(
                    provider_slug=provider_slug,
                    api_key=api_key,
                    messages=messages,
                    model=resolved_model,
                    temperature=temperature,
                ):
                    chunks.append(chunk)
                    yield chunk
            elif provider_slug == "gemini":
                async for chunk in self._stream_gemini(
                    provider_slug=provider_slug,
                    api_key=api_key,
                    messages=messages,
                    model=resolved_model,
                    temperature=temperature,
                ):
                    chunks.append(chunk)
                    yield chunk
            else:
                raise ExternalChatError(
                    code="UNSUPPORTED_PROVIDER",
                    message=f"External chat is not configured for {provider_slug}.",
                    retryable=False,
                    provider=provider_slug,
                )
        except ExternalChatError:
            if self.last_usage is None and chunks:
                self._set_estimated_usage(provider_slug, resolved_model, messages, "".join(chunks))
            raise
        except Exception as exc:
            if self.last_usage is None and chunks:
                self._set_estimated_usage(provider_slug, resolved_model, messages, "".join(chunks))
            normalized = normalize_external_chat_exception(provider_slug, exc)
            normalized.partial_text = "".join(chunks)
            if normalized.code == "INVALID_API_KEY" and self.last_provider_account:
                self.store.update_provider_account(self.last_provider_account["id"], {"needs_reauth": True})
            raise normalized from exc
        finally:
            if self.last_usage is None:
                self._set_estimated_usage(provider_slug, resolved_model, messages, "".join(chunks))

    async def _stream_openai_compatible(
        self,
        *,
        provider_slug: str,
        api_key: str,
        messages: list[dict],
        model: str,
        temperature: float,
    ) -> AsyncIterator[str]:
        client = self._require_openai_client(provider_slug, api_key)
        prepared_messages = self._prepare_openai_messages(messages)
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": prepared_messages,
            "temperature": temperature,
            "stream": True,
        }
        try:
            kwargs["stream_options"] = {"include_usage": True}
            stream = await client.chat.completions.create(**kwargs)
        except TypeError:
            kwargs.pop("stream_options", None)
            stream = await client.chat.completions.create(**kwargs)

        usage = None
        async for event in stream:
            choice = event.choices[0] if getattr(event, "choices", None) else None
            delta = getattr(getattr(choice, "delta", None), "content", None) if choice else None
            if delta:
                yield str(delta)
            if getattr(event, "usage", None):
                usage = event.usage
        self.last_usage = self._build_usage_snapshot(
            provider_slug=provider_slug,
            model=model,
            messages=messages,
            output_text="",
            usage=usage,
        )

    async def _stream_anthropic(
        self,
        *,
        provider_slug: str,
        api_key: str,
        messages: list[dict],
        model: str,
        temperature: float,
    ) -> AsyncIterator[str]:
        client = self._require_anthropic_client(provider_slug, api_key)
        system_prompt, prepared_messages = self._prepare_anthropic_messages(messages)

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": prepared_messages,
            "max_tokens": 4096,
            "temperature": temperature,
            "stream": True,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        usage = None
        async with client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                if text:
                    yield str(text)
            try:
                final_message = await stream.get_final_message()
                usage = getattr(final_message, "usage", None)
            except Exception:
                usage = None

        self.last_usage = self._build_usage_snapshot(
            provider_slug=provider_slug,
            model=model,
            messages=messages,
            output_text="",
            usage=usage,
        )

    async def _stream_gemini(
        self,
        *,
        provider_slug: str,
        api_key: str,
        messages: list[dict],
        model: str,
        temperature: float,
    ) -> AsyncIterator[str]:
        if genai is None:  # pragma: no cover - optional dependency
            raise RuntimeError("google-generativeai is required for Gemini external chat")

        genai.configure(api_key=api_key)
        model_client = genai.GenerativeModel(model_name=model)
        prompt = self._format_transcript(messages)
        response = model_client.generate_content(
            prompt,
            stream=True,
            generation_config={
                "temperature": temperature,
            },
        )

        usage = None
        async for chunk in self._iterate_sync_response(response):
            text = getattr(chunk, "text", None)
            if text:
                yield str(text)
            usage = getattr(chunk, "usage_metadata", None) or usage

        self.last_usage = self._build_usage_snapshot(
            provider_slug=provider_slug,
            model=model,
            messages=messages,
            output_text="",
            usage=usage,
        )

    async def _iterate_sync_response(self, response: Any) -> AsyncIterator[Any]:
        queue: asyncio.Queue[Any] = asyncio.Queue()
        sentinel = object()
        loop = asyncio.get_running_loop()

        def worker() -> None:
            try:
                for item in response:
                    loop.call_soon_threadsafe(queue.put_nowait, item)
            except Exception as exc:  # pragma: no cover - defensive
                loop.call_soon_threadsafe(queue.put_nowait, exc)
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, sentinel)

        task = asyncio.create_task(asyncio.to_thread(worker))
        try:
            while True:
                item = await queue.get()
                if item is sentinel:
                    break
                if isinstance(item, Exception):
                    raise item
                yield item
        finally:
            await task

    def _require_openai_client(self, provider_slug: str, api_key: str):
        if AsyncOpenAI is None:  # pragma: no cover - optional dependency
            raise RuntimeError("openai is required for external chat")
        kwargs: dict[str, Any] = {"api_key": api_key}
        if provider_slug == "grok":
            kwargs["base_url"] = "https://api.x.ai/v1"
        return AsyncOpenAI(**kwargs)

    def _require_anthropic_client(self, provider_slug: str, api_key: str):
        if AsyncAnthropic is None:  # pragma: no cover - optional dependency
            raise RuntimeError("anthropic is required for external chat")
        return AsyncAnthropic(api_key=api_key)

    def _prepare_openai_messages(self, messages: list[dict]) -> list[dict[str, str]]:
        prepared: list[dict[str, str]] = []
        for message in messages:
            role = str(message.get("role") or "user")
            content = message.get("content")
            if content is None:
                continue
            text = self._coerce_text(content)
            if not text:
                continue
            prepared.append({"role": role, "content": text})
        return prepared

    def _prepare_anthropic_messages(self, messages: list[dict]) -> tuple[str | None, list[dict[str, str]]]:
        prepared: list[dict[str, str]] = []
        system_messages: list[str] = []
        for message in messages:
            role = str(message.get("role") or "user")
            content = message.get("content")
            if content is None:
                continue
            text = self._coerce_text(content)
            if not text:
                continue
            if role == "system":
                system_messages.append(text)
                continue
            prepared.append({"role": role if role in {"user", "assistant"} else "user", "content": text})
        system_prompt = "\n\n".join(system_messages).strip() or None
        return system_prompt, prepared

    def _format_transcript(self, messages: list[dict]) -> str:
        lines: list[str] = []
        for message in messages:
            role = str(message.get("role") or "user").upper()
            content = self._coerce_text(message.get("content"))
            if not content:
                continue
            lines.append(f"{role}: {content}")
        return "\n".join(lines).strip()

    def _coerce_text(self, content: Any) -> str:
        if isinstance(content, str):
            return content.strip()
        if isinstance(content, list):
            pieces: list[str] = []
            for item in content:
                if isinstance(item, str):
                    pieces.append(item)
                elif isinstance(item, dict):
                    pieces.append(str(item.get("text") or item.get("content") or ""))
                else:
                    pieces.append(str(item))
            return "\n".join(piece for piece in pieces if piece).strip()
        if isinstance(content, dict):
            return str(content.get("text") or content.get("content") or json.dumps(content, default=str)).strip()
        return str(content).strip()

    def _usage_pricing(self, provider_slug: str, model: str) -> dict[str, float]:
        provider_table = APPROX_PRICING_USD_PER_1K.get(provider_slug, {})
        return provider_table.get(model) or provider_table.get("default") or {"prompt": 0.0, "completion": 0.0}

    def _extract_usage_value(self, usage: Any, *names: str) -> int | None:
        if usage is None:
            return None
        for name in names:
            if isinstance(usage, dict) and name in usage and usage[name] is not None:
                try:
                    return int(usage[name])
                except (TypeError, ValueError):
                    continue
            value = getattr(usage, name, None)
            if value is not None:
                try:
                    return int(value)
                except (TypeError, ValueError):
                    continue
        return None

    def _build_usage_snapshot(
        self,
        *,
        provider_slug: str,
        model: str,
        messages: list[dict],
        output_text: str,
        usage: Any,
    ) -> UsageSnapshot:
        prompt_tokens = self._extract_usage_value(
            usage,
            "prompt_tokens",
            "input_tokens",
            "prompt_token_count",
            "input_token_count",
        )
        completion_tokens = self._extract_usage_value(
            usage,
            "completion_tokens",
            "output_tokens",
            "candidate_token_count",
            "candidates_token_count",
            "output_token_count",
        )
        total_tokens = self._extract_usage_value(usage, "total_tokens", "total_token_count")

        if prompt_tokens is None:
            prompt_tokens = self._estimate_tokens(self._format_transcript(messages))
        if completion_tokens is None:
            if total_tokens is not None and total_tokens >= prompt_tokens:
                completion_tokens = max(total_tokens - prompt_tokens, 0)
            else:
                completion_tokens = self._estimate_tokens(output_text)

        pricing = self._usage_pricing(provider_slug, model)
        estimated_cost_usd = round(
            (prompt_tokens / 1000.0) * float(pricing["prompt"]) + (completion_tokens / 1000.0) * float(pricing["completion"]),
            6,
        )
        return UsageSnapshot(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            estimated_cost_usd=estimated_cost_usd,
            model=model,
            provider_slug=provider_slug,
        )

    def _set_estimated_usage(self, provider_slug: str, model: str, messages: list[dict], output_text: str) -> None:
        if self.last_usage is None:
            self.last_usage = self._build_usage_snapshot(
                provider_slug=provider_slug,
                model=model,
                messages=messages,
                output_text=output_text,
                usage=None,
            )

    def _estimate_tokens(self, text: str) -> int:
        if not text:
            return 1
        return max(1, math.ceil(len(text) / 4))

    def _get_active_provider_account(self, user_id: str, provider_slug: str) -> dict[str, Any] | None:
        accounts = self.store.list_provider_accounts(user_id)
        for account in accounts:
            if (
                str(account.get("provider_slug") or "").lower() == provider_slug.lower()
                and account.get("is_active", False)
                and account.get("deleted_at") is None
                and account.get("connection_type") == "api_key"
            ):
                return account
        return None

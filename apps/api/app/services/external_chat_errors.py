"""Normalized errors for user-owned external model chat."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class ExternalChatError(Exception):
    code: str
    message: str
    retryable: bool
    provider: str
    partial_text: str = ""
    original_exception: Exception | None = None

    def __str__(self) -> str:  # pragma: no cover - convenience
        return self.message


def _message_text(exc: Exception) -> str:
    return " ".join(part for part in [str(exc), exc.__class__.__name__, exc.__class__.__module__] if part).lower()


def _has_any(text: str, needles: tuple[str, ...]) -> bool:
    return any(needle in text for needle in needles)


def normalize_external_chat_exception(provider: str, exc: Exception) -> ExternalChatError:
    """Map provider-specific exceptions into a single frontend-friendly error shape."""
    text = _message_text(exc)
    provider_name = provider.lower()

    if _has_any(text, ("ratelimit", "rate limit", "too many requests", "resource exhausted", "quota exceeded")):
        return ExternalChatError(
            code="RATE_LIMITED",
            message="The provider rate limited this request. Try again shortly.",
            retryable=True,
            provider=provider_name,
            original_exception=exc,
        )

    if _has_any(text, ("invalid api key", "incorrect api key", "authentication", "unauthorized", "forbidden", "permission denied", "bad credentials")):
        return ExternalChatError(
            code="INVALID_API_KEY",
            message="The connected API key is invalid or expired. Reconnect it in Settings.",
            retryable=False,
            provider=provider_name,
            original_exception=exc,
        )

    if _has_any(text, ("context length", "context too long", "token limit", "prompt too long", "maximum context")):
        return ExternalChatError(
            code="CONTEXT_TOO_LONG",
            message="The conversation is too long for this model. Start a new conversation or summarize the thread.",
            retryable=False,
            provider=provider_name,
            original_exception=exc,
        )

    if _has_any(text, ("content filter", "content filtered", "refused", "safety", "policy", "blocked")):
        return ExternalChatError(
            code="CONTENT_FILTERED",
            message="The provider filtered or refused this response.",
            retryable=False,
            provider=provider_name,
            original_exception=exc,
        )

    return ExternalChatError(
        code="EXTERNAL_CHAT_FAILED",
        message="The external model request failed.",
        retryable=True,
        provider=provider_name,
        original_exception=exc,
    )


def error_to_payload(error: ExternalChatError) -> dict[str, Any]:
    return {
        "code": error.code,
        "message": error.message,
        "retryable": error.retryable,
        "provider": error.provider,
    }

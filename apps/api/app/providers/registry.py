"""Provider registry for export detection and parsing.

Reality check for live sync as of 2026-06:
- ChatGPT consumer conversation history is not exposed via the OpenAI API.
  Official export remains the supported path for chat history.
- Claude.ai does not expose consumer chat history through the Anthropic API.
  Export/import is the documented user-owned path.
- Gemini does not expose a public consumer conversation-history API.
  Google Takeout / export flows remain the supported route for account data.
- Perplexity and Grok likewise do not provide documented public history APIs.

The live `sync()` methods therefore remain explicit NotImplementedError stubs
until a ToS-compliant data API exists for a given provider.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

import structlog

from app.providers.base import BaseProvider, CanonicalConversation, CanonicalMessage
from app.providers.chatgpt.v1 import ChatGPTv1Parser
from app.providers.claude.v1 import ClaudeV1Parser
from app.providers.gemini.v1 import GeminiV1Parser
from app.providers.generic.json_parser import GenericJsonParser

logger = structlog.get_logger()

_PARSERS: list[BaseProvider] = [
    ChatGPTv1Parser(),
    ClaudeV1Parser(),
    GeminiV1Parser(),
    GenericJsonParser(),
]

_LIVE_PROVIDER_SLUGS = {"chatgpt", "claude", "gemini", "perplexity", "grok"}


def detect_provider(raw: bytes, hint: str | None = None) -> BaseProvider | None:
    """Auto-detect which parser can handle the raw file bytes."""
    if hint:
        for parser in _PARSERS:
            if parser.slug == hint:
                return parser

    for parser in _PARSERS:
        try:
            if parser.detect_format(raw):
                logger.info(
                    "provider_detected",
                    provider=parser.slug,
                    version=parser.version,
                    schema_version=parser.get_schema_version(),
                )
                return parser
        except Exception:
            continue

    logger.warning("no_provider_detected")
    return None


def load_and_parse(
    file_path: str,
    provider_slug: str | None = None,
    version: str = "latest",
) -> list[CanonicalConversation]:
    """Load a file from disk, detect provider, and parse to canonical format."""
    with open(file_path, "rb") as file:
        raw = file.read()

    parser = detect_provider(raw, hint=provider_slug)
    if not parser:
        raise ValueError(f"No parser found for file: {file_path}")

    conversations = parser.parse(raw, version=version)
    logger.info(
        "parse_complete",
        provider=parser.slug,
        conversations=len(conversations),
        schema_version=parser.get_schema_version(),
    )
    return conversations


def is_live_provider_slug(provider_slug: str) -> bool:
    return provider_slug.lower() in _LIVE_PROVIDER_SLUGS


def normalize_extension_conversations(
    provider_slug: str,
    conversations: list[dict[str, Any]],
) -> list[CanonicalConversation]:
    """Normalize extension-captured payloads into the canonical dataclasses."""
    normalized: list[CanonicalConversation] = []
    slug = provider_slug.lower()

    for index, raw_conv in enumerate(conversations):
        if not isinstance(raw_conv, dict):
            continue
        messages: list[CanonicalMessage] = []
        raw_messages = raw_conv.get("messages") or []
        for message_index, raw_msg in enumerate(raw_messages):
            if not isinstance(raw_msg, dict):
                continue
            content = raw_msg.get("content")
            if isinstance(content, list):
                content = "\n".join(str(item) for item in content)
            content = str(content or "").strip()
            if not content:
                continue
            captured_at = raw_msg.get("created_at") or raw_msg.get("captured_at")
            created_at = None
            if isinstance(captured_at, datetime):
                created_at = captured_at
            elif isinstance(captured_at, str):
                try:
                    created_at = datetime.fromisoformat(captured_at.replace("Z", "+00:00"))
                except ValueError:
                    created_at = None
            messages.append(
                CanonicalMessage(
                    external_id=str(raw_msg.get("external_id") or raw_msg.get("id") or f"{slug}-{index}-{message_index}"),
                    role=str(raw_msg.get("role") or "user"),
                    content=content,
                    content_type=str(raw_msg.get("content_type") or "text"),
                    model=raw_msg.get("model"),
                    token_count=int(raw_msg.get("token_count") or 0),
                    attachments=raw_msg.get("attachments"),
                    tool_calls=raw_msg.get("tool_calls"),
                    parent_id=raw_msg.get("parent_id"),
                    created_at=created_at,
                    metadata=raw_msg.get("metadata") or {},
                )
            )

        captured_at = raw_conv.get("captured_at")
        started_at = None
        if isinstance(captured_at, datetime):
            started_at = captured_at
        elif isinstance(captured_at, str):
            try:
                started_at = datetime.fromisoformat(captured_at.replace("Z", "+00:00"))
            except ValueError:
                started_at = None
        if not messages:
            continue

        topics = raw_conv.get("topics")
        if not isinstance(topics, list):
            topics = []
        tags = raw_conv.get("tags")
        if not isinstance(tags, list):
            tags = []

        normalized.append(
            CanonicalConversation(
                external_id=str(raw_conv.get("external_id") or raw_conv.get("id") or f"{slug}-conv-{index}"),
                title=raw_conv.get("title"),
                messages=messages,
                provider_slug=slug,
                model=raw_conv.get("model"),
                language=raw_conv.get("language"),
                topics=[str(item) for item in topics],
                tags=[str(item) for item in tags],
                started_at=started_at,
                ended_at=None,
                metadata=raw_conv.get("metadata") or {},
            )
        )

    return normalized

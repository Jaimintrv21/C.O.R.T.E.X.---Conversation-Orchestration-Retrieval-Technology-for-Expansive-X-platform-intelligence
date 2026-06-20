"""Provider registry for export detection and parsing."""
from __future__ import annotations

import structlog

from app.providers.base import BaseProvider, CanonicalConversation
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

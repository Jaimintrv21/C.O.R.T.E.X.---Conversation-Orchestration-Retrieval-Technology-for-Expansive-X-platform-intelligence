"""Provider registry — auto-detects format and routes to correct parser."""
from __future__ import annotations
import json
from typing import Any
import structlog
from app.providers.base import BaseProvider, CanonicalConversation

logger = structlog.get_logger()

# Import all providers
from app.providers.chatgpt.v1 import ChatGPTv1Parser
from app.providers.claude.v1 import ClaudeV1Parser
from app.providers.gemini.v1 import GeminiV1Parser
from app.providers.generic.json_parser import GenericJsonParser

# Ordered by specificity — most specific first
_PARSERS: list[BaseProvider] = [
    ChatGPTv1Parser(),
    ClaudeV1Parser(),
    GeminiV1Parser(),
    GenericJsonParser(),  # fallback
]


def detect_provider(data: Any, hint: str | None = None) -> BaseProvider | None:
    """Auto-detect which parser can handle the data. Optional hint for provider slug."""
    if hint:
        for parser in _PARSERS:
            if parser.slug == hint:
                return parser

    for parser in _PARSERS:
        try:
            if parser.detect(data):
                logger.info("provider_detected", provider=parser.slug, version=parser.version)
                return parser
        except Exception:
            continue

    logger.warning("no_provider_detected")
    return None


def load_and_parse(file_path: str, provider_slug: str | None = None) -> list[CanonicalConversation]:
    """Load a file from disk, detect provider, and parse to canonical format."""
    with open(file_path, "r", encoding="utf-8") as f:
        raw = f.read()

    # Try JSON first
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Could be markdown or other format
        data = raw

    parser = detect_provider(data, hint=provider_slug)
    if not parser:
        raise ValueError(f"No parser found for file: {file_path}")

    conversations = parser.parse(data)
    logger.info("parse_complete", provider=parser.slug, conversations=len(conversations))
    return conversations

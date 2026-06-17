"""Abstract base provider interface.

All provider parsers implement this interface:
- detect(data) → bool   — can this parser handle the file?
- parse(data)  → list[CanonicalConversation]  — normalized output
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class CanonicalMessage:
    """Normalized message format shared by all providers."""
    external_id: str | None = None
    role: str = "user"  # user | assistant | system | tool | function
    content: str = ""
    content_type: str = "text"
    model: str | None = None
    token_count: int = 0
    attachments: list[dict] | None = None
    tool_calls: list[dict] | None = None
    parent_id: str | None = None
    created_at: datetime | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CanonicalConversation:
    """Normalized conversation format output from all parsers."""
    external_id: str
    title: str | None = None
    messages: list[CanonicalMessage] = field(default_factory=list)
    provider_slug: str = "unknown"
    model: str | None = None
    language: str | None = None
    topics: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    started_at: datetime | None = None
    ended_at: datetime | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class BaseProvider(ABC):
    """Abstract provider parser."""

    name: str = "Unknown"
    slug: str = "unknown"
    version: str = "1.0"

    @abstractmethod
    def detect(self, data: Any) -> bool:
        """Returns True if this parser can handle the given data."""
        ...

    @abstractmethod
    def parse(self, data: Any) -> list[CanonicalConversation]:
        """Parses raw export data into canonical conversations."""
        ...

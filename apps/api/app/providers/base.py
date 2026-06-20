"""Abstract base provider interface."""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.models.provider import ProviderAccount


@dataclass
class CanonicalMessage:
    """Normalized message format shared by all providers."""

    external_id: str | None = None
    role: str = "user"
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
    """Strict provider adapter contract used by imports and account sync."""

    name: str = "Unknown"
    slug: str = "unknown"
    version: str = "1.0"

    @abstractmethod
    def detect_format(self, raw: bytes) -> bool:
        """Return True if this provider can parse the raw export."""

    @abstractmethod
    def parse(self, raw: bytes, version: str = "latest") -> list[CanonicalConversation]:
        """Parse raw export bytes into canonical conversations."""

    @abstractmethod
    async def sync(self, account: ProviderAccount) -> AsyncIterator[CanonicalConversation]:
        """Incremental API sync for connected provider accounts."""

    @abstractmethod
    def get_schema_version(self) -> str:
        """Return the parser schema version for migration tracking."""

    def detect(self, data: Any) -> bool:
        """Compatibility shim for older call sites and tests."""
        return self.detect_format(self._coerce_raw(data))

    def parse_data(self, data: Any, version: str = "latest") -> list[CanonicalConversation]:
        """Compatibility shim for callers that already decoded the payload."""
        return self.parse(self._coerce_raw(data), version=version)

    def _load_json(self, raw: bytes) -> Any:
        return json.loads(raw.decode("utf-8"))

    def _coerce_raw(self, data: Any) -> bytes:
        if isinstance(data, bytes):
            return data
        if isinstance(data, str):
            return data.encode("utf-8")
        return json.dumps(data).encode("utf-8")

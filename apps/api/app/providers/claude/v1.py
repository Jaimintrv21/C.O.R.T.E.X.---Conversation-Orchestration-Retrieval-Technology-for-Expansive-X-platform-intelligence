"""Claude export parser v1."""
from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import datetime

from app.models.provider import ProviderAccount
from app.providers.base import BaseProvider, CanonicalConversation, CanonicalMessage


class ClaudeV1Parser(BaseProvider):
    name = "Claude"
    slug = "claude"
    version = "1.0"

    def detect_format(self, raw: bytes) -> bool:
        try:
            data = self._load_json(raw)
        except (UnicodeDecodeError, ValueError):
            return False

        if not isinstance(data, list) or not data:
            return False
        sample = data[0]
        return isinstance(sample, dict) and "chat_messages" in sample and "uuid" in sample

    def parse(self, raw: bytes, version: str = "latest") -> list[CanonicalConversation]:
        data = self._load_json(raw)
        if not isinstance(data, list):
            return []

        conversations: list[CanonicalConversation] = []
        for conv_data in data:
            conv = self._parse_conversation(conv_data)
            if conv:
                conversations.append(conv)
        return conversations

    async def sync(self, account: ProviderAccount) -> AsyncIterator[CanonicalConversation]:
        if False:
            yield CanonicalConversation(external_id="")
        raise NotImplementedError("Claude incremental sync is not implemented yet")

    def get_schema_version(self) -> str:
        return "claude.v1"

    def _parse_conversation(self, raw: dict) -> CanonicalConversation | None:
        messages: list[CanonicalMessage] = []
        for msg in raw.get("chat_messages", []):
            role = "assistant" if msg.get("sender") == "assistant" else "user"
            content = msg.get("text", "")
            if not content.strip():
                continue

            created = None
            if msg.get("created_at"):
                try:
                    created = datetime.fromisoformat(msg["created_at"].replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    created = None

            messages.append(
                CanonicalMessage(
                    external_id=msg.get("uuid"),
                    role=role,
                    content=content,
                    created_at=created,
                    metadata={"attachments": msg.get("attachments", [])},
                )
            )

        if not messages:
            return None

        created = None
        if raw.get("created_at"):
            try:
                created = datetime.fromisoformat(raw["created_at"].replace("Z", "+00:00"))
            except (ValueError, TypeError):
                created = None

        return CanonicalConversation(
            external_id=raw.get("uuid", ""),
            title=raw.get("name"),
            messages=messages,
            provider_slug=self.slug,
            started_at=created,
            metadata={
                "project_uuid": raw.get("project_uuid"),
                "model": raw.get("model"),
            },
        )

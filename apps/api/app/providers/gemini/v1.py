"""Gemini Takeout export parser v1."""
from __future__ import annotations

from collections.abc import AsyncIterator

from app.models.provider import ProviderAccount
from app.providers.base import BaseProvider, CanonicalConversation, CanonicalMessage


class GeminiV1Parser(BaseProvider):
    name = "Gemini"
    slug = "gemini"
    version = "1.0"

    def detect_format(self, raw: bytes) -> bool:
        try:
            data = self._load_json(raw)
        except (UnicodeDecodeError, ValueError):
            return False

        if isinstance(data, list) and data:
            sample = data[0]
            return isinstance(sample, dict) and ("parts" in sample or "candidates" in sample)
        if isinstance(data, dict):
            return "conversations" in data or "gemini_history" in data
        return False

    def parse(self, raw: bytes, version: str = "latest") -> list[CanonicalConversation]:
        data = self._load_json(raw)
        if isinstance(data, dict):
            data = data.get("conversations", data.get("gemini_history", []))
        if not isinstance(data, list):
            return []

        conversations: list[CanonicalConversation] = []
        for index, conv_data in enumerate(data):
            if isinstance(conv_data, dict):
                conv = self._parse_conversation(conv_data, index)
                if conv:
                    conversations.append(conv)
        return conversations

    async def sync(self, account: ProviderAccount) -> AsyncIterator[CanonicalConversation]:
        if False:
            yield CanonicalConversation(external_id="")
        raise self._live_sync_not_supported()

    def get_schema_version(self) -> str:
        return "gemini.v1"

    def _parse_conversation(self, raw: dict, index: int) -> CanonicalConversation | None:
        turns = raw.get("turns", raw.get("messages", []))
        messages: list[CanonicalMessage] = []

        for turn_index, turn in enumerate(turns):
            role = turn.get("role", "user")
            if role == "model":
                role = "assistant"

            parts = turn.get("parts", [])
            if isinstance(parts, list):
                content = "\n".join(
                    part.get("text", str(part))
                    for part in parts
                    if isinstance(part, dict)
                )
            else:
                content = str(parts)

            if not content.strip():
                continue

            messages.append(
                CanonicalMessage(
                    external_id=f"gemini-{index}-{turn_index}",
                    role=role,
                    content=content,
                )
            )

        if not messages:
            return None

        return CanonicalConversation(
            external_id=raw.get("id", f"gemini-conv-{index}"),
            title=raw.get("title"),
            messages=messages,
            provider_slug=self.slug,
        )

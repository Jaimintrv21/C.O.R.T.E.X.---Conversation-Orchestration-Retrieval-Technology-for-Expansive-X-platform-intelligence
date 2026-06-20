"""Generic JSON parser fallback."""
from __future__ import annotations

from collections.abc import AsyncIterator

from app.providers.base import BaseProvider, CanonicalConversation, CanonicalMessage


class GenericJsonParser(BaseProvider):
    name = "Generic JSON"
    slug = "generic"
    version = "1.0"

    def detect_format(self, raw: bytes) -> bool:
        try:
            data = self._load_json(raw)
        except (UnicodeDecodeError, ValueError):
            return False

        if isinstance(data, list) and data:
            return isinstance(data[0], dict)
        if isinstance(data, dict):
            return "messages" in data or "conversations" in data
        return False

    def parse(self, raw: bytes, version: str = "latest") -> list[CanonicalConversation]:
        data = self._load_json(raw)
        if isinstance(data, dict):
            if "conversations" in data:
                data = data["conversations"]
            elif "messages" in data:
                data = [data]
            else:
                data = [data]

        if not isinstance(data, list):
            return []

        conversations: list[CanonicalConversation] = []
        for index, item in enumerate(data):
            if not isinstance(item, dict):
                continue
            conv = self._parse_item(item, index)
            if conv:
                conversations.append(conv)
        return conversations

    async def sync(self, account: dict) -> AsyncIterator[CanonicalConversation]:
        if False:
            yield CanonicalConversation(external_id="")
        raise self._live_sync_not_supported()

    def get_schema_version(self) -> str:
        return "generic.v1"

    def _parse_item(self, raw: dict, index: int) -> CanonicalConversation | None:
        raw_msgs = raw.get("messages", raw.get("chat", []))
        if not isinstance(raw_msgs, list):
            return None

        messages: list[CanonicalMessage] = []
        for message_index, msg in enumerate(raw_msgs):
            if not isinstance(msg, dict):
                continue
            role = msg.get("role", msg.get("author", "user"))
            content = msg.get("content", msg.get("text", msg.get("body", "")))
            if isinstance(content, list):
                content = "\n".join(str(value) for value in content)
            if not str(content).strip():
                continue

            messages.append(
                CanonicalMessage(
                    external_id=msg.get("id", f"gen-{index}-{message_index}"),
                    role=str(role),
                    content=str(content),
                    model=msg.get("model"),
                )
            )

        if not messages:
            return None

        return CanonicalConversation(
            external_id=raw.get("id", f"generic-{index}"),
            title=raw.get("title", raw.get("name")),
            messages=messages,
            provider_slug=self.slug,
        )

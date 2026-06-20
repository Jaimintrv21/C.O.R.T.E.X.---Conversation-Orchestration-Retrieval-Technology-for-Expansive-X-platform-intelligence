"""ChatGPT export parser v1."""
from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import datetime, timezone

from app.providers.base import BaseProvider, CanonicalConversation, CanonicalMessage


class ChatGPTv1Parser(BaseProvider):
    name = "ChatGPT"
    slug = "chatgpt"
    version = "1.0"

    def detect_format(self, raw: bytes) -> bool:
        try:
            data = self._load_json(raw)
        except (UnicodeDecodeError, ValueError):
            return False

        if not isinstance(data, list) or not data:
            return False
        sample = data[0]
        return isinstance(sample, dict) and "mapping" in sample and "title" in sample

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

    async def sync(self, account: dict) -> AsyncIterator[CanonicalConversation]:
        if False:
            yield CanonicalConversation(external_id="")
        raise self._live_sync_not_supported()

    def get_schema_version(self) -> str:
        return "chatgpt.v1"

    def _parse_conversation(self, raw: dict) -> CanonicalConversation | None:
        conv_id = raw.get("id", "")
        title = raw.get("title", "Untitled")
        create_time = raw.get("create_time")
        update_time = raw.get("update_time")
        mapping = raw.get("mapping", {})

        sorted_nodes = sorted(
            mapping.values(),
            key=lambda node: (node.get("message", {}) or {}).get("create_time") or 0,
        )

        messages: list[CanonicalMessage] = []
        for node in sorted_nodes:
            msg_data = node.get("message")
            if not msg_data:
                continue

            role = (msg_data.get("author") or {}).get("role", "unknown")
            if role not in {"user", "assistant", "system", "tool"}:
                continue

            content_parts = (msg_data.get("content") or {}).get("parts", [])
            content = "\n".join(str(part) for part in content_parts if isinstance(part, str))
            if not content.strip():
                continue

            msg_time = msg_data.get("create_time")
            created_at = datetime.fromtimestamp(msg_time, tz=timezone.utc) if msg_time else None

            messages.append(
                CanonicalMessage(
                    external_id=node.get("id"),
                    role=role,
                    content=content,
                    model=(msg_data.get("metadata") or {}).get("model_slug"),
                    parent_id=node.get("parent"),
                    created_at=created_at,
                    metadata={
                        "status": msg_data.get("status"),
                        "weight": msg_data.get("weight"),
                    },
                )
            )

        if not messages:
            return None

        started = datetime.fromtimestamp(create_time, tz=timezone.utc) if create_time else None
        ended = datetime.fromtimestamp(update_time, tz=timezone.utc) if update_time else None

        return CanonicalConversation(
            external_id=conv_id,
            title=title,
            messages=messages,
            provider_slug=self.slug,
            started_at=started,
            ended_at=ended,
            metadata={
                "plugin_ids": raw.get("plugin_ids"),
                "conversation_template_id": raw.get("conversation_template_id"),
            },
        )

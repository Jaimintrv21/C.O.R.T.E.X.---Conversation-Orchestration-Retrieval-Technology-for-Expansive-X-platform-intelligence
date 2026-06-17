"""ChatGPT export parser v1 — handles conversations.json from Settings > Export Data."""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any
from app.providers.base import BaseProvider, CanonicalConversation, CanonicalMessage


class ChatGPTv1Parser(BaseProvider):
    name = "ChatGPT"
    slug = "chatgpt"
    version = "1.0"

    def detect(self, data: Any) -> bool:
        """ChatGPT exports are a list of dicts with 'mapping' and 'title' keys."""
        if not isinstance(data, list):
            return False
        if len(data) == 0:
            return False
        sample = data[0]
        return isinstance(sample, dict) and "mapping" in sample and "title" in sample

    def parse(self, data: Any) -> list[CanonicalConversation]:
        if not isinstance(data, list):
            return []

        conversations = []
        for conv_data in data:
            conv = self._parse_conversation(conv_data)
            if conv:
                conversations.append(conv)
        return conversations

    def _parse_conversation(self, raw: dict) -> CanonicalConversation | None:
        conv_id = raw.get("id", "")
        title = raw.get("title", "Untitled")
        create_time = raw.get("create_time")
        update_time = raw.get("update_time")

        messages = []
        mapping = raw.get("mapping", {})

        # Build ordered message list from the tree structure
        sorted_nodes = sorted(
            mapping.values(),
            key=lambda n: (n.get("message", {}) or {}).get("create_time") or 0,
        )

        seq = 0
        for node in sorted_nodes:
            msg_data = node.get("message")
            if not msg_data:
                continue

            author = msg_data.get("author", {})
            role = author.get("role", "unknown")
            if role not in ("user", "assistant", "system", "tool"):
                continue

            content_parts = msg_data.get("content", {}).get("parts", [])
            content = "\n".join(str(p) for p in content_parts if isinstance(p, str))
            if not content.strip():
                continue

            msg_time = msg_data.get("create_time")
            created_at = datetime.fromtimestamp(msg_time, tz=timezone.utc) if msg_time else None

            model_slug = msg_data.get("metadata", {}).get("model_slug")

            messages.append(CanonicalMessage(
                external_id=node.get("id"),
                role=role,
                content=content,
                model=model_slug,
                parent_id=node.get("parent"),
                created_at=created_at,
                metadata={"status": msg_data.get("status"), "weight": msg_data.get("weight")},
            ))
            seq += 1

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
            metadata={"plugin_ids": raw.get("plugin_ids"), "conversation_template_id": raw.get("conversation_template_id")},
        )

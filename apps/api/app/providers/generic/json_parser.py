"""Generic JSON parser — fallback for unrecognized JSON exports."""
from __future__ import annotations
from typing import Any
from app.providers.base import BaseProvider, CanonicalConversation, CanonicalMessage


class GenericJsonParser(BaseProvider):
    name = "Generic JSON"
    slug = "generic"
    version = "1.0"

    def detect(self, data: Any) -> bool:
        """Accepts any list of dicts with message-like structure."""
        if isinstance(data, list) and len(data) > 0:
            return isinstance(data[0], dict)
        if isinstance(data, dict):
            return "messages" in data or "conversations" in data
        return False

    def parse(self, data: Any) -> list[CanonicalConversation]:
        if isinstance(data, dict):
            if "conversations" in data:
                data = data["conversations"]
            elif "messages" in data:
                # Single conversation
                data = [data]
            else:
                data = [data]

        if not isinstance(data, list):
            return []

        conversations = []
        for i, item in enumerate(data):
            if not isinstance(item, dict):
                continue
            conv = self._parse_item(item, i)
            if conv:
                conversations.append(conv)
        return conversations

    def _parse_item(self, raw: dict, index: int) -> CanonicalConversation | None:
        messages = []
        raw_msgs = raw.get("messages", raw.get("chat", []))

        if not isinstance(raw_msgs, list):
            return None

        for j, msg in enumerate(raw_msgs):
            if not isinstance(msg, dict):
                continue
            role = msg.get("role", msg.get("author", "user"))
            content = msg.get("content", msg.get("text", msg.get("body", "")))
            if isinstance(content, list):
                content = "\n".join(str(c) for c in content)
            if not str(content).strip():
                continue

            messages.append(CanonicalMessage(
                external_id=msg.get("id", f"gen-{index}-{j}"),
                role=str(role),
                content=str(content),
                model=msg.get("model"),
            ))

        if not messages:
            return None

        return CanonicalConversation(
            external_id=raw.get("id", f"generic-{index}"),
            title=raw.get("title", raw.get("name")),
            messages=messages,
            provider_slug=self.slug,
        )

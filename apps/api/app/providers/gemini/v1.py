"""Gemini Takeout export parser v1."""
from __future__ import annotations
from datetime import datetime
from typing import Any
from app.providers.base import BaseProvider, CanonicalConversation, CanonicalMessage


class GeminiV1Parser(BaseProvider):
    name = "Gemini"
    slug = "gemini"
    version = "1.0"

    def detect(self, data: Any) -> bool:
        """Gemini takeout: list of dicts or single dict with conversation-like keys."""
        if isinstance(data, list) and len(data) > 0:
            sample = data[0]
            return isinstance(sample, dict) and ("parts" in sample or "candidates" in sample)
        if isinstance(data, dict):
            return "conversations" in data or "gemini_history" in data
        return False

    def parse(self, data: Any) -> list[CanonicalConversation]:
        # Handle wrapper object
        if isinstance(data, dict):
            data = data.get("conversations", data.get("gemini_history", []))
        if not isinstance(data, list):
            return []

        conversations = []
        for i, conv_data in enumerate(data):
            if isinstance(conv_data, dict):
                conv = self._parse_conversation(conv_data, i)
                if conv:
                    conversations.append(conv)
        return conversations

    def _parse_conversation(self, raw: dict, index: int) -> CanonicalConversation | None:
        messages = []
        turns = raw.get("turns", raw.get("messages", []))

        for j, turn in enumerate(turns):
            role = turn.get("role", "user")
            if role == "model":
                role = "assistant"

            parts = turn.get("parts", [])
            content = "\n".join(
                p.get("text", str(p)) for p in parts if isinstance(p, dict)
            ) if isinstance(parts, list) else str(parts)

            if not content.strip():
                continue

            messages.append(CanonicalMessage(
                external_id=f"gemini-{index}-{j}",
                role=role,
                content=content,
            ))

        if not messages:
            return None

        return CanonicalConversation(
            external_id=raw.get("id", f"gemini-conv-{index}"),
            title=raw.get("title"),
            messages=messages,
            provider_slug=self.slug,
        )

"""Claude API-log sync.

This syncs the user's own API usage logs or self-hosted logging stream, not
consumer claude.ai browser history. The supported path is BYO logging via the
`/ingest/api-log` webhook or a companion SDK that forwards the user's own API
calls into C.O.R.T.E.X. in real time.
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import datetime
from typing import Any

from app.firestore import FirestoreStore
from app.providers.base import BaseProvider, CanonicalConversation
from app.providers.registry import normalize_extension_conversations


def _get_value(account: dict | dict[str, Any], key: str) -> Any:
    if isinstance(account, dict):
        return account.get(key)
    return getattr(account, key, None)


class ClaudeApiLogSyncProvider(BaseProvider):
    name = "Claude API Logs"
    slug = "claude-api-log"
    version = "1.0"

    def detect_format(self, raw: bytes) -> bool:
        return False

    def parse(self, raw: bytes, version: str = "latest") -> list[CanonicalConversation]:
        return []

    async def sync(self, account: dict) -> AsyncIterator[CanonicalConversation]:
        store = FirestoreStore()
        user_id = str(_get_value(account, "user_id") or "")
        provider_account_id = str(_get_value(account, "id") or "")
        since = _get_value(account, "last_synced_at")
        if isinstance(since, str):
            try:
                since = datetime.fromisoformat(since)
            except ValueError:
                since = None

        logs = store.list_api_logs(
            user_id=user_id,
            provider_account_id=provider_account_id,
            provider_slug="claude",
            since=since,
        )
        for log in logs:
            for conversation in normalize_extension_conversations("claude", log.get("conversations") or []):
                yield conversation

    def get_schema_version(self) -> str:
        return "claude.api_log.v1"

"""Meilisearch-backed full-text search service.

Handles:
- Indexing conversations/messages into Meilisearch on create
- Scoped search queries that enforce user_id / workspace_id tenant isolation
- Prefix-search for query suggestions
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

import structlog

from app.config import Settings, get_settings

logger = structlog.get_logger()

CONVERSATIONS_INDEX = "cortex_conversations"
MESSAGES_INDEX = "cortex_messages"


@dataclass(slots=True)
class FullTextHit:
    """A single full-text search result."""
    conversation_id: str
    message_id: str | None
    title: str | None
    snippet: str
    score: float
    provider_slug: str | None = None
    highlights: list[str] | None = None
    created_at: datetime | None = None


class MeilisearchService:
    """Full-text search via Meilisearch.

    Tenant isolation: every indexed document includes ``user_id`` and
    ``workspace_id`` as filterable attributes.  All search queries
    ALWAYS filter by ``user_id`` server-side — the client is never
    trusted to scope correctly.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client: Any = None

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client
        try:
            import meilisearch
        except ImportError as exc:
            raise RuntimeError(
                "meilisearch is required for full-text search. "
                "Install it with: pip install meilisearch"
            ) from exc
        self._client = meilisearch.Client(
            self.settings.meilisearch_url,
            self.settings.meilisearch_api_key,
        )
        self._ensure_indexes()
        return self._client

    def _ensure_indexes(self) -> None:
        """Create indexes with filterable and searchable attributes if they don't exist."""
        client = self._client
        if client is None:
            return

        try:
            client.create_index(MESSAGES_INDEX, {"primaryKey": "id"})
        except Exception:
            pass  # Already exists

        try:
            idx = client.index(MESSAGES_INDEX)
            idx.update_filterable_attributes([
                "user_id", "workspace_id", "conversation_id", "provider_slug",
            ])
            idx.update_searchable_attributes([
                "content", "conversation_title", "tags", "topics",
            ])
            idx.update_sortable_attributes(["created_at"])
        except Exception as exc:
            logger.warning("meilisearch_index_setup_warning", error=str(exc))

    # ── Indexing ─────────────────────────────────────────────────────────

    def index_message(
        self,
        *,
        message_id: str,
        conversation_id: str,
        user_id: str,
        workspace_id: str | None,
        content: str,
        provider_slug: str | None,
        conversation_title: str | None = None,
        tags: list[str] | None = None,
        topics: list[str] | None = None,
        created_at: datetime | None = None,
    ) -> None:
        """Index a single message into Meilisearch."""
        try:
            client = self._get_client()
            doc = {
                "id": message_id,
                "conversation_id": conversation_id,
                "user_id": user_id,
                "workspace_id": workspace_id,
                "content": content,
                "provider_slug": provider_slug,
                "conversation_title": conversation_title or "",
                "tags": tags or [],
                "topics": topics or [],
                "created_at": created_at.isoformat() if created_at else None,
            }
            client.index(MESSAGES_INDEX).add_documents([doc])
        except Exception as exc:
            logger.warning("meilisearch_index_failed", message_id=message_id, error=str(exc))

    def index_messages_batch(self, documents: list[dict[str, Any]]) -> None:
        """Index multiple message documents in a single batch."""
        if not documents:
            return
        try:
            client = self._get_client()
            client.index(MESSAGES_INDEX).add_documents(documents)
        except Exception as exc:
            logger.warning("meilisearch_batch_index_failed", count=len(documents), error=str(exc))

    def remove_message(self, message_id: str) -> None:
        """Remove a message from the Meilisearch index."""
        try:
            client = self._get_client()
            client.index(MESSAGES_INDEX).delete_document(message_id)
        except Exception as exc:
            logger.warning("meilisearch_remove_failed", message_id=message_id, error=str(exc))

    # ── Querying ─────────────────────────────────────────────────────────

    def search(
        self,
        query: str,
        *,
        user_id: str,
        workspace_id: str | None = None,
        provider_slug: str | None = None,
        limit: int = 20,
    ) -> list[FullTextHit]:
        """Run a full-text search, always scoped to user_id."""
        try:
            client = self._get_client()
        except Exception as exc:
            logger.warning("meilisearch_unavailable", error=str(exc))
            return []

        # Build filter — ALWAYS scope by user_id
        filters = [f'user_id = "{user_id}"']
        if workspace_id:
            filters.append(f'workspace_id = "{workspace_id}"')
        if provider_slug:
            filters.append(f'provider_slug = "{provider_slug}"')

        filter_str = " AND ".join(filters)

        try:
            result = client.index(MESSAGES_INDEX).search(
                query,
                {
                    "filter": filter_str,
                    "limit": limit,
                    "attributesToHighlight": ["content"],
                    "highlightPreTag": "**",
                    "highlightPostTag": "**",
                    "attributesToCrop": ["content"],
                    "cropLength": 60,
                },
            )
        except Exception as exc:
            logger.warning("meilisearch_search_failed", query=query, error=str(exc))
            return []

        hits: list[FullTextHit] = []
        for raw_hit in result.get("hits", []):
            formatted = raw_hit.get("_formatted", {})
            snippet = formatted.get("content") or raw_hit.get("content", "")
            # Extract highlight fragments
            highlights = []
            if "**" in snippet:
                import re
                highlights = re.findall(r"\*\*(.+?)\*\*", snippet)

            hits.append(
                FullTextHit(
                    conversation_id=raw_hit.get("conversation_id", ""),
                    message_id=raw_hit.get("id"),
                    title=raw_hit.get("conversation_title"),
                    snippet=snippet[:240],
                    score=1.0,  # Meilisearch doesn't expose numeric relevance
                    provider_slug=raw_hit.get("provider_slug"),
                    highlights=highlights or None,
                    created_at=None,
                )
            )
        return hits

    def suggest(self, prefix: str, *, user_id: str, limit: int = 10) -> list[str]:
        """Prefix search for query suggestions — uses Meilisearch's typo tolerance."""
        try:
            client = self._get_client()
            result = client.index(MESSAGES_INDEX).search(
                prefix,
                {
                    "filter": f'user_id = "{user_id}"',
                    "limit": limit,
                    "attributesToRetrieve": ["conversation_title", "topics"],
                },
            )
        except Exception:
            return []

        seen: set[str] = set()
        suggestions: list[str] = []
        prefix_lower = prefix.lower()
        for hit in result.get("hits", []):
            for text in [hit.get("conversation_title"), *(hit.get("topics") or [])]:
                if not text:
                    continue
                key = str(text).lower()
                if prefix_lower and prefix_lower not in key:
                    continue
                if key in seen:
                    continue
                seen.add(key)
                suggestions.append(str(text))
                if len(suggestions) >= limit:
                    return suggestions
        return suggestions

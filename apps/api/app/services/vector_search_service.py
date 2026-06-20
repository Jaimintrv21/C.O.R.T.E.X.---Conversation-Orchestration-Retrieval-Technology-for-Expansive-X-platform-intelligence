"""Vector search backends for semantic similarity.

Provides a SearchBackend protocol (consistent with the existing EmbeddingBackend
protocol in embedding_service.py) and two implementations:

1. InMemoryCosineBackend (DEFAULT) — loads candidate embeddings from Firestore
   and computes cosine similarity in application code. Zero extra infrastructure,
   suitable for self-hosted single-user / small-team deployments (< ~500K chunks).

2. QdrantBackend (OPT-IN) — delegates to a Qdrant instance for users with
   large corpora.  See TDR-006 for the architectural reasoning.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Protocol

from app.firestore import FirestoreStore


@dataclass(slots=True)
class VectorSearchHit:
    """A single result from a vector similarity search."""
    conversation_id: str
    message_id: str
    chunk_text: str
    similarity: float
    provider_slug: str | None = None
    created_at: datetime | None = None


class SearchBackend(Protocol):
    """Protocol for pluggable vector search implementations."""

    def search(
        self,
        query_vector: list[float],
        *,
        user_id: str,
        workspace_id: str | None = None,
        provider_slug: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 20,
    ) -> list[VectorSearchHit]:
        """Return nearest-neighbor results scoped to the requesting user."""
        ...


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two equal-length vectors."""
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


class InMemoryCosineBackend:
    """Default zero-infrastructure search: loads embeddings from Firestore,
    computes cosine similarity in-process, and returns top-K results.

    Acceptable for corpora up to ~500K chunks on modest hardware.
    """

    def __init__(self, store: FirestoreStore | None = None) -> None:
        self.store = store or FirestoreStore()

    def search(
        self,
        query_vector: list[float],
        *,
        user_id: str,
        workspace_id: str | None = None,
        provider_slug: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 20,
    ) -> list[VectorSearchHit]:
        # Always scope by user_id — never trust caller to scope correctly
        candidates = self.store.list_embeddings_for_user(
            user_id,
            workspace_id=workspace_id,
            provider_slug=provider_slug,
        )

        scored: list[tuple[float, dict[str, Any]]] = []
        for emb in candidates:
            vec = emb.get("vector")
            if not vec or not isinstance(vec, list):
                continue

            # Date filtering
            created = emb.get("created_at")
            if date_from and created:
                created_date = created.date() if isinstance(created, datetime) else created
                if created_date < date_from:
                    continue
            if date_to and created:
                created_date = created.date() if isinstance(created, datetime) else created
                if created_date > date_to:
                    continue

            sim = _cosine_similarity(query_vector, vec)
            scored.append((sim, emb))

        scored.sort(key=lambda pair: pair[0], reverse=True)

        results: list[VectorSearchHit] = []
        for sim, emb in scored[:limit]:
            results.append(
                VectorSearchHit(
                    conversation_id=str(emb.get("conversation_id", "")),
                    message_id=str(emb.get("message_id", "")),
                    chunk_text=str(emb.get("chunk_text", "")),
                    similarity=round(sim, 6),
                    provider_slug=emb.get("provider_slug"),
                    created_at=emb.get("created_at"),
                )
            )
        return results


class QdrantBackend:
    """Optional high-scale backend using Qdrant.

    Requires ``qdrant-client`` to be installed and a Qdrant instance
    running (add to docker-compose via profile).  Designed as an escape
    hatch for users with > 500K chunks.
    """

    def __init__(
        self,
        url: str = "http://localhost:6333",
        collection_name: str = "cortex_embeddings",
    ) -> None:
        self._url = url
        self._collection_name = collection_name
        self._client: Any = None

    def _get_client(self) -> Any:
        if self._client is None:
            try:
                from qdrant_client import QdrantClient
            except ImportError as exc:
                raise RuntimeError(
                    "qdrant-client is required for the Qdrant search backend. "
                    "Install it with: pip install qdrant-client"
                ) from exc
            self._client = QdrantClient(url=self._url)
        return self._client

    def search(
        self,
        query_vector: list[float],
        *,
        user_id: str,
        workspace_id: str | None = None,
        provider_slug: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 20,
    ) -> list[VectorSearchHit]:
        from qdrant_client.models import Filter, FieldCondition, MatchValue, Range

        must_conditions = [
            FieldCondition(key="user_id", match=MatchValue(value=user_id)),
        ]
        if workspace_id:
            must_conditions.append(
                FieldCondition(key="workspace_id", match=MatchValue(value=workspace_id)),
            )
        if provider_slug:
            must_conditions.append(
                FieldCondition(key="provider_slug", match=MatchValue(value=provider_slug)),
            )

        client = self._get_client()
        hits = client.search(
            collection_name=self._collection_name,
            query_vector=query_vector,
            query_filter=Filter(must=must_conditions),
            limit=limit,
        )

        results: list[VectorSearchHit] = []
        for hit in hits:
            payload = hit.payload or {}
            results.append(
                VectorSearchHit(
                    conversation_id=str(payload.get("conversation_id", "")),
                    message_id=str(payload.get("message_id", "")),
                    chunk_text=str(payload.get("chunk_text", "")),
                    similarity=round(float(hit.score), 6),
                    provider_slug=payload.get("provider_slug"),
                    created_at=payload.get("created_at"),
                )
            )
        return results


def get_search_backend(backend_type: str = "memory", **kwargs: Any) -> SearchBackend:
    """Factory: returns the configured SearchBackend implementation."""
    if backend_type == "qdrant":
        return QdrantBackend(**kwargs)
    return InMemoryCosineBackend(**kwargs)

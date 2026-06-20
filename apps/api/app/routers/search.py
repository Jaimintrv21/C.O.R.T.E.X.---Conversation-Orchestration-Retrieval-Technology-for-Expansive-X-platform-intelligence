"""Search router: semantic, full-text, hybrid, and suggestions.

All search paths enforce user_id (and optionally workspace_id) scoping
per the tenant-isolation requirements — search is the highest-risk
surface for cross-tenant data leaks.
"""
from __future__ import annotations

import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.firestore import FirestoreStore
from app.schemas.common import ApiListResponse
from app.schemas.search import (
    FullTextSearchRequest,
    HybridSearchRequest,
    SearchHit,
    SearchSuggestion,
    SemanticSearchRequest,
    SimilaritySearchRequest,
)

router = APIRouter(prefix="/search", tags=["Search"])


# ── Helpers ──────────────────────────────────────────────────────────────


def _score_text(query: str, text: str) -> float:
    """Simple keyword overlap scorer (legacy fallback)."""
    query_terms = [term for term in query.lower().split() if term]
    if not query_terms:
        return 0.0
    haystack = text.lower()
    matches = sum(1 for term in query_terms if term in haystack)
    return matches / len(query_terms)


async def _run_semantic_search(
    query: str,
    *,
    user_id: str,
    limit: int = 20,
    provider_filter: str | None = None,
    date_from=None,
    date_to=None,
    workspace_id: str | None = None,
) -> list[SearchHit]:
    """Core semantic search logic — embed query, rank by cosine similarity."""
    from app.services.embedding_service import EmbeddingService
    from app.services.vector_search_service import InMemoryCosineBackend

    service = EmbeddingService()

    # Embed the query using the SAME model as stored content
    try:
        batch = await service.embed_chunks(
            [
                __import__("app.services.embedding_service", fromlist=["EmbeddingChunk"]).EmbeddingChunk(
                    conversation_id="__query__",
                    message_id="__query__",
                    chunk_index=0,
                    text=query,
                    token_count=len(query.split()),
                )
            ]
        )
        query_vector = batch.vectors[0] if batch.vectors else None
    except Exception:
        query_vector = None

    if not query_vector:
        # Fallback to keyword scoring if embedding generation fails
        return await _run_keyword_search(
            query,
            user_id=user_id,
            limit=limit,
            provider_filter=provider_filter,
        )

    store = FirestoreStore()
    backend = InMemoryCosineBackend(store=store)
    vector_hits = backend.search(
        query_vector,
        user_id=user_id,
        workspace_id=workspace_id,
        provider_slug=provider_filter,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )

    # Hydrate with conversation titles
    conv_cache: dict[str, dict] = {}
    results: list[SearchHit] = []
    for hit in vector_hits:
        if hit.conversation_id not in conv_cache:
            conv = store.get_conversation(hit.conversation_id)
            conv_cache[hit.conversation_id] = conv or {}
        conv = conv_cache[hit.conversation_id]

        # Verify user ownership (defense in depth)
        if conv.get("user_id") != user_id:
            continue

        results.append(
            SearchHit(
                conversation_id=hit.conversation_id,
                message_id=hit.message_id,
                title=conv.get("title"),
                snippet=hit.chunk_text[:240],
                score=hit.similarity,
                similarity_score=hit.similarity,
                provider_slug=hit.provider_slug or conv.get("provider_slug"),
                created_at=hit.created_at.isoformat() if hit.created_at and hasattr(hit.created_at, "isoformat") else None,
                match_type="semantic",
                highlights=[query],
            )
        )
    return results


async def _run_keyword_search(
    query: str,
    *,
    user_id: str,
    limit: int = 20,
    provider_filter: str | None = None,
) -> list[SearchHit]:
    """Legacy keyword-based fallback when embedding generation isn't available."""
    store = FirestoreStore()
    conversations = store.list_conversations(user_id)
    hits = []
    for conversation in conversations:
        if provider_filter and conversation.get("provider_slug") != provider_filter:
            continue
        text = " ".join([
            conversation.get("title") or "",
            conversation.get("summary") or "",
            conversation.get("preview") or "",
            " ".join(conversation.get("tags") or []),
            " ".join(conversation.get("topics") or []),
        ])
        score = _score_text(query, text)
        if score <= 0:
            continue
        hits.append(
            SearchHit(
                conversation_id=conversation["id"],
                message_id=None,
                title=conversation.get("title"),
                snippet=(conversation.get("preview") or conversation.get("summary") or "")[:240],
                score=score,
                provider_slug=conversation.get("provider_slug"),
                match_type="exact",
                highlights=[query],
            )
        )
    hits.sort(key=lambda h: h.score, reverse=True)
    return hits[:limit]


async def _run_fulltext_search(
    query: str,
    *,
    user_id: str,
    limit: int = 20,
    provider_filter: str | None = None,
    workspace_id: str | None = None,
) -> list[SearchHit]:
    """Full-text search via Meilisearch with keyword fallback."""
    try:
        from app.services.fulltext_search_service import MeilisearchService

        meili = MeilisearchService()
        ft_hits = meili.search(
            query,
            user_id=user_id,
            workspace_id=workspace_id,
            provider_slug=provider_filter,
            limit=limit,
        )
        if ft_hits:
            store = FirestoreStore()
            conv_cache: dict[str, dict] = {}
            results: list[SearchHit] = []
            for hit in ft_hits:
                if hit.conversation_id not in conv_cache:
                    conv = store.get_conversation(hit.conversation_id)
                    conv_cache[hit.conversation_id] = conv or {}
                conv = conv_cache[hit.conversation_id]

                # Defense in depth: verify user_id
                if conv.get("user_id") != user_id:
                    continue

                results.append(
                    SearchHit(
                        conversation_id=hit.conversation_id,
                        message_id=hit.message_id,
                        title=hit.title or conv.get("title"),
                        snippet=hit.snippet[:240],
                        score=hit.score,
                        provider_slug=hit.provider_slug or conv.get("provider_slug"),
                        match_type="exact",
                        highlights=hit.highlights,
                    )
                )
            return results
    except Exception:
        pass

    # Fallback to keyword search
    return await _run_keyword_search(
        query,
        user_id=user_id,
        limit=limit,
        provider_filter=provider_filter,
    )


def _reciprocal_rank_fusion(
    semantic_hits: list[SearchHit],
    fulltext_hits: list[SearchHit],
    *,
    k: int = 60,
    limit: int = 20,
) -> list[SearchHit]:
    """Merge semantic and full-text results using Reciprocal Rank Fusion.

    Items appearing in both lists get higher combined scores.  Each result
    is annotated with match_type: "semantic", "exact", or "both".
    """
    # Key by (conversation_id, message_id) — message_id may be None
    scores: dict[tuple[str, str | None], float] = {}
    hit_map: dict[tuple[str, str | None], SearchHit] = {}
    sources: dict[tuple[str, str | None], set[str]] = {}

    for rank, hit in enumerate(semantic_hits):
        key = (hit.conversation_id, hit.message_id)
        rrf_score = 1.0 / (k + rank + 1)
        scores[key] = scores.get(key, 0.0) + rrf_score
        hit_map[key] = hit
        sources.setdefault(key, set()).add("semantic")

    for rank, hit in enumerate(fulltext_hits):
        key = (hit.conversation_id, hit.message_id)
        rrf_score = 1.0 / (k + rank + 1)
        scores[key] = scores.get(key, 0.0) + rrf_score
        if key not in hit_map:
            hit_map[key] = hit
        else:
            # Merge highlights
            existing = hit_map[key]
            merged_highlights = list(set((existing.highlights or []) + (hit.highlights or [])))
            hit_map[key] = SearchHit(
                conversation_id=existing.conversation_id,
                message_id=existing.message_id,
                title=existing.title or hit.title,
                snippet=existing.snippet or hit.snippet,
                score=scores[key],
                similarity_score=existing.similarity_score,
                provider_slug=existing.provider_slug or hit.provider_slug,
                created_at=existing.created_at or hit.created_at,
                match_type="both",
                highlights=merged_highlights or None,
            )
        sources.setdefault(key, set()).add("exact")

    # Sort by combined RRF score
    ranked = sorted(scores.items(), key=lambda pair: pair[1], reverse=True)

    results: list[SearchHit] = []
    for key, score in ranked[:limit]:
        hit = hit_map[key]
        source_types = sources.get(key, set())
        if len(source_types) > 1:
            match_type = "both"
        elif "semantic" in source_types:
            match_type = "semantic"
        else:
            match_type = "exact"

        results.append(
            SearchHit(
                conversation_id=hit.conversation_id,
                message_id=hit.message_id,
                title=hit.title,
                snippet=hit.snippet,
                score=round(score, 6),
                similarity_score=hit.similarity_score,
                provider_slug=hit.provider_slug,
                created_at=hit.created_at,
                match_type=match_type,
                highlights=hit.highlights,
            )
        )
    return results


# ── Endpoints ────────────────────────────────────────────────────────────


@router.post("", response_model=ApiListResponse[SearchHit])
async def hybrid_search(body: HybridSearchRequest, user: dict = Depends(get_current_user)):
    """Primary search endpoint — runs semantic + full-text in parallel, merges via RRF."""
    store = FirestoreStore()
    store.record_search_query(user_id=user["id"], query=body.query)

    workspace_str = str(body.workspace_id) if body.workspace_id else None

    semantic_task = _run_semantic_search(
        body.query,
        user_id=user["id"],
        limit=body.limit,
        provider_filter=body.provider_filter,
        date_from=body.date_from,
        date_to=body.date_to,
        workspace_id=workspace_str,
    )
    fulltext_task = _run_fulltext_search(
        body.query,
        user_id=user["id"],
        limit=body.limit,
        provider_filter=body.provider_filter,
        workspace_id=workspace_str,
    )

    semantic_results, fulltext_results = await asyncio.gather(
        semantic_task, fulltext_task
    )

    merged = _reciprocal_rank_fusion(
        semantic_results,
        fulltext_results,
        limit=body.limit,
    )
    return ApiListResponse(data=merged)


@router.post("/semantic", response_model=ApiListResponse[SearchHit])
async def semantic_search(body: SemanticSearchRequest, user: dict = Depends(get_current_user)):
    """Semantic similarity search using embedding vectors."""
    store = FirestoreStore()
    store.record_search_query(user_id=user["id"], query=body.query)

    workspace_str = str(body.workspace_id) if body.workspace_id else None
    results = await _run_semantic_search(
        body.query,
        user_id=user["id"],
        limit=body.limit,
        provider_filter=body.provider_filter,
        date_from=body.date_from,
        date_to=body.date_to,
        workspace_id=workspace_str,
    )

    # Apply threshold filter
    filtered = [r for r in results if r.score >= body.threshold]
    return ApiListResponse(data=filtered)


@router.post("/fulltext", response_model=ApiListResponse[SearchHit])
async def fulltext_search(body: FullTextSearchRequest, user: dict = Depends(get_current_user)):
    """Typo-tolerant full-text search via Meilisearch."""
    store = FirestoreStore()
    store.record_search_query(user_id=user["id"], query=body.query)

    workspace_str = str(body.workspace_id) if body.workspace_id else None
    results = await _run_fulltext_search(
        body.query,
        user_id=user["id"],
        limit=body.limit,
        provider_filter=body.provider_filter,
        workspace_id=workspace_str,
    )
    return ApiListResponse(data=results)


@router.post("/similarity", response_model=ApiListResponse[SearchHit])
async def similarity_search(body: SimilaritySearchRequest, user: dict = Depends(get_current_user)):
    """Find conversations similar to a given conversation using embeddings."""
    store = FirestoreStore()
    target = store.get_conversation(str(body.conversation_id))
    if not target or target.get("user_id") != user["id"]:
        return ApiListResponse(data=[])

    # Get the target conversation's average embedding
    target_embeddings = store.list_embeddings_for_conversation(str(body.conversation_id))
    if not target_embeddings:
        # Fallback to keyword-based similarity
        return _keyword_similarity_fallback(store, target, user["id"], body)

    # Compute average vector for the target conversation
    vectors = [e["vector"] for e in target_embeddings if e.get("vector")]
    if not vectors:
        return _keyword_similarity_fallback(store, target, user["id"], body)

    dim = len(vectors[0])
    avg_vector = [sum(v[i] for v in vectors) / len(vectors) for i in range(dim)]

    from app.services.vector_search_service import InMemoryCosineBackend

    backend = InMemoryCosineBackend(store=store)
    vector_hits = backend.search(
        avg_vector,
        user_id=user["id"],
        limit=body.limit + 10,
    )

    # Filter out the target itself and apply threshold
    conv_cache: dict[str, dict] = {str(body.conversation_id): target}
    hits: list[SearchHit] = []
    for hit in vector_hits:
        if hit.conversation_id == str(body.conversation_id):
            continue
        if hit.similarity < body.threshold:
            continue
        if hit.conversation_id not in conv_cache:
            conv = store.get_conversation(hit.conversation_id)
            conv_cache[hit.conversation_id] = conv or {}
        conv = conv_cache[hit.conversation_id]
        if conv.get("user_id") != user["id"]:
            continue

        hits.append(
            SearchHit(
                conversation_id=hit.conversation_id,
                message_id=hit.message_id,
                title=conv.get("title"),
                snippet=hit.chunk_text[:240],
                score=hit.similarity,
                similarity_score=hit.similarity,
                provider_slug=hit.provider_slug or conv.get("provider_slug"),
                match_type="semantic",
            )
        )
        if len(hits) >= body.limit:
            break

    return ApiListResponse(data=hits)


def _keyword_similarity_fallback(
    store: FirestoreStore,
    target: dict,
    user_id: str,
    body: SimilaritySearchRequest,
) -> ApiListResponse[SearchHit]:
    """Keyword-based Jaccard similarity when embeddings aren't available."""
    target_terms = set(
        filter(
            None,
            " ".join([
                target.get("title") or "",
                target.get("summary") or "",
                target.get("preview") or "",
                " ".join(target.get("tags") or []),
                " ".join(target.get("topics") or []),
            ]).lower().split(),
        )
    )
    hits = []
    for conversation in store.list_conversations(user_id):
        if conversation["id"] == target["id"]:
            continue
        terms = set(
            filter(
                None,
                " ".join([
                    conversation.get("title") or "",
                    conversation.get("summary") or "",
                    conversation.get("preview") or "",
                    " ".join(conversation.get("tags") or []),
                    " ".join(conversation.get("topics") or []),
                ]).lower().split(),
            )
        )
        union = target_terms | terms
        if not union:
            continue
        score = len(target_terms & terms) / len(union)
        if score < body.threshold:
            continue
        hits.append(
            SearchHit(
                conversation_id=conversation["id"],
                message_id=None,
                title=conversation.get("title"),
                snippet=(conversation.get("preview") or conversation.get("summary") or "")[:240],
                score=score,
                similarity_score=score,
                provider_slug=conversation.get("provider_slug"),
                match_type="exact",
                highlights=list((target_terms & terms))[:5],
            )
        )
    hits.sort(key=lambda h: h.score, reverse=True)
    return ApiListResponse(data=hits[:body.limit])


@router.get("/suggestions", response_model=ApiListResponse[SearchSuggestion])
async def search_suggestions(q: str = "", limit: int = 10, user: dict = Depends(get_current_user)):
    """Query-suggestion autocomplete from search history + Meilisearch prefix search."""
    store = FirestoreStore()
    suggestions: list[SearchSuggestion] = []
    seen: set[str] = set()

    # 1. Recent search history
    history = store.list_search_history(user["id"], prefix=q, limit=limit)
    for text in history:
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        suggestions.append(SearchSuggestion(text=text, type="history", score=1.0))

    # 2. Meilisearch prefix suggestions
    if len(suggestions) < limit:
        try:
            from app.services.fulltext_search_service import MeilisearchService

            meili = MeilisearchService()
            meili_suggestions = meili.suggest(q, user_id=user["id"], limit=limit - len(suggestions))
            for text in meili_suggestions:
                key = text.lower()
                if key in seen:
                    continue
                seen.add(key)
                suggestions.append(SearchSuggestion(text=text, type="topic", score=0.8))
        except Exception:
            pass

    # 3. Conversation metadata fallback
    if len(suggestions) < limit and q:
        prefixes = q.lower()
        for conversation in store.list_conversations(user["id"]):
            for value in [
                conversation.get("title"),
                conversation.get("provider_name"),
                *(conversation.get("tags") or []),
                *(conversation.get("topics") or []),
            ]:
                if not value:
                    continue
                text = str(value)
                key = text.lower()
                if prefixes and prefixes not in key:
                    continue
                if key in seen:
                    continue
                seen.add(key)
                stype = "topic" if text in (conversation.get("topics") or []) else "query"
                suggestions.append(SearchSuggestion(text=text, type=stype, score=0.5))
                if len(suggestions) >= limit:
                    break
            if len(suggestions) >= limit:
                break

    return ApiListResponse(data=suggestions[:limit])

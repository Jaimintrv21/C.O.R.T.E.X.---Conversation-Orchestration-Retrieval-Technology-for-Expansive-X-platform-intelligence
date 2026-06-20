"""Search router for text and similarity lookup over Firestore data."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.firestore import FirestoreStore
from app.schemas.common import ApiListResponse
from app.schemas.search import (
    FullTextSearchRequest,
    SearchHit,
    SearchSuggestion,
    SemanticSearchRequest,
    SimilaritySearchRequest,
)

router = APIRouter(prefix="/search", tags=["Search"])


def _score_text(query: str, text: str) -> float:
    query_terms = [term for term in query.lower().split() if term]
    if not query_terms:
        return 0.0
    haystack = text.lower()
    matches = sum(1 for term in query_terms if term in haystack)
    return matches / len(query_terms)


@router.post("/semantic", response_model=ApiListResponse[SearchHit])
async def semantic_search(body: SemanticSearchRequest, user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    conversations = store.list_conversations(user["id"])
    hits = []
    for conversation in conversations:
        text = " ".join(
            [
                conversation.get("title") or "",
                conversation.get("summary") or "",
                conversation.get("preview") or "",
                " ".join(conversation.get("tags") or []),
                " ".join(conversation.get("topics") or []),
            ]
        )
        score = _score_text(body.query, text)
        if score < body.threshold:
            continue
        hits.append(
            SearchHit(
                conversation_id=conversation["id"],
                message_id=None,
                title=conversation.get("title"),
                snippet=(conversation.get("preview") or conversation.get("summary") or "")[:240],
                score=score,
                provider_slug=conversation.get("provider_slug"),
                highlights=[body.query],
            )
        )
    hits.sort(key=lambda item: item.score, reverse=True)
    return ApiListResponse(data=hits[: body.limit])


@router.post("/fulltext", response_model=ApiListResponse[SearchHit])
async def fulltext_search(body: FullTextSearchRequest, user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    hits = []
    for conversation in store.list_conversations(user["id"]):
        text = " ".join(
            [
                conversation.get("title") or "",
                conversation.get("summary") or "",
                conversation.get("preview") or "",
                " ".join(conversation.get("tags") or []),
                " ".join(conversation.get("topics") or []),
            ]
        )
        score = _score_text(body.query, text)
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
                highlights=[body.query] if body.highlight else None,
            )
        )
    hits.sort(key=lambda item: item.score, reverse=True)
    return ApiListResponse(data=hits[: body.limit])


@router.post("/similarity", response_model=ApiListResponse[SearchHit])
async def similarity_search(body: SimilaritySearchRequest, user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    target = store.get_conversation(str(body.conversation_id))
    if not target or target.get("user_id") != user["id"]:
        return ApiListResponse(data=[])

    target_terms = set(
        filter(
            None,
            " ".join(
                [
                    target.get("title") or "",
                    target.get("summary") or "",
                    target.get("preview") or "",
                    " ".join(target.get("tags") or []),
                    " ".join(target.get("topics") or []),
                ]
            ).lower().split(),
        )
    )

    hits = []
    for conversation in store.list_conversations(user["id"]):
        if conversation["id"] == target["id"]:
            continue
        terms = set(
            filter(
                None,
                " ".join(
                    [
                        conversation.get("title") or "",
                        conversation.get("summary") or "",
                        conversation.get("preview") or "",
                        " ".join(conversation.get("tags") or []),
                        " ".join(conversation.get("topics") or []),
                    ]
                ).lower().split(),
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
                provider_slug=conversation.get("provider_slug"),
                highlights=list((target_terms & terms))[:5],
            )
        )
    hits.sort(key=lambda item: item.score, reverse=True)
    return ApiListResponse(data=hits[: body.limit])


@router.get("/suggestions", response_model=ApiListResponse[SearchSuggestion])
async def search_suggestions(q: str = "", limit: int = 10, user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    prefixes = q.lower()
    seen: set[str] = set()
    suggestions: list[SearchSuggestion] = []

    for conversation in store.list_conversations(user["id"]):
        for value in [conversation.get("title"), conversation.get("provider_name"), *(conversation.get("tags") or []), *(conversation.get("topics") or [])]:
            if not value:
                continue
            text = str(value)
            key = text.lower()
            if prefixes and prefixes not in key:
                continue
            if key in seen:
                continue
            seen.add(key)
            suggestions.append(SearchSuggestion(text=text, type="topic" if text in (conversation.get("topics") or []) else "query", score=1.0))
            if len(suggestions) >= limit:
                return ApiListResponse(data=suggestions)

    return ApiListResponse(data=suggestions[:limit])

"""Search router: semantic, full-text, similarity, suggestions."""
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse, ApiListResponse
from app.schemas.search import (
    SemanticSearchRequest, FullTextSearchRequest,
    SimilaritySearchRequest, SearchHit, SearchSuggestion,
)

router = APIRouter(prefix="/search", tags=["Search"])


@router.post("/semantic", response_model=ApiListResponse[SearchHit])
async def semantic_search(
    body: SemanticSearchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search conversations using pgvector semantic similarity."""
    # TODO: Generate query embedding via sentence-transformers
    # TODO: Query pgvector for nearest neighbors
    # TODO: Filter by user_id and optional provider_ids
    return ApiListResponse(data=[])


@router.post("/fulltext", response_model=ApiListResponse[SearchHit])
async def fulltext_search(
    body: FullTextSearchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search conversations using Meilisearch full-text index."""
    # TODO: Query Meilisearch with filters
    # TODO: Return results with highlights
    return ApiListResponse(data=[])


@router.post("/similarity", response_model=ApiListResponse[SearchHit])
async def similarity_search(
    body: SimilaritySearchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Find conversations similar to a given conversation."""
    # TODO: Get embedding for target conversation
    # TODO: Query pgvector for similar conversations
    return ApiListResponse(data=[])


@router.get("/suggestions", response_model=ApiListResponse[SearchSuggestion])
async def search_suggestions(
    q: str = "",
    limit: int = 10,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return search autocomplete suggestions from tags, topics, and recent queries."""
    # TODO: Query distinct tags/topics matching prefix
    return ApiListResponse(data=[])

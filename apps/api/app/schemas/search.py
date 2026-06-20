"""Search schemas."""
from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class SemanticSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    limit: int = Field(default=20, ge=1, le=100)
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    provider_filter: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    workspace_id: UUID | None = None


class FullTextSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    limit: int = Field(default=20, ge=1, le=100)
    provider_filter: str | None = None
    workspace_id: UUID | None = None
    highlight: bool = True


class HybridSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    limit: int = Field(default=20, ge=1, le=100)
    provider_filter: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    workspace_id: UUID | None = None


class SimilaritySearchRequest(BaseModel):
    conversation_id: UUID
    limit: int = Field(default=10, ge=1, le=50)
    threshold: float = Field(default=0.7, ge=0.0, le=1.0)


class SearchHit(BaseModel):
    conversation_id: str
    message_id: str | None = None
    title: str | None = None
    snippet: str
    score: float
    similarity_score: float | None = None
    provider_slug: str | None = None
    created_at: str | None = None
    match_type: Literal["semantic", "exact", "both"] | None = None
    highlights: list[str] | None = None


class SearchSuggestion(BaseModel):
    text: str
    type: str  # "query" | "tag" | "topic" | "history"
    score: float

"""Search schemas."""
from __future__ import annotations
from uuid import UUID
from pydantic import BaseModel, Field


class SemanticSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    limit: int = Field(default=20, ge=1, le=100)
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    provider_ids: list[UUID] | None = None
    workspace_id: UUID | None = None


class FullTextSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    limit: int = Field(default=20, ge=1, le=100)
    filters: dict | None = None
    highlight: bool = True


class SimilaritySearchRequest(BaseModel):
    conversation_id: UUID
    limit: int = Field(default=10, ge=1, le=50)
    threshold: float = Field(default=0.7, ge=0.0, le=1.0)


class SearchHit(BaseModel):
    conversation_id: UUID
    message_id: UUID | None = None
    title: str | None
    snippet: str
    score: float
    provider_slug: str | None
    highlights: list[str] | None = None


class SearchSuggestion(BaseModel):
    text: str
    type: str  # "query" | "tag" | "topic"
    score: float

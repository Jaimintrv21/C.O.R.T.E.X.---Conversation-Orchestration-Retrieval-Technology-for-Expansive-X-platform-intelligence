"""Conversation and message schemas."""
from __future__ import annotations
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    external_id: str | None
    role: str
    content: str
    content_type: str
    model: str | None
    token_count: int
    attachments: dict | None
    tool_calls: dict | None
    parent_id: UUID | None
    sequence_num: int
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: UUID
    user_id: UUID
    workspace_id: UUID | None
    provider_id: UUID | None
    external_id: str | None
    title: str | None
    summary: str | None
    status: str
    import_source: str | None
    message_count: int
    token_count: int
    language: str | None
    topics: list[str] | None
    tags: list[str] | None
    folder_id: UUID | None
    is_pinned: bool
    is_shared: bool
    quality_score: float | None
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationUpdate(BaseModel):
    title: str | None = None
    tags: list[str] | None = None
    folder_id: UUID | None = None
    is_pinned: bool | None = None
    status: str | None = None


class ConversationFilter(BaseModel):
    provider_id: UUID | None = None
    status: str | None = None
    tags: list[str] | None = None
    folder_id: UUID | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    search: str | None = None


class ImportRequest(BaseModel):
    """File import is handled via multipart form; this is for metadata."""
    provider_slug: str | None = None
    workspace_id: UUID | None = None
    tags: list[str] | None = None
    idempotency_key: str | None = None


class CompareRequest(BaseModel):
    conversation_ids: list[UUID] = Field(min_length=2, max_length=5)


class CompareResult(BaseModel):
    conversations: list[ConversationResponse]
    shared_topics: list[str]
    unique_topics: dict[str, list[str]]
    similarity_score: float


class DuplicateResponse(BaseModel):
    id: UUID
    conversation_a: ConversationResponse
    conversation_b: ConversationResponse
    similarity: float
    detection_method: str
    is_confirmed: bool
    created_at: datetime

    class Config:
        from_attributes = True

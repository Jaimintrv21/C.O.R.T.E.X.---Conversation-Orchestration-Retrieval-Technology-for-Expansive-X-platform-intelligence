"""Schemas for ingestion endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ProviderSlug = Literal["chatgpt", "claude", "gemini", "perplexity", "grok"]


class IngestMessagePayload(BaseModel):
    external_id: str | None = None
    title: str | None = None
    role: str = "user"
    content: str
    content_type: str = "text"
    model: str | None = None
    token_count: int = 0
    attachments: list[dict] | None = None
    tool_calls: list[dict] | None = None
    parent_id: str | None = None
    captured_at: datetime | None = None
    metadata: dict | None = None


class IngestConversationPayload(BaseModel):
    external_id: str
    title: str | None = None
    messages: list[IngestMessagePayload] = Field(default_factory=list)
    captured_at: datetime | None = None
    language: str | None = None
    topics: list[str] | None = None
    tags: list[str] | None = None
    metadata: dict | None = None


class IngestRequest(BaseModel):
    provider_slug: ProviderSlug
    conversations: list[IngestConversationPayload] = Field(default_factory=list)


class ApiLogIngestRequest(IngestRequest):
    request_id: str | None = None
    metadata: dict | None = None

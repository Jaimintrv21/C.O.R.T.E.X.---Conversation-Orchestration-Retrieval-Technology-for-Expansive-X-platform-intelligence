"""Provider account schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ConnectionType = Literal["extension", "api_key", "file_watch"]


class ProviderAccountConnectRequest(BaseModel):
    provider_slug: str = Field(min_length=1, max_length=80)
    connection_type: ConnectionType
    api_key: str | None = None
    display_name: str | None = None
    monthly_cap_usd: float | None = Field(default=None, ge=0)


class ProviderAccountResponse(BaseModel):
    id: str
    user_id: str
    provider_slug: str
    connection_type: ConnectionType
    display_name: str | None = None
    api_key_preview: str | None = None
    last_synced_at: datetime | None = None
    is_active: bool
    needs_reauth: bool = False
    monthly_cap_usd: float | None = None
    extension_token_jti: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProviderAccountSummaryResponse(BaseModel):
    provider_slug: str
    connection_type: ConnectionType
    display_name: str | None = None
    api_key_preview: str | None = None
    last_synced_at: datetime | None = None
    is_active: bool
    needs_reauth: bool = False
    monthly_cap_usd: float | None = None

    class Config:
        from_attributes = True


class ProviderAccountConnectResponse(ProviderAccountResponse):
    extension_token: str | None = None


class ExtensionMessagePayload(BaseModel):
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


class ExtensionConversationPayload(BaseModel):
    external_id: str
    title: str | None = None
    messages: list[ExtensionMessagePayload] = Field(default_factory=list)
    captured_at: datetime | None = None
    language: str | None = None
    topics: list[str] | None = None
    tags: list[str] | None = None
    metadata: dict | None = None


class ExtensionIngestRequest(BaseModel):
    provider_slug: str = Field(min_length=1, max_length=80)
    conversations: list[ExtensionConversationPayload] = Field(default_factory=list)

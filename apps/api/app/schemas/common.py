"""
Shared base schemas: API envelope, pagination, error format.
All endpoints return { data, meta, errors } envelope.
"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Generic, TypeVar
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


# ── Error Schema ─────────────────────────────────────────────────────────

class ApiError(BaseModel):
    code: str
    message: str
    field: str | None = None
    details: dict[str, Any] | None = None


# ── Pagination ───────────────────────────────────────────────────────────

class CursorMeta(BaseModel):
    """Cursor-based pagination metadata."""
    has_next: bool = False
    has_previous: bool = False
    next_cursor: str | None = None
    previous_cursor: str | None = None
    total_count: int | None = None
    page_size: int = 50


class Meta(BaseModel):
    """Response metadata."""
    request_id: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    pagination: CursorMeta | None = None
    idempotency_key: str | None = None


# ── API Envelope ─────────────────────────────────────────────────────────

class ApiResponse(BaseModel, Generic[T]):
    """Standard API envelope: { data, meta, errors }."""
    data: T | None = None
    meta: Meta = Field(default_factory=Meta)
    errors: list[ApiError] | None = None

    model_config = ConfigDict(from_attributes=True)


class ApiListResponse(BaseModel, Generic[T]):
    """Paginated list envelope."""
    data: list[T] = Field(default_factory=list)
    meta: Meta = Field(default_factory=Meta)
    errors: list[ApiError] | None = None

    model_config = ConfigDict(from_attributes=True)


# ── Common Query Params ──────────────────────────────────────────────────

class PaginationParams(BaseModel):
    cursor: str | None = None
    limit: int = Field(default=50, ge=1, le=200)
    direction: str = Field(default="next", pattern="^(next|previous)$")


# ── Health ───────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
    services: dict[str, str] = Field(default_factory=dict)

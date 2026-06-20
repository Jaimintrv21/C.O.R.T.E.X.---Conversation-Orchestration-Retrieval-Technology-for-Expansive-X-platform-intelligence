"""Artifact and Job schemas."""
from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, Field


# ── Artifacts ────────────────────────────────────────────────────────────

class GenerateArtifactRequest(BaseModel):
    title: str = Field(max_length=500)
    artifact_type: str  # wiki | report | presentation | summary | etc.
    source_ids: list[str] = Field(min_length=1)
    prompt: str | None = None
    model: str | None = None
    workspace_id: str | None = None
    idempotency_key: str | None = None


class ArtifactResponse(BaseModel):
    id: str
    user_id: str
    workspace_id: str | None
    title: str
    artifact_type: str
    status: str
    source_ids: list[str] | None
    prompt: str | None
    model_used: str | None
    content: dict | None
    file_size: int | None
    version: int
    is_public: bool
    error_message: str | None
    generation_ms: int | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Jobs ─────────────────────────────────────────────────────────────────

class JobResponse(BaseModel):
    id: str
    user_id: str
    job_type: str
    status: str
    priority: int
    progress: float
    progress_detail: str | None
    error_message: str | None
    result: dict | None
    attempts: int
    max_attempts: int
    celery_task_id: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Workspaces ───────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    name: str = Field(max_length=200)
    slug: str = Field(max_length=100, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    is_public: bool = False


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_public: bool | None = None
    settings: dict | None = None


class WorkspaceResponse(BaseModel):
    id: str
    owner_id: str
    slug: str
    name: str
    description: str | None
    plan: str
    is_public: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AddMemberRequest(BaseModel):
    user_id: str
    role: str = Field(default="member", pattern=r"^(admin|member|viewer)$")

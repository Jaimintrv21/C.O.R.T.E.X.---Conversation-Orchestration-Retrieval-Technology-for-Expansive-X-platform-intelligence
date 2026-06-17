"""Knowledge graph schemas."""
from __future__ import annotations
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class NodeResponse(BaseModel):
    id: UUID
    label: str
    node_type: str
    description: str | None
    occurrence_count: int
    source_ids: list[UUID] | None
    created_at: datetime

    class Config:
        from_attributes = True


class EdgeResponse(BaseModel):
    id: UUID
    source_id: UUID
    target_id: UUID
    relationship: str
    weight: float
    evidence: dict | None
    created_at: datetime

    class Config:
        from_attributes = True


class BuildRequest(BaseModel):
    workspace_id: UUID | None = None
    conversation_ids: list[UUID] | None = None
    force_rebuild: bool = False


class GraphExport(BaseModel):
    nodes: list[NodeResponse]
    edges: list[EdgeResponse]
    metadata: dict = Field(default_factory=dict)

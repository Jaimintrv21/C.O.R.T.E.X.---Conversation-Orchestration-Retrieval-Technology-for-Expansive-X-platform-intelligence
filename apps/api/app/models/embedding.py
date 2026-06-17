"""Embedding model for pgvector storage."""
from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.base import generate_uuid

# Note: pgvector Vector type registered via: from pgvector.sqlalchemy import Vector
# We store it as a generic column and handle vector ops in queries.


class Embedding(Base):
    __tablename__ = "embeddings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    entity_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # "message" | "conversation"
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    dimensions: Mapped[int] = mapped_column(Integer, nullable=False, default=384)
    chunk_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # Note: `embedding` vector column added via Alembic migration with pgvector

"""PII redaction tracking model."""
from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.base import generate_uuid


class PiiRedaction(Base):
    __tablename__ = "pii_redactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    message_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    pii_type: Mapped[str] = mapped_column(String(30), nullable=False)
    original_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    replacement: Mapped[str] = mapped_column(String(100), nullable=False)
    offset_start: Mapped[int] = mapped_column(Integer, nullable=False)
    offset_end: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

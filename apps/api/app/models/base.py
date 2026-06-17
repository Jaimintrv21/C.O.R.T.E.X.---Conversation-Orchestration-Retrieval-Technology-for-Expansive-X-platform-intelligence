"""Shared mixins and enums for all ORM models."""
from __future__ import annotations
import enum
import uuid
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)


def generate_uuid() -> uuid.UUID:
    return uuid.uuid4()


# ── Enums ────────────────────────────────────────────────────────────────

class ConversationStatus(str, enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"
    PROCESSING = "processing"


class ImportSource(str, enum.Enum):
    FILE_UPLOAD = "file_upload"
    API_SYNC = "api_sync"
    MANUAL = "manual"
    WEBHOOK = "webhook"


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"
    FUNCTION = "function"


class NodeType(str, enum.Enum):
    CONCEPT = "concept"
    PERSON = "person"
    TOOL = "tool"
    DECISION = "decision"
    INSIGHT = "insight"
    QUESTION = "question"
    ANSWER = "answer"
    ENTITY = "entity"


class ArtifactType(str, enum.Enum):
    WEBSITE = "website"
    DASHBOARD = "dashboard"
    REPORT = "report"
    PRESENTATION = "presentation"
    WIKI = "wiki"
    MINDMAP = "mindmap"
    SUMMARY = "summary"
    TIMELINE = "timeline"
    DATASET = "dataset"


class ArtifactStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"
    STALE = "stale"


class JobType(str, enum.Enum):
    IMPORT_FILE = "import_file"
    IMPORT_API_SYNC = "import_api_sync"
    EMBED_BATCH = "embed_batch"
    REINDEX = "reindex"
    GENERATE_ARTIFACT = "generate_artifact"
    ANALYZE_CONVERSATIONS = "analyze_conversations"
    BUILD_KNOWLEDGE_GRAPH = "build_knowledge_graph"
    COMPUTE_ANALYTICS = "compute_analytics"
    DETECT_DUPLICATES = "detect_duplicates"
    REDACT_PII = "redact_pii"


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"


class WorkspaceRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"

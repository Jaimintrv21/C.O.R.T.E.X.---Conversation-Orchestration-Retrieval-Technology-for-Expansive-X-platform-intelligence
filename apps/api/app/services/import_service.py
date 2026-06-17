"""
Import pipeline service — orchestrates the full import flow:

  File → Parser → Normalizer → PII Scan → DB Store →
  Embedding Queue → Meilisearch Index → Topic Extraction →
  Knowledge Graph → Analytics Snapshot → WebSocket Push
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.job import Job
from app.models.provider import Provider
from app.providers.base import CanonicalConversation, CanonicalMessage
from app.providers.registry import load_and_parse

logger = structlog.get_logger()


class ImportPipelineService:
    """Executes the full import pipeline for a given job."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(self, job_id: uuid.UUID) -> dict:
        """Main pipeline entry point — called by Celery worker."""
        job = await self.db.get(Job, job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        job.progress = 0.0
        job.progress_detail = "Starting import..."
        await self.db.commit()

        try:
            # ── Step 1: Parse file ────────────────────────────────────
            await self._update_progress(job, 0.1, "Parsing export file...")
            file_path = job.payload.get("temp_path")
            provider_slug = job.payload.get("provider_slug")

            conversations = load_and_parse(file_path, provider_slug)
            total = len(conversations)
            logger.info("import_parsed", job_id=str(job_id), conversations=total)

            # ── Step 2: Store conversations ──────────────────────────
            imported = 0
            skipped = 0

            for i, canonical in enumerate(conversations):
                progress = 0.1 + (0.6 * (i + 1) / max(total, 1))
                await self._update_progress(job, progress, f"Importing {i+1}/{total}: {canonical.title or 'Untitled'}")

                # Idempotent: check external_id
                if canonical.external_id:
                    existing = await self.db.execute(
                        select(Conversation).where(
                            Conversation.user_id == job.user_id,
                            Conversation.external_id == canonical.external_id,
                        )
                    )
                    if existing.scalar_one_or_none():
                        skipped += 1
                        continue

                # Resolve provider
                provider = await self._resolve_provider(canonical.provider_slug)

                conv = await self._store_conversation(job.user_id, job.workspace_id, provider, canonical)
                imported += 1

            # ── Step 3: Post-processing (enqueue async tasks) ─────────
            await self._update_progress(job, 0.8, "Queueing embeddings and indexing...")
            # TODO: Enqueue embedding_tasks.embed_batch for all new messages
            # TODO: Enqueue Meilisearch indexing
            # TODO: Enqueue topic extraction
            # TODO: Enqueue knowledge graph extraction
            # TODO: Update analytics snapshot

            # ── Step 4: Complete ──────────────────────────────────────
            job.status = "completed"
            job.progress = 1.0
            job.progress_detail = f"Done: {imported} imported, {skipped} skipped"
            job.completed_at = datetime.now(timezone.utc)
            job.result = {"imported": imported, "skipped": skipped, "total": total}
            await self.db.commit()

            logger.info("import_completed", job_id=str(job_id), imported=imported, skipped=skipped)
            return job.result

        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            job.attempts += 1
            await self.db.commit()
            logger.error("import_failed", job_id=str(job_id), error=str(e))
            raise

    async def _store_conversation(
        self,
        user_id: uuid.UUID,
        workspace_id: uuid.UUID | None,
        provider: Provider | None,
        canonical: CanonicalConversation,
    ) -> Conversation:
        """Persists a canonical conversation and its messages to the DB."""
        conv = Conversation(
            user_id=user_id,
            workspace_id=workspace_id,
            provider_id=provider.id if provider else None,
            external_id=canonical.external_id,
            title=canonical.title,
            status="active",
            import_source="file_upload",
            message_count=len(canonical.messages),
            token_count=sum(m.token_count for m in canonical.messages),
            language=canonical.language,
            topics=canonical.topics or None,
            tags=canonical.tags or None,
            started_at=canonical.started_at,
            ended_at=canonical.ended_at,
            metadata_=canonical.metadata,
        )
        self.db.add(conv)
        await self.db.flush()

        for seq, msg in enumerate(canonical.messages):
            db_msg = Message(
                conversation_id=conv.id,
                external_id=msg.external_id,
                role=msg.role,
                content=msg.content,
                content_type=msg.content_type,
                model=msg.model,
                token_count=msg.token_count,
                attachments=msg.attachments,
                tool_calls=msg.tool_calls,
                sequence_num=seq,
                metadata_=msg.metadata,
            )
            self.db.add(db_msg)

        await self.db.flush()
        return conv

    async def _resolve_provider(self, slug: str) -> Provider | None:
        result = await self.db.execute(select(Provider).where(Provider.slug == slug))
        return result.scalar_one_or_none()

    async def _update_progress(self, job: Job, progress: float, detail: str) -> None:
        job.progress = round(progress, 3)
        job.progress_detail = detail
        await self.db.commit()

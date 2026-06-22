"""Firestore-backed import pipeline orchestration."""
from __future__ import annotations

from datetime import UTC, datetime

import structlog

from app.firestore import FirestoreStore
from app.providers.base import CanonicalConversation
from app.providers.registry import load_and_parse
from app.workers.tasks.embedding_tasks import embed_batch

logger = structlog.get_logger()


class ImportPipelineService:
    """Executes the import pipeline without relying on SQLAlchemy."""

    def __init__(self, store: FirestoreStore | None = None):
        self.store = store or FirestoreStore()

    async def run(self, job_id: str) -> dict:
        job = self.store.get_job(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        self.store.update_job(
            job_id,
            {
                "status": "running",
                "started_at": datetime.now(UTC),
                "progress": 0.0,
                "progress_detail": "Starting import...",
            },
        )

        try:
            self.store.update_job(job_id, {"progress": 0.1, "progress_detail": "Parsing export file..."})
            payload = job.get("payload") or {}
            file_path = payload.get("temp_path")
            provider_slug = payload.get("provider_slug")
            conversations = load_and_parse(file_path, provider_slug)
            result = await self.process_conversations(
                user_id=job["user_id"],
                workspace_id=job.get("workspace_id"),
                conversations=conversations,
                progress_job_id=job_id,
            )
            self.store.update_job(
                job_id,
                {
                    "status": "completed",
                    "progress": 1.0,
                    "progress_detail": f"Done: {result['imported']} imported, {result['updated']} updated, {result['skipped']} skipped",
                    "completed_at": datetime.now(UTC),
                    "result": result,
                },
            )
            logger.info("import_completed", job_id=job_id, **result)
            return result
        except Exception as exc:
            attempts = int(job.get("attempts") or 0) + 1
            self.store.update_job(
                job_id,
                {
                    "status": "failed",
                    "attempts": attempts,
                    "error_message": str(exc),
                    "completed_at": datetime.now(UTC),
                },
            )
            logger.exception("import_failed", job_id=job_id)
            raise

    async def process_conversations(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        conversations: list[CanonicalConversation],
        progress_job_id: str | None = None,
    ) -> dict:
        total = len(conversations)
        imported = 0
        updated = 0
        skipped = 0
        imported_ids: list[str] = []
        newly_added_message_ids: list[str] = []

        for index, canonical in enumerate(conversations):
            if progress_job_id:
                progress = 0.1 + (0.7 * (index + 1) / max(total, 1))
                self.store.update_job(
                    progress_job_id,
                    {
                        "progress": round(progress, 3),
                        "progress_detail": f"Importing {index + 1}/{total}: {canonical.title or 'Untitled'}",
                    },
                )

            existing = None
            if canonical.external_id:
                existing = self.store.get_conversation_by_external_id(user_id, canonical.external_id)

            if existing:
                result = self._merge_conversation(
                    existing=existing,
                    canonical=canonical,
                    newly_added_message_ids=newly_added_message_ids,
                )
                if result:
                    updated += 1
                else:
                    skipped += 1
                continue

            conversation = self._store_conversation(
                user_id=user_id,
                workspace_id=workspace_id,
                canonical=canonical,
                newly_added_message_ids=newly_added_message_ids,
            )
            imported += 1
            imported_ids.append(conversation["id"])

        if newly_added_message_ids:
            embed_batch.delay(message_ids=newly_added_message_ids)
            from app.workers.tasks.knowledge_tasks import extract_knowledge
            extract_knowledge.delay(message_ids=newly_added_message_ids)

        return {
            "imported": imported,
            "updated": updated,
            "skipped": skipped,
            "total": total,
            "conversation_ids": imported_ids,
            "message_ids": newly_added_message_ids,
        }

    def _store_conversation(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        canonical: CanonicalConversation,
        newly_added_message_ids: list[str],
    ) -> dict:
        conversation = self.store.create_conversation(
            user_id=user_id,
            workspace_id=workspace_id,
            provider_slug=canonical.provider_slug,
            external_id=canonical.external_id,
            title=canonical.title,
            summary=None,
            status="active",
            import_source="file_upload",
            language=canonical.language,
            topics=canonical.topics,
            tags=canonical.tags,
            started_at=canonical.started_at,
            ended_at=canonical.ended_at,
            metadata=canonical.metadata,
        )

        for sequence_num, message in enumerate(canonical.messages):
            stored_message = self.store.add_message(
                conversation_id=conversation["id"],
                user_id=user_id,
                external_id=message.external_id,
                role=message.role,
                content=message.content,
                content_type=message.content_type,
                model=message.model,
                token_count=message.token_count,
                attachments=message.attachments,
                tool_calls=message.tool_calls,
                parent_id=message.parent_id,
                sequence_num=sequence_num,
                created_at=message.created_at,
            )
            newly_added_message_ids.append(stored_message["id"])

        return self.store.update_conversation_message_stats(conversation["id"]) or conversation

    def _merge_conversation(
        self,
        *,
        existing: dict,
        canonical: CanonicalConversation,
        newly_added_message_ids: list[str],
    ) -> bool:
        existing_messages = self.store.list_messages(existing["id"])
        existing_count = len(existing_messages)
        appended = False

        if canonical.title and not existing.get("title"):
            self.store.update_conversation(existing["id"], {"title": canonical.title})

        if canonical.metadata:
            merged_metadata = {**(existing.get("metadata") or {}), **canonical.metadata}
            self.store.update_conversation(existing["id"], {"metadata": merged_metadata})

        for sequence_num, message in enumerate(canonical.messages):
            if sequence_num < existing_count:
                continue
            stored_message = self.store.add_message(
                conversation_id=existing["id"],
                user_id=existing["user_id"],
                external_id=message.external_id,
                role=message.role,
                content=message.content,
                content_type=message.content_type,
                model=message.model,
                token_count=message.token_count,
                attachments=message.attachments,
                tool_calls=message.tool_calls,
                parent_id=message.parent_id,
                sequence_num=sequence_num,
                created_at=message.created_at,
            )
            newly_added_message_ids.append(stored_message["id"])
            appended = True

        if appended:
            self.store.update_conversation(
                existing["id"],
                {
                    "title": canonical.title or existing.get("title"),
                    "provider_slug": canonical.provider_slug,
                    "provider_name": self.store._provider_name(canonical.provider_slug),
                },
            )
            self.store.update_conversation_message_stats(existing["id"])

        return appended

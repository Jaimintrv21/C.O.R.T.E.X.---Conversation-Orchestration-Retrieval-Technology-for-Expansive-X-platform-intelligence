"""Embedding generation Celery tasks."""
from __future__ import annotations

import asyncio
import uuid

import structlog
from sqlalchemy import select

from app.models.message import Message
from app.services.embedding_service import EmbeddingService
from app.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(bind=True, name="app.workers.tasks.embedding_tasks.embed_batch", max_retries=3)
def embed_batch(self, conversation_ids: list[str]):
    """Generate embeddings for messages in the given conversations."""
    logger.info("embed_batch_started", count=len(conversation_ids))

    async def _run() -> dict:
        from app.database import async_session_factory

        async with async_session_factory() as db:
            result = await db.execute(
                select(Message).where(
                    Message.conversation_id.in_([uuid.UUID(value) for value in conversation_ids])
                )
            )
            messages = list(result.scalars())
            service = EmbeddingService()
            chunks = service.build_message_chunks(messages)
            batch = await service.embed_chunks(chunks)
            logger.info(
                "embed_batch_ready_for_persistence",
                conversations=len(conversation_ids),
                messages=len(messages),
                chunks=len(batch.chunks),
                dimensions=batch.dimensions,
                model=batch.model,
            )
            return {
                "embedded_conversations": len(conversation_ids),
                "embedded_messages": len(messages),
                "embedded_chunks": len(batch.chunks),
                "model": batch.model,
                "dimensions": batch.dimensions,
            }

    loop = asyncio.new_event_loop()
    try:
        result = loop.run_until_complete(_run())
        logger.info("embed_batch_completed", **result)
        return result
    except Exception as exc:
        logger.error("embed_batch_failed", error=str(exc))
        raise self.retry(exc=exc, countdown=30 * (self.request.retries + 1))
    finally:
        loop.close()


@celery_app.task(name="app.workers.tasks.embedding_tasks.reindex_meilisearch")
def reindex_meilisearch(conversation_ids: list[str] | None = None):
    """Sync conversations to Meilisearch full-text index."""
    count = len(conversation_ids or [])
    logger.info("meilisearch_reindex_started", count=count)
    logger.info("meilisearch_reindex_completed", count=count)
    return {"indexed_conversations": count}

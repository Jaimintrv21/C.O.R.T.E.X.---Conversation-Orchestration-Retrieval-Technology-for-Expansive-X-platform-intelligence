"""Embedding generation Celery tasks."""
from __future__ import annotations
from app.workers.celery_app import celery_app
import structlog

logger = structlog.get_logger()


@celery_app.task(bind=True, name="app.workers.tasks.embedding_tasks.embed_batch", max_retries=3)
def embed_batch(self, conversation_ids: list[str]):
    """Generate embeddings for messages in the given conversations."""
    logger.info("embed_batch_started", count=len(conversation_ids))

    # TODO: Load messages from DB
    # TODO: Chunk messages for embedding
    # TODO: Generate embeddings via sentence-transformers (all-MiniLM-L6-v2)
    # TODO: INSERT into embeddings table with pgvector
    # TODO: Index in Meilisearch

    logger.info("embed_batch_completed", count=len(conversation_ids))
    return {"embedded": len(conversation_ids)}


@celery_app.task(name="app.workers.tasks.embedding_tasks.reindex_meilisearch")
def reindex_meilisearch(conversation_ids: list[str] | None = None):
    """Sync conversations to Meilisearch full-text index."""
    logger.info("meilisearch_reindex_started")
    # TODO: Query conversations + messages
    # TODO: Upsert into Meilisearch index
    logger.info("meilisearch_reindex_completed")

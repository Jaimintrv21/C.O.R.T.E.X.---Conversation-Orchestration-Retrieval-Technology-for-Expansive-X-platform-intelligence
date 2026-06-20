"""Embedding generation and Meilisearch indexing Celery tasks.

Rewired from the original SQLAlchemy-based implementation to use
Firestore as the message store, matching the project's migration away
from PostgreSQL for application data.
"""
from __future__ import annotations

import asyncio

import structlog

from app.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(
    bind=True,
    name="app.workers.tasks.embedding_tasks.embed_batch",
    max_retries=3,
    queue="embeddings",
)
def embed_batch(
    self,
    conversation_ids: list[str] | None = None,
    message_ids: list[str] | None = None,
):
    """Generate embeddings for messages and persist to Firestore + Meilisearch.

    Triggered after:
    - File import (import_service.py)
    - Extension/API-log ingestion (ingest.py → ImportPipelineService)
    - Live chat turns (conversations.py send_message / stream_message)
    """
    conversation_ids = conversation_ids or []
    message_ids = message_ids or []
    logger.info(
        "embed_batch_started",
        conversations=len(conversation_ids),
        messages=len(message_ids),
    )

    async def _run() -> dict:
        from app.firestore import FirestoreStore
        from app.services.embedding_service import EmbeddingChunk, EmbeddingService
        from app.services.fulltext_search_service import MeilisearchService

        store = FirestoreStore()
        service = EmbeddingService()

        # Collect raw messages from Firestore
        raw_messages: list[dict] = []
        if message_ids:
            for mid in message_ids:
                # Messages collection is flat; look up by doc ID
                doc = store._col("messages").document(mid).get()
                if doc.exists:
                    data = doc.to_dict() or {}
                    data["id"] = doc.id
                    raw_messages.append(data)
        elif conversation_ids:
            for cid in conversation_ids:
                raw_messages.extend(store.list_messages(cid))

        if not raw_messages:
            return {
                "embedded_conversations": 0,
                "embedded_messages": 0,
                "embedded_chunks": 0,
                "indexed_meilisearch": 0,
                "model": None,
                "dimensions": 0,
            }

        # Build chunks using a dict-compatible wrapper
        chunks: list[EmbeddingChunk] = []
        for msg in raw_messages:
            content = str(msg.get("content") or "").strip()
            if not content:
                continue
            msg_id = str(msg.get("id", ""))
            conv_id = str(msg.get("conversation_id", ""))
            for chunk_index, (chunk_text, token_count) in enumerate(
                service.chunk_text(content)
            ):
                chunks.append(
                    EmbeddingChunk(
                        conversation_id=conv_id,
                        message_id=msg_id,
                        chunk_index=chunk_index,
                        text=chunk_text,
                        token_count=token_count,
                    )
                )

        if not chunks:
            return {
                "embedded_conversations": len(set(m.get("conversation_id", "") for m in raw_messages)),
                "embedded_messages": len(raw_messages),
                "embedded_chunks": 0,
                "indexed_meilisearch": 0,
                "model": None,
                "dimensions": 0,
            }

        # Generate embeddings
        batch = await service.embed_chunks(chunks)

        # Persist embeddings to Firestore
        # Build lookup: message_id → conversation metadata
        conv_cache: dict[str, dict] = {}
        for msg in raw_messages:
            conv_id = str(msg.get("conversation_id", ""))
            if conv_id and conv_id not in conv_cache:
                conv = store.get_conversation(conv_id)
                conv_cache[conv_id] = conv or {}

        for chunk, vector in zip(batch.chunks, batch.vectors):
            conv = conv_cache.get(chunk.conversation_id, {})
            store.store_embedding(
                message_id=chunk.message_id,
                conversation_id=chunk.conversation_id,
                user_id=conv.get("user_id", ""),
                workspace_id=conv.get("workspace_id"),
                chunk_index=chunk.chunk_index,
                chunk_text=chunk.text,
                vector=vector,
                model=batch.model,
                dimensions=batch.dimensions,
                provider_slug=conv.get("provider_slug"),
            )

        # Index into Meilisearch for full-text search
        meili_docs = []
        for msg in raw_messages:
            conv_id = str(msg.get("conversation_id", ""))
            conv = conv_cache.get(conv_id, {})
            content = str(msg.get("content") or "").strip()
            if not content:
                continue
            meili_docs.append({
                "id": str(msg["id"]),
                "conversation_id": conv_id,
                "user_id": conv.get("user_id", ""),
                "workspace_id": conv.get("workspace_id"),
                "content": content,
                "provider_slug": conv.get("provider_slug"),
                "conversation_title": conv.get("title", ""),
                "tags": conv.get("tags") or [],
                "topics": conv.get("topics") or [],
                "created_at": (
                    msg["created_at"].isoformat()
                    if msg.get("created_at") and hasattr(msg["created_at"], "isoformat")
                    else None
                ),
            })

        indexed_count = 0
        if meili_docs:
            try:
                meili_service = MeilisearchService()
                meili_service.index_messages_batch(meili_docs)
                indexed_count = len(meili_docs)
            except Exception as meili_exc:
                logger.warning("meilisearch_indexing_skipped", error=str(meili_exc))

        result = {
            "embedded_conversations": len(set(c.conversation_id for c in batch.chunks)),
            "embedded_messages": len(set(c.message_id for c in batch.chunks)),
            "embedded_chunks": len(batch.chunks),
            "indexed_meilisearch": indexed_count,
            "model": batch.model,
            "dimensions": batch.dimensions,
        }
        logger.info("embed_batch_completed", **result)
        return result

    loop = asyncio.new_event_loop()
    try:
        result = loop.run_until_complete(_run())
        return result
    except Exception as exc:
        logger.error("embed_batch_failed", error=str(exc))
        raise self.retry(exc=exc, countdown=30 * (self.request.retries + 1))
    finally:
        loop.close()


@celery_app.task(
    name="app.workers.tasks.embedding_tasks.reindex_meilisearch",
    queue="default",
)
def reindex_meilisearch(conversation_ids: list[str] | None = None):
    """Full reindex of conversations/messages into Meilisearch.

    Used as a periodic catch-up task or after bulk operations.
    """
    from app.firestore import FirestoreStore
    from app.services.fulltext_search_service import MeilisearchService

    store = FirestoreStore()
    conversation_ids = conversation_ids or []
    logger.info("meilisearch_reindex_started", count=len(conversation_ids))

    # If no specific IDs, this is a no-op (full reindex would need user scoping)
    if not conversation_ids:
        logger.info("meilisearch_reindex_skipped_no_ids")
        return {"indexed_conversations": 0}

    try:
        meili_service = MeilisearchService()
    except Exception as exc:
        logger.warning("meilisearch_unavailable_for_reindex", error=str(exc))
        return {"indexed_conversations": 0, "error": str(exc)}

    total_indexed = 0
    for conv_id in conversation_ids:
        conv = store.get_conversation(conv_id)
        if not conv:
            continue
        messages = store.list_messages(conv_id)
        docs = []
        for msg in messages:
            content = str(msg.get("content") or "").strip()
            if not content:
                continue
            docs.append({
                "id": str(msg["id"]),
                "conversation_id": conv_id,
                "user_id": conv.get("user_id", ""),
                "workspace_id": conv.get("workspace_id"),
                "content": content,
                "provider_slug": conv.get("provider_slug"),
                "conversation_title": conv.get("title", ""),
                "tags": conv.get("tags") or [],
                "topics": conv.get("topics") or [],
                "created_at": (
                    msg["created_at"].isoformat()
                    if msg.get("created_at") and hasattr(msg["created_at"], "isoformat")
                    else None
                ),
            })
        if docs:
            meili_service.index_messages_batch(docs)
            total_indexed += len(docs)

    logger.info("meilisearch_reindex_completed", indexed_messages=total_indexed)
    return {"indexed_conversations": len(conversation_ids), "indexed_messages": total_indexed}

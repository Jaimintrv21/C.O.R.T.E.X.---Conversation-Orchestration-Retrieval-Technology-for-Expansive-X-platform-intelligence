"""Import pipeline Celery tasks."""
from __future__ import annotations

import asyncio

import structlog

from app.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(bind=True, name="app.workers.tasks.import_tasks.run_import_pipeline", max_retries=3)
def run_import_pipeline(self, job_id: str):
    """Run the full import pipeline for a job."""
    logger.info("import_task_started", job_id=job_id, task_id=self.request.id)

    async def _run():
        from app.services.import_service import ImportPipelineService

        service = ImportPipelineService()
        result = await service.run(job_id)
        return result

    try:
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(_run())
        return result
    except Exception as exc:
        logger.error("import_task_failed", job_id=job_id, error=str(exc))
        raise self.retry(exc=exc, countdown=30 * (self.request.retries + 1))
    finally:
        loop.close()


@celery_app.task(name="app.workers.tasks.import_tasks.detect_duplicates")
def detect_duplicates():
    """Periodic task: detect duplicate conversations using embedding similarity.

    For each user, compares conversation-level embeddings (average of message
    embeddings) pairwise. Pairs with cosine similarity > 0.92 are written to
    the ``duplicate_pairs`` Firestore collection for review.
    """
    import math

    from app.firestore import FirestoreStore

    logger.info("duplicate_detection_started")
    store = FirestoreStore()

    # Collect all users who have embeddings
    all_embeddings = list(store._col("embeddings").stream())
    user_embeddings: dict[str, dict[str, list[list[float]]]] = {}

    for doc in all_embeddings:
        data = doc.to_dict() or {}
        user_id = data.get("user_id")
        conv_id = data.get("conversation_id")
        vector = data.get("vector")
        if not user_id or not conv_id or not vector:
            continue
        user_embeddings.setdefault(user_id, {}).setdefault(conv_id, []).append(vector)

    SIMILARITY_THRESHOLD = 0.92
    total_pairs_found = 0
    total_users_processed = 0

    for user_id, conv_vectors in user_embeddings.items():
        total_users_processed += 1
        # Compute average vector per conversation
        avg_vectors: dict[str, list[float]] = {}
        for conv_id, vectors in conv_vectors.items():
            if not vectors:
                continue
            dim = len(vectors[0])
            avg = [sum(v[i] for v in vectors) / len(vectors) for i in range(dim)]
            avg_vectors[conv_id] = avg

        conv_ids = list(avg_vectors.keys())
        if len(conv_ids) < 2:
            continue

        # Pairwise comparison
        existing_pairs: set[frozenset[str]] = set()
        existing = store.list_duplicate_pairs(user_id)
        for pair in existing:
            existing_pairs.add(frozenset([pair["conv_a_id"], pair["conv_b_id"]]))

        for i in range(len(conv_ids)):
            for j in range(i + 1, len(conv_ids)):
                pair_key = frozenset([conv_ids[i], conv_ids[j]])
                if pair_key in existing_pairs:
                    continue

                vec_a = avg_vectors[conv_ids[i]]
                vec_b = avg_vectors[conv_ids[j]]

                # Cosine similarity
                dot = sum(a * b for a, b in zip(vec_a, vec_b))
                norm_a = math.sqrt(sum(a * a for a in vec_a))
                norm_b = math.sqrt(sum(b * b for b in vec_b))
                if norm_a == 0 or norm_b == 0:
                    continue
                similarity = dot / (norm_a * norm_b)

                if similarity >= SIMILARITY_THRESHOLD:
                    store.create_duplicate_pair(
                        user_id=user_id,
                        conv_a_id=conv_ids[i],
                        conv_b_id=conv_ids[j],
                        similarity=round(similarity, 6),
                        detection_method="embedding_cosine",
                    )
                    total_pairs_found += 1

    logger.info(
        "duplicate_detection_completed",
        users_processed=total_users_processed,
        pairs_found=total_pairs_found,
    )
    return {"users_processed": total_users_processed, "pairs_found": total_pairs_found}

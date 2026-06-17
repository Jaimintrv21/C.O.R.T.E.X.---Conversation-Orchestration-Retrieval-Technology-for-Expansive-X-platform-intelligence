"""Import pipeline Celery tasks."""
from __future__ import annotations
import asyncio
import uuid
from app.workers.celery_app import celery_app
import structlog

logger = structlog.get_logger()


@celery_app.task(bind=True, name="app.workers.tasks.import_tasks.run_import_pipeline", max_retries=3)
def run_import_pipeline(self, job_id: str):
    """Run the full import pipeline for a job."""
    logger.info("import_task_started", job_id=job_id, task_id=self.request.id)

    async def _run():
        from app.database import async_session_factory
        from app.services.import_service import ImportPipelineService

        async with async_session_factory() as db:
            service = ImportPipelineService(db)
            result = await service.run(uuid.UUID(job_id))
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
    """Periodic task: detect duplicate conversations using embeddings."""
    logger.info("duplicate_detection_started")
    # TODO: Query pgvector for similar conversation embeddings
    # TODO: Insert into duplicate_pairs table
    logger.info("duplicate_detection_completed")

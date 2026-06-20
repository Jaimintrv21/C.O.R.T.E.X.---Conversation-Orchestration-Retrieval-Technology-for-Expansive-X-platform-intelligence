"""Artifact generation Celery tasks."""
from __future__ import annotations

import asyncio

import structlog

from app.services.artifact_service import ArtifactGenerationService
from app.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(bind=True, name="app.workers.tasks.artifact_tasks.generate_artifact", max_retries=2)
def generate_artifact(self, artifact_id: str, model: str | None = None):
    """Generate an artifact from conversations."""
    logger.info("artifact_generation_started", artifact_id=artifact_id, model=model)

    async def _run() -> dict:
        service = ArtifactGenerationService()
        return await service.generate(artifact_id, model=model)

    loop = asyncio.new_event_loop()
    try:
        result = loop.run_until_complete(_run())
        logger.info("artifact_generation_completed", **result)
        return result
    except Exception as exc:
        logger.error("artifact_generation_failed", artifact_id=artifact_id, error=str(exc))
        raise self.retry(exc=exc, countdown=30 * (self.request.retries + 1))
    finally:
        loop.close()

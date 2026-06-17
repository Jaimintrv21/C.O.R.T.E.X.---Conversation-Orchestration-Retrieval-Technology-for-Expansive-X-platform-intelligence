"""Artifact generation Celery tasks."""
from __future__ import annotations
from app.workers.celery_app import celery_app
import structlog

logger = structlog.get_logger()


@celery_app.task(bind=True, name="app.workers.tasks.artifact_tasks.generate_artifact", max_retries=2)
def generate_artifact(self, artifact_id: str, model: str | None = None):
    """Generate an artifact (wiki, report, presentation) from conversations."""
    logger.info("artifact_generation_started", artifact_id=artifact_id, model=model)

    # TODO: Load artifact from DB
    # TODO: Fetch source conversations
    # TODO: Build prompt from conversation content
    # TODO: Call Ollama (local) or LiteLLM (cloud opt-in)
    # TODO: Store result in artifact.content + MinIO
    # TODO: Update artifact.status = "ready"

    logger.info("artifact_generation_completed", artifact_id=artifact_id)
    return {"artifact_id": artifact_id, "status": "ready"}

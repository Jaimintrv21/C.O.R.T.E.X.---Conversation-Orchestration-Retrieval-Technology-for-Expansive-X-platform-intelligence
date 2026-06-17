"""Analytics Celery tasks."""
from __future__ import annotations
from app.workers.celery_app import celery_app
import structlog

logger = structlog.get_logger()


@celery_app.task(name="app.workers.tasks.analytics_tasks.compute_daily_analytics")
def compute_daily_analytics():
    """Compute daily analytics snapshots for all users."""
    logger.info("daily_analytics_started")
    # TODO: Aggregate conversation counts, message counts, token usage per user
    # TODO: Insert into analytics_snapshots table
    logger.info("daily_analytics_completed")


@celery_app.task(name="app.workers.tasks.analytics_tasks.extract_topics")
def extract_topics(conversation_ids: list[str]):
    """Extract topics from conversations using BERTopic."""
    logger.info("topic_extraction_started", count=len(conversation_ids))
    # TODO: Load message content
    # TODO: Run BERTopic clustering
    # TODO: Update conversation.topics column
    logger.info("topic_extraction_completed")

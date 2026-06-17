"""Celery application instance."""
from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "cortex",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_default_retry_delay=30,
    task_max_retries=3,
    worker_max_tasks_per_child=100,
    result_expires=86400,  # 24h
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.workers.tasks"])

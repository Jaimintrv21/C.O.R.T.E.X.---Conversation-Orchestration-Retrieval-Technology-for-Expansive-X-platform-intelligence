"""Celery beat schedule — periodic tasks."""
from celery.schedules import crontab

beat_schedule = {
    "compute-daily-analytics": {
        "task": "app.workers.tasks.analytics_tasks.compute_daily_analytics",
        "schedule": crontab(hour=2, minute=0),  # 2 AM UTC
    },
    "detect-duplicates": {
        "task": "app.workers.tasks.import_tasks.detect_duplicates",
        "schedule": crontab(hour=3, minute=0),  # 3 AM UTC
    },
    "reconcile-file-watch-connections": {
        "task": "app.workers.tasks.sync_tasks.reconcile_file_watch_connections",
        "schedule": crontab(minute="*/15"),
    },
}

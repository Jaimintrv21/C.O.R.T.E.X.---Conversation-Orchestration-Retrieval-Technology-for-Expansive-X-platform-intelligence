"""Reconciliation tasks for provider connections."""
from __future__ import annotations

from datetime import UTC, datetime

import structlog

from app.firestore import FirestoreStore
from app.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(name="app.workers.tasks.sync_tasks.reconcile_file_watch_connections")
def reconcile_file_watch_connections() -> dict[str, int]:
    """Refresh file-watch connection status from real file-import activity.

    This is bookkeeping only. The real ingest path is still /conversations/import;
    the task simply mirrors recent import activity onto file-watch provider
    accounts so the UI can show a fresh connected timestamp.
    """
    store = FirestoreStore()
    accounts = store.db.collection("provider_accounts").where("connection_type", "==", "file_watch").stream()
    updated = 0
    examined = 0

    for snapshot in accounts:
        examined += 1
        account = snapshot.to_dict() or {}
        user_id = account.get("user_id")
        if not user_id:
            continue

        jobs = store.list_jobs(str(user_id), limit=100)
        latest_import = None
        for job in jobs:
            if job.get("job_type") != "import_file" or job.get("status") != "completed":
                continue
            finished_at = job.get("completed_at") or job.get("created_at")
            if finished_at and (latest_import is None or finished_at > latest_import):
                latest_import = finished_at

        if not latest_import:
            continue

        current_synced = account.get("last_synced_at")
        if current_synced and latest_import <= current_synced:
            continue

        snapshot.reference.set(
            {
                "last_synced_at": latest_import if isinstance(latest_import, datetime) else datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            },
            merge=True,
        )
        updated += 1

    logger.info("file_watch_reconciliation_completed", examined=examined, updated=updated)
    return {"examined": examined, "updated": updated}

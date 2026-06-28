import asyncio
import io
import zipfile
from datetime import UTC, datetime

import structlog

from app.workers.celery_app import celery_app
from app.firestore import FirestoreStore
from app.services.storage_service import StorageService
from app.services.import_service import ImportPipelineService
from app.providers.registry import load_and_parse

logger = structlog.get_logger()

@celery_app.task(bind=True, name="app.workers.tasks.connector_tasks.run_connector_import")
def run_connector_import(self, import_id: str, user_id: str, connector_id: str, parser_slug: str, file_key: str):
    async def _run():
        store = FirestoreStore()
        try:
            storage = StorageService()
            file_content = storage.get_bytes(file_key)
            if not file_content:
                raise ValueError("File not found in storage")
                
            import tempfile
            import os
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(file_content)
                tmp_path = tmp.name
                
            try:
                # Parse using the detected or specified parser
                conversations = load_and_parse(tmp_path, parser_slug)
            finally:
                os.unlink(tmp_path)
                
            # Deduplicate, store and embed
            import_service = ImportPipelineService(store=store)
            result = await import_service.process_conversations(
                user_id=user_id,
                workspace_id=None,
                conversations=conversations,
                connector_id=connector_id,
                import_source="file_export"
            )
            
            store.update_import_record(
                import_id,
                {
                    "status": "completed",
                    "conversations_imported": result["imported"],
                    "conversations_updated": result["updated"],
                    "conversations_skipped": result["skipped"],
                    "completed_at": datetime.now(UTC),
                }
            )
        except Exception as exc:
            logger.exception("connector_import_failed", import_id=import_id)
            store.update_import_record(
                import_id,
                {
                    "status": "failed",
                    "error_message": str(exc),
                    "completed_at": datetime.now(UTC),
                }
            )
            
    loop = asyncio.new_event_loop()
    loop.run_until_complete(_run())


@celery_app.task(bind=True, name="app.workers.tasks.connector_tasks.run_connector_export")
def run_connector_export(self, job_id: str, user_id: str, connector_id: str, format: str):
    async def _run():
        store = FirestoreStore()
        store.update_job(job_id, {"status": "running", "started_at": datetime.now(UTC), "progress": 0.1})
        try:
            # 1. Fetch conversations for this connector
            all_convs = store.list_conversations(user_id)
            connector_convs = [c for c in all_convs if c.get("connector_id") == connector_id or c.get("provider_slug") == connector_id]
            
            if not connector_convs:
                store.update_job(job_id, {
                    "status": "completed",
                    "progress": 1.0,
                    "result": {"download_url": None, "message": "No conversations found for this connector"},
                    "completed_at": datetime.now(UTC)
                })
                return
                
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
                for idx, conv in enumerate(connector_convs):
                    # Update progress
                    if idx % 10 == 0:
                        store.update_job(job_id, {"progress": 0.1 + 0.8 * (idx / max(1, len(connector_convs)))})
                        
                    conv_id = conv["id"]
                    messages = store.list_messages(conv_id)
                    
                    # Generate markdown
                    title = conv.get("title") or f"Conversation {idx+1}"
                    # Make safe filename
                    safe_title = "".join(c if c.isalnum() else "_" for c in title)
                    started = conv.get("started_at")
                    date_str = started.strftime("%Y-%m-%d") if started else "Unknown"
                    filename = f"{date_str}_{safe_title[:30]}_{conv_id[-6:]}.md"
                    
                    content = f"# {title}\n\n"
                    content += f"**Connector**: {connector_id}\n"
                    content += f"**Date**: {date_str}\n\n"
                    
                    for msg in messages:
                        role = msg.get("role", "unknown").capitalize()
                        text = msg.get("content", "")
                        content += f"### {role}\n{text}\n\n"
                        
                    zip_file.writestr(filename, content)
                    
            # 2. Upload zip to storage
            zip_buffer.seek(0)
            storage = StorageService()
            now_str = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
            export_key = f"exports/{user_id}/{connector_id}_export_{now_str}.zip"
            storage.store_bytes(export_key, zip_buffer.getvalue(), "application/zip")
            
            # 3. Generate presigned URL
            download_url = storage.get_presigned_url(export_key, expires_in_seconds=86400)
            
            store.update_job(job_id, {
                "status": "completed",
                "progress": 1.0,
                "result": {"download_url": download_url},
                "completed_at": datetime.now(UTC)
            })
            
        except Exception as exc:
            logger.exception("connector_export_failed", job_id=job_id)
            store.update_job(job_id, {
                "status": "failed",
                "error_message": str(exc),
                "completed_at": datetime.now(UTC)
            })
            
    loop = asyncio.new_event_loop()
    loop.run_until_complete(_run())

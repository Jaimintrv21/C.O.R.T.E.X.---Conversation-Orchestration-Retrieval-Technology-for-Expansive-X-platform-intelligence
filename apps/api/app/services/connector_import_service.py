from typing import Any
from fastapi import HTTPException

from app.schemas.connectors import CONNECTOR_REGISTRY
from app.providers.registry import detect_provider
from app.firestore import FirestoreStore
from app.workers.tasks.connector_tasks import run_connector_import
from app.services.storage_service import StorageService
from app.config import get_settings


class ConnectorImportService:
    async def import_file(
        self, *, user_id: str, connector_id: str, 
        filename: str, file_content: bytes,
    ) -> dict[str, Any]:
        """
        1. Look up ConnectorDefinition.
        2. Check available_methods.
        3. Detect format using file_import_parser.
        4. Trigger celery task for the actual parsing and ingestion.
        """
        connector = CONNECTOR_REGISTRY.get(connector_id)
        if not connector:
            raise HTTPException(status_code=404, detail="Connector not found")
            
        if "file_import" not in connector.available_methods:
            methods = ", ".join(connector.available_methods)
            raise HTTPException(
                status_code=400,
                detail=f"This connector does not support file import. Supported methods: {methods}"
            )
            
        parser_slug = connector.file_import_parser
        parser = detect_provider(file_content, hint=parser_slug)
        
        if not parser or (parser.slug != parser_slug and parser_slug is not None):
            # Attempt to use the explicit parser to detect
            from app.providers.registry import _PARSERS
            explicit_parser = next((p for p in _PARSERS if p.slug == parser_slug), None)
            if not explicit_parser or not explicit_parser.detect_format(file_content):
                note = connector.export_instructions.file_format_note if connector.export_instructions else "an export file"
                raise HTTPException(
                    status_code=422,
                    detail=f"This doesn't look like a {connector.display_name} export file. Expected: {note}"
                )
            parser = explicit_parser
            
        store = FirestoreStore()
        import_record = store.create_import_record(
            user_id=user_id,
            connector_id=connector_id,
            filename=filename,
            file_size_bytes=len(file_content)
        )
        
        import_id = import_record["id"]
        
        # Save file to storage for celery to pick up
        storage = StorageService()
        key = f"imports/{user_id}/{connector_id}/{import_id}/{filename}"
        storage.store_bytes(key, file_content, "application/octet-stream")
        
        # Queue task
        run_connector_import.delay(
            import_id=import_id,
            user_id=user_id,
            connector_id=connector_id,
            parser_slug=parser.slug,
            file_key=key
        )
        
        return {"import_id": import_id}

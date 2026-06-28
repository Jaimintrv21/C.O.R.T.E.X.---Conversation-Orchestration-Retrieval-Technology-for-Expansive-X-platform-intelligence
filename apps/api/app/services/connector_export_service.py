from typing import Literal, Any
from fastapi import HTTPException

from app.schemas.connectors import CONNECTOR_REGISTRY
from app.firestore import FirestoreStore
from app.workers.tasks.connector_tasks import run_connector_export


class ConnectorExportService:
    async def export_connector_data(
        self, *, user_id: str, connector_id: str,
        format: Literal["json", "markdown_zip"] = "json",
    ) -> dict[str, Any]:
        """
        1. Validate connector_id exists in CONNECTOR_REGISTRY.
        2. Create a job for the export.
        3. Queue the celery task to do the actual export.
        4. Return job_id.
        """
        if connector_id not in CONNECTOR_REGISTRY:
            raise HTTPException(status_code=404, detail="Connector not found")
            
        store = FirestoreStore()
        job = store.create_job(
            user_id=user_id,
            workspace_id=None,
            job_type="connector_export",
            payload={
                "connector_id": connector_id,
                "format": format,
            }
        )
        
        run_connector_export.delay(
            job_id=job["id"],
            user_id=user_id,
            connector_id=connector_id,
            format=format
        )
        
        return {"job_id": job["id"]}

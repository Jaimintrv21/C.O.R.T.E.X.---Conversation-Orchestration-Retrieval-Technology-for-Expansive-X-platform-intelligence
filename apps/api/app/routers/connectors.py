import uuid
from datetime import UTC, datetime
from typing import Literal, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.firestore import FirestoreStore
from app.schemas.connectors import CONNECTOR_REGISTRY, ConnectorDefinition
from app.schemas.common import ApiResponse, ApiListResponse

from app.services.connector_import_service import ConnectorImportService
from app.services.connector_export_service import ConnectorExportService

router = APIRouter(prefix="/connectors", tags=["Connectors"])


@router.get("", response_model=ApiListResponse[ConnectorDefinition])
async def list_connectors():
    return ApiListResponse(data=list(CONNECTOR_REGISTRY.values()))


@router.get("/{connector_id}", response_model=ApiResponse[ConnectorDefinition])
async def get_connector(connector_id: str):
    connector = CONNECTOR_REGISTRY.get(connector_id)
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    return ApiResponse(data=connector)


@router.post("/{connector_id}/import", response_model=ApiResponse)
async def import_connector_data(
    connector_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    connector = CONNECTOR_REGISTRY.get(connector_id)
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
        
    if "file_import" not in connector.available_methods:
        available = ", ".join(connector.available_methods)
        raise HTTPException(
            status_code=400,
            detail=f"Connector {connector_id} does not support file_import. Available methods: {available}"
        )
        
    # Rate limit check can be done here if needed.
    # Read file
    content = await file.read()
    
    # 500MB size limit
    from app.config import get_settings
    if len(content) > get_settings().max_upload_size_bytes:
        raise HTTPException(status_code=413, detail="File too large")
        
    service = ConnectorImportService()
    result = await service.import_file(
        user_id=user["id"],
        connector_id=connector_id,
        filename=file.filename or "upload.zip",
        file_content=content
    )
    
    return ApiResponse(data={"import_id": result["import_id"], "status": "processing"})


@router.get("/{connector_id}/import-history", response_model=ApiListResponse)
async def list_import_history(
    connector_id: str,
    user: dict = Depends(get_current_user)
):
    connector = CONNECTOR_REGISTRY.get(connector_id)
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
        
    store = FirestoreStore()
    history = store.list_import_history(user["id"], connector_id)
    return ApiListResponse(data=history)


@router.get("/{connector_id}/import/{import_id}", response_model=ApiResponse)
async def get_import_status(
    connector_id: str,
    import_id: str,
    user: dict = Depends(get_current_user)
):
    connector = CONNECTOR_REGISTRY.get(connector_id)
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
        
    store = FirestoreStore()
    doc = store._col("import_history").document(import_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Import not found")
        
    data = doc.to_dict()
    if data.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    data["id"] = doc.id
    return ApiResponse(data=data)


class ExportRequest(BaseModel):
    format: Literal["json", "markdown_zip"] = "json"


@router.post("/{connector_id}/export", response_model=ApiResponse)
async def export_connector_data(
    connector_id: str,
    request: ExportRequest,
    user: dict = Depends(get_current_user)
):
    connector = CONNECTOR_REGISTRY.get(connector_id)
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
        
    service = ConnectorExportService()
    result = await service.export_connector_data(
        user_id=user["id"],
        connector_id=connector_id,
        format=request.format
    )
    
    return ApiResponse(data={"job_id": result["job_id"]})


@router.get("/{connector_id}/export/{job_id}", response_model=ApiResponse)
async def get_export_status(
    connector_id: str,
    job_id: str,
    user: dict = Depends(get_current_user)
):
    connector = CONNECTOR_REGISTRY.get(connector_id)
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
        
    store = FirestoreStore()
    job = store.get_job(job_id)
    if not job or job.get("user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.get("job_type") != "connector_export":
        raise HTTPException(status_code=400, detail="Invalid job type")
        
    return ApiResponse(data={
        "status": job["status"],
        "progress": job["progress"],
        "progress_detail": job["progress_detail"],
        "error_message": job["error_message"],
        "download_url": job.get("result", {}).get("download_url")
    })

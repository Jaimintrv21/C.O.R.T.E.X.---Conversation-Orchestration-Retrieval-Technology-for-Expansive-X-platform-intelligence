"""Artifacts router backed by Firebase/Firestore."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from app.dependencies import emit_audit_log, get_current_user, get_idempotency_key
from app.firestore import FirestoreStore
from app.schemas.artifacts import ArtifactResponse, GenerateArtifactRequest
from app.schemas.common import ApiListResponse, ApiResponse, Meta

router = APIRouter(prefix="/artifacts", tags=["Artifacts"])


@router.get("", response_model=ApiListResponse[ArtifactResponse])
async def list_artifacts(user: dict = Depends(get_current_user)):
    artifacts = FirestoreStore().list_artifacts(user["id"])
    return ApiListResponse(data=[ArtifactResponse.model_validate(artifact) for artifact in artifacts])


from app.schemas.artifacts import SourcePickerGroup, SourcePickerItem
from collections import defaultdict

@router.get("/source-picker", response_model=ApiListResponse[SourcePickerGroup])
async def get_source_picker(user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    conversations = store.list_conversations(user["id"])
    
    grouped = defaultdict(list)
    for c in conversations:
        provider = c.get("provider_slug") or "unknown"
        grouped[provider].append(
            SourcePickerItem(
                id=c["id"],
                title=c.get("title") or "Untitled",
                message_count=c.get("message_count", 0),
                last_message_at=c.get("updated_at") or c.get("created_at"),
                preview=c.get("preview")
            )
        )
    
    response_data = [
        SourcePickerGroup(provider_slug=provider, conversations=convs)
        for provider, convs in grouped.items()
    ]
    return ApiListResponse(data=response_data)


@router.post("/generate", response_model=ApiResponse, status_code=202)
async def generate_artifact(
    body: GenerateArtifactRequest,
    request: Request,
    user: dict = Depends(get_current_user),
    idempotency_key: str | None = Depends(get_idempotency_key),
):
    if len(body.source_ids) > 20:
        raise HTTPException(status_code=400, detail="Cannot generate artifact from more than 20 sources at once")

    store = FirestoreStore()
    artifact = store.create_artifact(
        user_id=user["id"],
        workspace_id=str(body.workspace_id) if body.workspace_id else None,
        title=body.title,
        artifact_type=body.artifact_type,
        source_ids=[str(source_id) for source_id in body.source_ids],
        prompt=body.prompt,
        model_used=body.model,
    )
    job = store.create_job(
        user_id=user["id"],
        workspace_id=str(body.workspace_id) if body.workspace_id else None,
        job_type="generate_artifact",
        payload={"artifact_id": artifact["id"], "model": body.model},
    )

    await emit_audit_log(user["id"], "artifact.generate_started", "artifact", artifact["id"], request)

    from app.workers.tasks.artifact_tasks import generate_artifact as generate_artifact_task

    task = generate_artifact_task.delay(artifact["id"], body.model)
    store.update_job(job["id"], {"celery_task_id": task.id})

    return ApiResponse(
        data={"artifact_id": artifact["id"], "job_id": job["id"], "status": "queued"},
        meta=Meta(idempotency_key=idempotency_key),
    )


@router.get("/{artifact_id}", response_model=ApiResponse[ArtifactResponse])
async def get_artifact(artifact_id: uuid.UUID, user: dict = Depends(get_current_user)):
    artifact = FirestoreStore().get_artifact(str(artifact_id))
    if not artifact or artifact.get("user_id") != user["id"] or artifact.get("deleted_at") is not None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return ApiResponse(data=ArtifactResponse.model_validate(artifact))


@router.get("/{artifact_id}/download")
async def download_artifact(artifact_id: uuid.UUID, user: dict = Depends(get_current_user)):
    artifact = FirestoreStore().get_artifact(str(artifact_id))
    if not artifact or artifact.get("user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Artifact not found")
    if artifact.get("status") != "ready":
        raise HTTPException(status_code=409, detail="Artifact not ready for download")
    return artifact.get("content") or {}


@router.delete("/{artifact_id}", response_model=ApiResponse)
async def delete_artifact(artifact_id: uuid.UUID, request: Request, user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    artifact = store.get_artifact(str(artifact_id))
    if not artifact or artifact.get("user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Artifact not found")
    store.delete_artifact(str(artifact_id))
    await emit_audit_log(user["id"], "artifact.deleted", "artifact", str(artifact_id), request)
    return ApiResponse(data={"message": "Artifact deleted"})

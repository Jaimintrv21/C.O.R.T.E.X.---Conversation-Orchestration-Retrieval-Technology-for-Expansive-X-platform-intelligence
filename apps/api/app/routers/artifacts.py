"""Artifacts router: generate, get, download, delete."""
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import emit_audit_log, get_current_user, get_idempotency_key
from app.models.artifact import Artifact
from app.models.job import Job
from app.models.user import User
from app.schemas.artifacts import ArtifactResponse, GenerateArtifactRequest
from app.schemas.common import ApiResponse, Meta

router = APIRouter(prefix="/artifacts", tags=["Artifacts"])


@router.post("/generate", response_model=ApiResponse, status_code=202)
async def generate_artifact(
    body: GenerateArtifactRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str | None = Depends(get_idempotency_key),
):
    artifact = Artifact(
        user_id=user.id,
        workspace_id=body.workspace_id,
        title=body.title,
        artifact_type=body.artifact_type,
        status="pending",
        source_ids=body.source_ids,
        prompt=body.prompt,
    )
    db.add(artifact)
    await db.flush()

    job = Job(
        user_id=user.id,
        workspace_id=body.workspace_id,
        job_type="generate_artifact",
        payload={"artifact_id": str(artifact.id), "model": body.model},
    )
    db.add(job)
    await db.flush()

    await emit_audit_log(db, user.id, "artifact.generate_started", "artifact", artifact.id, request)

    return ApiResponse(
        data={"artifact_id": str(artifact.id), "job_id": str(job.id), "status": "queued"},
        meta=Meta(idempotency_key=idempotency_key),
    )


@router.get("/{artifact_id}", response_model=ApiResponse[ArtifactResponse])
async def get_artifact(
    artifact_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    artifact = await db.get(Artifact, artifact_id)
    if not artifact or artifact.user_id != user.id or artifact.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return ApiResponse(data=ArtifactResponse.model_validate(artifact))


@router.get("/{artifact_id}/download")
async def download_artifact(
    artifact_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    artifact = await db.get(Artifact, artifact_id)
    if not artifact or artifact.user_id != user.id:
        raise HTTPException(status_code=404, detail="Artifact not found")
    if artifact.status != "ready":
        raise HTTPException(status_code=409, detail="Artifact not ready for download")

    # TODO: Stream from MinIO using storage_key
    from fastapi.responses import JSONResponse
    return JSONResponse(content=artifact.content or {})


@router.delete("/{artifact_id}", response_model=ApiResponse)
async def delete_artifact(
    artifact_id: uuid.UUID,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    artifact = await db.get(Artifact, artifact_id)
    if not artifact or artifact.user_id != user.id:
        raise HTTPException(status_code=404, detail="Artifact not found")

    from datetime import datetime, timezone
    artifact.deleted_at = datetime.now(timezone.utc)
    await emit_audit_log(db, user.id, "artifact.deleted", "artifact", artifact.id, request)
    return ApiResponse(data={"message": "Artifact deleted"})

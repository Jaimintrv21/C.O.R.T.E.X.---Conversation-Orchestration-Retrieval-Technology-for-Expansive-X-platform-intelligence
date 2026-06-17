"""Jobs router: list, get, cancel + WebSocket progress."""
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import emit_audit_log, get_current_user
from app.models.job import Job
from app.models.user import User
from app.schemas.artifacts import JobResponse
from app.schemas.common import ApiResponse, ApiListResponse

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=ApiListResponse[JobResponse])
async def list_jobs(
    status_filter: str | None = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Job).where(Job.user_id == user.id).order_by(Job.created_at.desc())
    if status_filter:
        query = query.where(Job.status == status_filter)
    query = query.limit(limit)
    result = await db.execute(query)
    jobs = result.scalars().all()
    return ApiListResponse(data=[JobResponse.model_validate(j) for j in jobs])


@router.get("/{job_id}", response_model=ApiResponse[JobResponse])
async def get_job(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(Job, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    return ApiResponse(data=JobResponse.model_validate(job))


@router.delete("/{job_id}", response_model=ApiResponse)
async def cancel_job(
    job_id: uuid.UUID,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(Job, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status in ("completed", "failed", "cancelled"):
        raise HTTPException(status_code=409, detail=f"Job already {job.status}")

    job.status = "cancelled"
    # TODO: Revoke Celery task if running
    await emit_audit_log(db, user.id, "job.cancelled", "job", job.id, request)
    return ApiResponse(data={"message": "Job cancelled"})


@router.websocket("/ws/{job_id}")
async def job_progress_ws(websocket: WebSocket, job_id: uuid.UUID):
    """WebSocket endpoint for real-time job progress updates."""
    await websocket.accept()
    try:
        import asyncio
        import json
        while True:
            # Poll job status from DB
            async with get_db().__aiter__().__anext__() as db:
                job = await db.get(Job, job_id)
                if not job:
                    await websocket.send_json({"error": "Job not found"})
                    break

                await websocket.send_json({
                    "job_id": str(job.id),
                    "status": job.status,
                    "progress": job.progress,
                    "progress_detail": job.progress_detail,
                    "error_message": job.error_message,
                })

                if job.status in ("completed", "failed", "cancelled"):
                    break

            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

"""Jobs router backed by Firebase/Firestore."""
from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect

from app.dependencies import emit_audit_log, get_current_user
from app.firestore import FirestoreStore
from app.schemas.artifacts import JobResponse
from app.schemas.common import ApiListResponse, ApiResponse

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=ApiListResponse[JobResponse])
async def list_jobs(status_filter: str | None = None, limit: int = 50, user: dict = Depends(get_current_user)):
    jobs = FirestoreStore().list_jobs(user["id"], status_filter=status_filter, limit=limit)
    return ApiListResponse(data=[JobResponse.model_validate(job) for job in jobs])


@router.get("/{job_id}", response_model=ApiResponse[JobResponse])
async def get_job(job_id: uuid.UUID, user: dict = Depends(get_current_user)):
    job = FirestoreStore().get_job(str(job_id))
    if not job or job.get("user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Job not found")
    return ApiResponse(data=JobResponse.model_validate(job))


@router.delete("/{job_id}", response_model=ApiResponse)
async def cancel_job(job_id: uuid.UUID, request: Request, user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    job = store.get_job(str(job_id))
    if not job or job.get("user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] in ("completed", "failed", "cancelled"):
        raise HTTPException(status_code=409, detail=f"Job already {job['status']}")

    store.update_job(str(job_id), {"status": "cancelled", "completed_at": datetime.now(UTC)})
    await emit_audit_log(user["id"], "job.cancelled", "job", str(job_id), request)
    return ApiResponse(data={"message": "Job cancelled"})


@router.websocket("/ws/{job_id}")
async def job_progress_ws(websocket: WebSocket, job_id: uuid.UUID):
    await websocket.accept()
    store = FirestoreStore()
    try:
        while True:
            job = store.get_job(str(job_id))
            if not job:
                await websocket.send_json({"error": "Job not found"})
                break

            await websocket.send_json(
                {
                    "job_id": job["id"],
                    "status": job["status"],
                    "progress": job["progress"],
                    "progress_detail": job["progress_detail"],
                    "error_message": job["error_message"],
                }
            )
            if job["status"] in ("completed", "failed", "cancelled"):
                break
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

"""Health check endpoints: /health, /ready, /live."""
from __future__ import annotations
from fastapi import APIRouter
from app.firestore import get_firestore_client
from app.schemas.common import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", version="0.1.0", services={"api": "running"})


@router.get("/ready", response_model=HealthResponse)
async def ready():
    get_firestore_client()
    return HealthResponse(
        status="ok",
        version="0.1.0",
        services={"api": "ready", "db": "firebase-connected"},
    )


@router.get("/live", response_model=HealthResponse)
async def live():
    return HealthResponse(status="ok", version="0.1.0")

"""Health check endpoints: /health, /ready, /live."""
from __future__ import annotations
from fastapi import APIRouter, HTTPException
from app.firestore import get_firestore_client
from app.neo4j_client import get_neo4j_driver
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


@router.get("/health/neo4j", response_model=HealthResponse)
async def health_neo4j():
    try:
        driver = get_neo4j_driver()
        with driver.session() as session:
            session.run("RETURN 1")
        return HealthResponse(status="ok", version="0.1.0", services={"neo4j": "connected"})
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Neo4j connection error: {str(e)}")

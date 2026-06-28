"""
C.O.R.T.E.X. API — FastAPI application entry point.

Registers all routers, middleware, and lifespan events.
OpenAPI spec is auto-generated from Pydantic schemas (source of truth).
"""
from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.firestore import get_firestore_client
from app.logging_config import configure_logging
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware

# Import all routers
from app.routers import health, auth, conversations, search, analytics, settings as settings_router
from app.routers import knowledge_graph, artifacts, jobs, workspaces, provider_accounts, ingest, usage, connectors

settings_config = get_settings()
configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    get_firestore_client()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="C.O.R.T.E.X. API",
    description="AI Conversation Intelligence Platform — Your conversations, your knowledge, your control.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── Middleware (order matters: last added = first executed) ──────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings_config.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(LoggingMiddleware)

# ── Routers ─────────────────────────────────────────────────────────────

# Health (no prefix)
app.include_router(health.router)

# API v1 routes
prefix = settings_config.api_prefix

app.include_router(auth.router, prefix=prefix)
app.include_router(settings_router.router, prefix=prefix)
app.include_router(conversations.router, prefix=prefix)
app.include_router(search.router, prefix=prefix)
app.include_router(analytics.router, prefix=prefix)
app.include_router(knowledge_graph.router, prefix=prefix)
app.include_router(artifacts.router, prefix=prefix)
app.include_router(jobs.router, prefix=prefix)
app.include_router(workspaces.router, prefix=prefix)
app.include_router(provider_accounts.router, prefix=prefix)
app.include_router(ingest.router, prefix=prefix)
app.include_router(usage.router, prefix=prefix)
app.include_router(connectors.router, prefix=prefix)

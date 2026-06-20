"""Rate limiting middleware — Redis-backed sliding window."""
from __future__ import annotations
import time
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from app.config import get_settings

settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter (Redis-backed version for production)."""

    def __init__(self, app):
        super().__init__(app)
        self._window: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip health endpoints
        if request.url.path in ("/health", "/ready", "/live"):
            return await call_next(request)

        # Determine limit based on auth presence
        has_auth = "authorization" in request.headers
        if request.url.path.endswith("/ingest/extension") or request.url.path.endswith("/ingest/api-log"):
            limit = settings.rate_limit_extension
        else:
            limit = settings.rate_limit_authenticated if has_auth else settings.rate_limit_unauthenticated

        # Key by IP (production should key by user_id for authenticated)
        client_ip = request.client.host if request.client else "unknown"
        key = f"{client_ip}:{'auth' if has_auth else 'anon'}"

        now = time.time()
        window = self._window.setdefault(key, [])
        # Clean entries older than 60s
        window[:] = [t for t in window if now - t < 60]

        if len(window) >= limit:
            return JSONResponse(
                status_code=429,
                content={
                    "data": None,
                    "meta": {"timestamp": now},
                    "errors": [{"code": "RATE_LIMITED", "message": f"Rate limit exceeded: {limit} req/min"}],
                },
                headers={"Retry-After": "60"},
            )

        window.append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, limit - len(window)))
        return response

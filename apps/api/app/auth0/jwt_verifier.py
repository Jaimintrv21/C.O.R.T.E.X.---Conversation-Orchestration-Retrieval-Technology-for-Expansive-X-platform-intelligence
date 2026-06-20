"""Auth0 JWT verification helpers."""
from __future__ import annotations

import json
import threading
import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt import InvalidTokenError

from app.config import get_settings

AUTH0_ROLES_CLAIM = "https://cortex.app/roles"
AUTH0_WORKSPACE_CLAIM = "https://cortex.app/workspace_id"


class Auth0VerificationError(ValueError):
    """Raised when an Auth0 access token is invalid."""


@dataclass(slots=True)
class _JWKSCacheEntry:
    fetched_at: float
    keys: list[dict[str, Any]]


_JWKS_CACHE: _JWKSCacheEntry | None = None
_JWKS_CACHE_LOCK = threading.Lock()


def _jwks_url() -> str:
    settings = get_settings()
    if not settings.auth0_domain:
        raise Auth0VerificationError("AUTH0_DOMAIN is not configured")
    return f"https://{settings.auth0_domain}/.well-known/jwks.json"


def _issuer() -> str:
    settings = get_settings()
    if not settings.auth0_domain:
        raise Auth0VerificationError("AUTH0_DOMAIN is not configured")
    return f"https://{settings.auth0_domain}/"


def _fetch_jwks() -> list[dict[str, Any]]:
    try:
        response = httpx.get(_jwks_url(), timeout=10.0)
        response.raise_for_status()
        payload = response.json()
        keys = payload.get("keys")
        if not isinstance(keys, list):
            raise Auth0VerificationError("Auth0 JWKS payload missing keys")
        return [key for key in keys if isinstance(key, dict)]
    except (httpx.HTTPError, ValueError) as exc:
        raise Auth0VerificationError("Unable to fetch Auth0 JWKS") from exc


def _get_cached_jwks(*, force_refresh: bool = False) -> list[dict[str, Any]]:
    settings = get_settings()
    ttl = max(60, int(settings.auth0_jwks_cache_ttl_seconds or 86_400))
    now = time.time()

    global _JWKS_CACHE
    with _JWKS_CACHE_LOCK:
        if (
            not force_refresh
            and _JWKS_CACHE is not None
            and now - _JWKS_CACHE.fetched_at < ttl
        ):
            return _JWKS_CACHE.keys

        keys = _fetch_jwks()
        _JWKS_CACHE = _JWKSCacheEntry(fetched_at=now, keys=keys)
        return keys


def warm_auth0_jwks_cache() -> None:
    """Fetch JWKS eagerly during startup when Auth0 is enabled."""
    if get_settings().auth0_domain:
        _get_cached_jwks(force_refresh=True)


def _resolve_jwk(kid: str) -> dict[str, Any]:
    keys = _get_cached_jwks()
    match = next((key for key in keys if key.get("kid") == kid), None)
    if match is not None:
        return match

    keys = _get_cached_jwks(force_refresh=True)
    match = next((key for key in keys if key.get("kid") == kid), None)
    if match is None:
        raise Auth0VerificationError(f"Auth0 signing key not found for kid={kid}")
    return match


def verify_auth0_token(token: str) -> dict[str, Any]:
    """Verify an Auth0 RS256 access token and return its payload."""
    settings = get_settings()
    if not settings.auth0_domain or not settings.auth0_audience:
        raise Auth0VerificationError("AUTH0_DOMAIN and AUTH0_AUDIENCE must be configured")

    try:
        header = jwt.get_unverified_header(token)
    except InvalidTokenError as exc:
        raise Auth0VerificationError("Invalid JWT header") from exc

    kid = header.get("kid")
    if not kid:
        raise Auth0VerificationError("JWT header missing kid")

    jwk = _resolve_jwk(str(kid))
    try:
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
        return jwt.decode(
            token,
            key=public_key,
            algorithms=["RS256"],
            audience=settings.auth0_audience,
            issuer=_issuer(),
            options={
                "require": ["exp", "iat", "sub"],
            },
        )
    except InvalidTokenError as exc:
        raise Auth0VerificationError("Auth0 token verification failed") from exc

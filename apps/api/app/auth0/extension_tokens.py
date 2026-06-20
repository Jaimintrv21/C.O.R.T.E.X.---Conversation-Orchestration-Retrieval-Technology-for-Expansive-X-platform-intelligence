"""Scoped tokens used by browser extensions and file-watch agents."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from jwt import InvalidTokenError

from app.config import get_settings
from app.firestore import FirestoreStore

EXTENSION_TOKEN_TYPE = "extension"
EXTENSION_TOKEN_SCOPE = "ingest:conversations"


class ExtensionTokenError(ValueError):
    """Raised when an extension-scoped token is invalid."""


def issue_extension_token(
    *,
    user_id: str,
    provider_account_id: str,
    provider_slug: str,
    jti: str,
    expires_at: datetime | None = None,
) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    expiry = expires_at or (now + timedelta(days=max(1, int(settings.extension_token_ttl_days or 30))))
    payload = {
        "sub": user_id,
        "provider_account_id": provider_account_id,
        "provider_slug": provider_slug,
        "scope": EXTENSION_TOKEN_SCOPE,
        "token_type": EXTENSION_TOKEN_TYPE,
        "aud": settings.extension_token_audience,
        "iss": "cortex-backend",
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int(expiry.timestamp()),
        "jti": jti,
    }
    return jwt.encode(payload, settings.extension_token_secret, algorithm="HS256")


def verify_extension_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.extension_token_secret or not settings.extension_token_audience:
        raise ExtensionTokenError("Extension token settings are not configured")

    try:
        payload = jwt.decode(
            token,
            settings.extension_token_secret,
            algorithms=["HS256"],
            audience=settings.extension_token_audience,
            issuer="cortex-backend",
            options={"require": ["exp", "iat", "nbf", "sub", "aud", "jti"]},
        )
    except InvalidTokenError as exc:
        raise ExtensionTokenError("Invalid extension token") from exc

    if payload.get("token_type") != EXTENSION_TOKEN_TYPE:
        raise ExtensionTokenError("Token is not an extension-scoped token")
    if payload.get("scope") != EXTENSION_TOKEN_SCOPE:
        raise ExtensionTokenError("Token does not grant ingestion scope")

    jti = str(payload.get("jti") or "")
    if not jti:
        raise ExtensionTokenError("Extension token missing jti")
    if FirestoreStore().is_extension_token_revoked(jti):
        raise ExtensionTokenError("Extension token has been revoked")

    return payload

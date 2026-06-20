"""FastAPI dependency helpers for Firebase-backed persistence."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth0.extension_tokens import ExtensionTokenError, verify_extension_token
from app.auth0.jwt_verifier import Auth0VerificationError, verify_auth0_token
from app.firestore import FirestoreStore

security = HTTPBearer(auto_error=False)


def get_store() -> FirestoreStore:
    return FirestoreStore()


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """Validate an Auth0 JWT and return the authenticated Firestore user document."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    try:
        payload = verify_auth0_token(credentials.credentials)
    except Auth0VerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    store = FirestoreStore()
    user = store.get_or_create_user_from_auth0(user_id, payload)
    if not user or not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    session_key = payload.get("sid") or payload.get("jti")
    if session_key:
        store.upsert_auth0_session(
            str(session_key),
            user_id=user["id"],
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            expires_at=datetime.fromtimestamp(int(payload["exp"]), tz=timezone.utc),
            auth0_jti=str(payload.get("jti")) if payload.get("jti") else None,
            last_seen_at=datetime.fromtimestamp(int(payload.get("iat", payload["exp"])), tz=timezone.utc),
        )
    return user


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    if not credentials:
        return None
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


async def get_extension_scoped_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing extension authorization header",
        )

    try:
        payload = verify_extension_token(credentials.credentials)
    except ExtensionTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid extension token",
        ) from exc

    user_id = payload.get("sub")
    provider_account_id = payload.get("provider_account_id")
    if not user_id or not provider_account_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid extension token payload",
        )

    store = FirestoreStore()
    account = store.get_provider_account(str(provider_account_id))
    if (
        not account
        or account.get("user_id") != str(user_id)
        or account.get("connection_type") != "extension"
        or not account.get("is_active", False)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Extension account not found or inactive",
        )

    token_provider_slug = str(payload.get("provider_slug") or "").lower()
    if token_provider_slug and token_provider_slug != str(account.get("provider_slug") or "").lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Extension token provider mismatch",
        )

    return {
        "user_id": str(user_id),
        "provider_account_id": str(provider_account_id),
        "provider_slug": str(payload.get("provider_slug") or account.get("provider_slug") or ""),
        "claims": payload,
        "account": account,
        "request": request,
    }


async def emit_audit_log(
    user_id: str | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    request: Request | None = None,
    before_state: dict | None = None,
    after_state: dict | None = None,
) -> None:
    FirestoreStore().create_audit_log(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
        before_state=before_state,
        after_state=after_state,
    )


def get_idempotency_key(
    x_idempotency_key: str | None = Header(None, alias="X-Idempotency-Key"),
) -> str | None:
    return x_idempotency_key

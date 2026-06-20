"""Authentication router backed by Firebase/Firestore."""
from __future__ import annotations

import uuid
from datetime import datetime
from hashlib import sha256

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.dependencies import emit_audit_log, get_current_user
from app.firestore import FirestoreStore
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    TotpEnableRequest,
    TotpEnableResponse,
    UserResponse,
    VerifyEmailRequest,
)
from app.schemas.common import ApiResponse
from app.utils.crypto import hash_password, verify_password
from app.utils.tokens import create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=ApiResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, request: Request):
    store = FirestoreStore()
    if store.get_user_by_email(body.email) or store.get_user_by_username(body.username):
        raise HTTPException(status_code=409, detail="Email or username already registered")

    user = store.create_user(
        email=body.email,
        username=body.username,
        display_name=body.display_name or body.username,
        hashed_password=hash_password(body.password),
    )

    await emit_audit_log(user["id"], "user.registered", "user", user["id"], request)
    return ApiResponse(data=UserResponse.model_validate(user))


@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login(body: LoginRequest, request: Request):
    store = FirestoreStore()
    user = store.get_user_by_email(body.email)
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", False):
        raise HTTPException(status_code=403, detail="Account disabled")

    access_token = create_access_token(uuid.UUID(user["id"]), user["role"])
    refresh_token = create_refresh_token(uuid.UUID(user["id"]))
    refresh_payload = decode_token(refresh_token)
    expires_at = refresh_payload["exp"]
    if isinstance(expires_at, (int, float)):
        expires_at = datetime.fromtimestamp(expires_at)

    store.create_session(
        user_id=user["id"],
        token_hash=sha256(refresh_token.encode()).hexdigest(),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        expires_at=expires_at,
    )
    store.update_user(user["id"], {"last_login_at": datetime.utcnow()})

    await emit_audit_log(user["id"], "user.logged_in", "user", user["id"], request)

    from app.config import get_settings

    return ApiResponse(
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=get_settings().jwt_access_token_expire_minutes * 60,
        )
    )


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh(body: RefreshRequest):
    try:
        payload = decode_token(body.refresh_token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    user = FirestoreStore().get_user(user_id) if user_id else None
    if not user or not user.get("is_active", False):
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token(uuid.UUID(user["id"]), user["role"])
    new_refresh = create_refresh_token(uuid.UUID(user["id"]))

    from app.config import get_settings

    return ApiResponse(
        data=TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh,
            expires_in=get_settings().jwt_access_token_expire_minutes * 60,
        )
    )


@router.delete("/logout", response_model=ApiResponse)
async def logout(request: Request, user: dict = Depends(get_current_user)):
    await emit_audit_log(user["id"], "user.logged_out", "user", user["id"], request)
    return ApiResponse(data={"message": "Logged out"})


@router.post("/verify-email", response_model=ApiResponse)
async def verify_email(body: VerifyEmailRequest):
    return ApiResponse(data={"message": "Email verification not yet implemented"})


@router.post("/totp/enable", response_model=ApiResponse[TotpEnableResponse])
async def enable_totp(body: TotpEnableRequest, user: dict = Depends(get_current_user)):
    if not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid password")

    import pyotp

    secret = pyotp.random_base32()
    FirestoreStore().update_user(user["id"], {"totp_secret": secret})
    totp = pyotp.TOTP(secret)

    return ApiResponse(
        data=TotpEnableResponse(
            secret=secret,
            provisioning_uri=totp.provisioning_uri(user["email"], issuer_name="C.O.R.T.E.X."),
            backup_codes=[pyotp.random_base32()[:8] for _ in range(8)],
        )
    )

"""Auth0-backed account housekeeping endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.dependencies import emit_audit_log, get_current_user
from app.firestore import FirestoreStore
from app.schemas.auth import SessionResponse, UserResponse
from app.schemas.common import ApiListResponse, ApiResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=ApiResponse[UserResponse])
async def me(user: dict = Depends(get_current_user)):
    user_data = dict(user)
    user_data["auth_provider"] = user_data.get("auth0_connection")
    return ApiResponse(data=UserResponse.model_validate(user_data))


@router.delete("/logout", response_model=ApiResponse)
async def logout(request: Request, user: dict = Depends(get_current_user)):
    await emit_audit_log(user["id"], "user.logged_out", "user", user["id"], request)
    return ApiResponse(
        data={
            "message": "Logout is handled client-side by Auth0. Clear the local session or redirect to Auth0 logout.",
        }
    )


@router.get("/sessions", response_model=ApiListResponse[SessionResponse])
async def sessions(user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    return ApiListResponse(
        data=[SessionResponse.model_validate(session) for session in store.list_login_history(user["id"])],
    )


@router.delete("/sessions/{session_id}", response_model=ApiResponse)
async def revoke_session(
    session_id: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    store = FirestoreStore()
    session = store.revoke_login_session(user["id"], session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    await emit_audit_log(user["id"], "session.revoked", "session", session_id, request)
    return ApiResponse(data=SessionResponse.model_validate(session))

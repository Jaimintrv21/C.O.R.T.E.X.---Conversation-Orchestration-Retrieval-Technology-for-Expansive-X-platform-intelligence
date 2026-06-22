"""Settings and Account Management endpoints."""
from __future__ import annotations
import uuid
from typing import Any
from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel

from app.dependencies import get_current_user, emit_audit_log
from app.firestore import FirestoreStore
from app.schemas.common import ApiResponse
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/settings", tags=["Settings"])

class ProfileUpdateRequest(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None
    preferences: dict[str, Any] | None = None

class NotificationSettingsRequest(BaseModel):
    job_completion_in_app: bool | None = None
    knowledge_base_updates_in_app: bool | None = None
    weekly_digest_in_app: bool | None = None
    security_alerts_in_app: bool | None = None
    # Email delivery is currently unsupported, but we keep the schema honest.

@router.patch("/profile", response_model=ApiResponse[UserResponse])
async def update_profile(
    body: ProfileUpdateRequest,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Update user profile and preferences."""
    store = FirestoreStore()
    patch_data: dict[str, Any] = {}
    if body.display_name is not None:
        patch_data["display_name"] = body.display_name
    if body.avatar_url is not None:
        patch_data["avatar_url"] = body.avatar_url
    if body.preferences is not None:
        # Check and clean preferences based on prompt rules
        preferences = dict(body.preferences)
        preferences.pop("check_breached_passwords", None) # Removed, Auth0 handles it
        patch_data["preferences"] = {**(user.get("preferences") or {}), **preferences}

    if not patch_data:
        return ApiResponse(data=UserResponse.model_validate(user))

    store.update_user(user["id"], patch_data)
    updated_user = store.get_user(user["id"])
    await emit_audit_log(user["id"], "profile.updated", "user", user["id"], request)
    
    updated_data = dict(updated_user or user)
    updated_data["auth_provider"] = updated_data.get("auth0_connection")
    return ApiResponse(data=UserResponse.model_validate(updated_data))


@router.get("/notifications", response_model=ApiResponse[dict[str, bool]])
async def get_notification_settings(user: dict = Depends(get_current_user)):
    preferences = user.get("preferences", {})
    return ApiResponse(data={
        "job_completion_in_app": preferences.get("job_completion_in_app", True),
        "knowledge_base_updates_in_app": preferences.get("knowledge_base_updates_in_app", True),
        "weekly_digest_in_app": preferences.get("weekly_digest_in_app", True),
        "security_alerts_in_app": preferences.get("security_alerts_in_app", True),
    })

@router.patch("/notifications", response_model=ApiResponse[dict[str, bool]])
async def update_notification_settings(
    body: NotificationSettingsRequest,
    user: dict = Depends(get_current_user)
):
    store = FirestoreStore()
    preferences = user.get("preferences", {})
    
    if body.job_completion_in_app is not None:
        preferences["job_completion_in_app"] = body.job_completion_in_app
    if body.knowledge_base_updates_in_app is not None:
        preferences["knowledge_base_updates_in_app"] = body.knowledge_base_updates_in_app
    if body.weekly_digest_in_app is not None:
        preferences["weekly_digest_in_app"] = body.weekly_digest_in_app
    if body.security_alerts_in_app is not None:
        preferences["security_alerts_in_app"] = body.security_alerts_in_app

    store.update_user(user["id"], {"preferences": preferences})
    return ApiResponse(data={
        "job_completion_in_app": preferences.get("job_completion_in_app", True),
        "knowledge_base_updates_in_app": preferences.get("knowledge_base_updates_in_app", True),
        "weekly_digest_in_app": preferences.get("weekly_digest_in_app", True),
        "security_alerts_in_app": preferences.get("security_alerts_in_app", True),
    })

@router.post("/export-data", response_model=ApiResponse[dict[str, str]])
async def export_data(user: dict = Depends(get_current_user)):
    """Triggers an async task to export all user data to a zip in MinIO."""
    from app.workers.tasks.settings_tasks import export_account_data
    job_id = str(uuid.uuid4())
    store = FirestoreStore()
    store.create_job(
        job_id=job_id,
        user_id=user["id"],
        workspace_id=None,
        job_type="account_export",
        payload={}
    )
    export_account_data.delay(user["id"], job_id)
    return ApiResponse(data={"job_id": job_id, "message": "Export started. You will receive an in-app notification when it's ready."})

class AccountDeletionRequest(BaseModel):
    confirmation_token: str | None = None

@router.post("/account/deletion-request", response_model=ApiResponse[dict[str, str]])
async def request_account_deletion(user: dict = Depends(get_current_user)):
    """Step 1 of two-step deletion: Request a token."""
    store = FirestoreStore()
    token = str(uuid.uuid4())
    store.update_user(user["id"], {"deletion_token": token, "deletion_requested_at": datetime.now(UTC)})
    # In a real app, an email would be sent here. We just return it for testing.
    return ApiResponse(data={"message": "Deletion requested. Confirm with token.", "token_for_testing": token})

@router.delete("/account", response_model=ApiResponse[dict[str, str]])
async def confirm_account_deletion(body: AccountDeletionRequest, user: dict = Depends(get_current_user)):
    """Step 2 of two-step deletion: Confirm and delete everything."""
    if not body.confirmation_token or body.confirmation_token != user.get("deletion_token"):
        raise HTTPException(status_code=400, detail="Invalid or missing confirmation token.")
    
    from app.workers.tasks.settings_tasks import delete_account_data
    job_id = str(uuid.uuid4())
    store = FirestoreStore()
    store.create_job(
        job_id=job_id,
        user_id=user["id"],
        workspace_id=None,
        job_type="account_deletion",
        payload={"auth0_subject": user.get("auth0_subject")}
    )
    delete_account_data.delay(user["id"], job_id)
    return ApiResponse(data={"message": "Account deletion in progress."})

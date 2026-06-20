"""Provider account connections."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth0.extension_tokens import issue_extension_token
from app.config import get_settings
from app.dependencies import emit_audit_log, get_current_user
from app.firestore import FirestoreStore
from app.schemas.common import ApiListResponse, ApiResponse
from app.schemas.provider_accounts import (
    dictConnectRequest,
    dictConnectResponse,
    dictSummaryResponse,
)

router = APIRouter(prefix="/provider-accounts", tags=["Provider Accounts"])


import httpx

def _mask_api_key(api_key: str) -> str:
    if len(api_key) <= 8:
        return "***"
    return f"{api_key[:3]}...{api_key[-4:]}"


async def _validate_api_key(provider_slug: str, api_key: str) -> None:
    async with httpx.AsyncClient(timeout=10.0) as client:
        if provider_slug == "openai":
            resp = await client.get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {api_key}"})
            if resp.status_code in (401, 403):
                raise HTTPException(status_code=400, detail="This OpenAI API key was rejected — check that it's correct and has not been revoked")
        elif provider_slug == "grok":
            resp = await client.get("https://api.x.ai/v1/models", headers={"Authorization": f"Bearer {api_key}"})
            if resp.status_code in (401, 403):
                raise HTTPException(status_code=400, detail="This Grok API key was rejected — check that it's correct and has not been revoked")
        elif provider_slug == "anthropic":
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": "claude-3-haiku-20240307", "max_tokens": 1, "messages": [{"role": "user", "content": "ping"}]}
            )
            if resp.status_code in (401, 403):
                raise HTTPException(status_code=400, detail="This Anthropic API key was rejected — check that it's correct and has not been revoked")


def _serialize_provider_account_summary(account: dict) -> dictSummaryResponse:
    data = dict(account)
    if data.get("connection_type") != "api_key":
        data["api_key_preview"] = None
    return dictSummaryResponse.model_validate(data)


@router.post("/connect", response_model=ApiResponse[dictConnectResponse], status_code=status.HTTP_201_CREATED)
async def connect_provider_account(
    body: dictConnectRequest,
    request: Request,
    user: dict = Depends(get_current_user),
):
    provider_slug = body.provider_slug.strip().lower()
    connection_type = body.connection_type
    store = FirestoreStore()
    settings = get_settings()

    if connection_type == "api_key":
        if not body.api_key:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="api_key is required")
            
        await _validate_api_key(provider_slug, body.api_key)
        
        account = store.create_provider_account(
            user_id=user["id"],
            provider_slug=provider_slug,
            connection_type=connection_type,
            display_name=body.display_name,
            api_key=body.api_key,
            monthly_cap_usd=body.monthly_cap_usd,
            metadata={"masked_key_preview": _mask_api_key(body.api_key)},
        )
        store.update_provider_account(
            account["id"],
            {
                "api_key_preview": _mask_api_key(body.api_key),
            },
        )
        await emit_audit_log(user["id"], "provider_account.connected", "provider_account", account["id"], request)
        return ApiResponse(data=dictConnectResponse.model_validate(store.get_provider_account(account["id"]) or account))

    if connection_type == "extension":
        extension_token_jti = str(uuid.uuid4())
        extension_token_expires_at = datetime.now(UTC) + timedelta(days=max(1, int(settings.extension_token_ttl_days or 30)))
        account = store.create_provider_account(
            user_id=user["id"],
            provider_slug=provider_slug,
            connection_type=connection_type,
            display_name=body.display_name,
            extension_token_jti=extension_token_jti,
            extension_token_expires_at=extension_token_expires_at,
            monthly_cap_usd=body.monthly_cap_usd,
            metadata={},
        )
        account = store.get_provider_account(account["id"]) or account
        token = issue_extension_token(
            user_id=user["id"],
            provider_account_id=account["id"],
            provider_slug=provider_slug,
            jti=extension_token_jti,
            expires_at=extension_token_expires_at,
        )
        await emit_audit_log(user["id"], "provider_account.connected", "provider_account", account["id"], request)
        return ApiResponse(data=dictConnectResponse.model_validate({**account, "extension_token": token}))

    if connection_type == "file_watch":
        account = store.create_provider_account(
            user_id=user["id"],
            provider_slug=provider_slug,
            connection_type=connection_type,
            display_name=body.display_name,
            monthly_cap_usd=body.monthly_cap_usd,
            metadata={"mode": "file_watch"},
        )
        await emit_audit_log(user["id"], "provider_account.connected", "provider_account", account["id"], request)
        return ApiResponse(data=dictConnectResponse.model_validate(store.get_provider_account(account["id"]) or account))

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported connection_type")


@router.get("", response_model=ApiListResponse[dictSummaryResponse])
async def list_provider_accounts(user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    accounts = store.list_provider_accounts(user["id"])
    return ApiListResponse(data=[_serialize_provider_account_summary(account) for account in accounts])


@router.delete("/{provider_account_id}", response_model=ApiResponse)
async def delete_provider_account(
    provider_account_id: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    store = FirestoreStore()
    account = store.get_provider_account(provider_account_id)
    if not account or account.get("user_id") != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider account not found")

    revoked = store.revoke_provider_account(provider_account_id)
    await emit_audit_log(user["id"], "provider_account.revoked", "provider_account", provider_account_id, request)
    return ApiResponse(data=_serialize_provider_account_summary(revoked or account))


@router.post("/{provider_account_id}/revalidate", response_model=ApiResponse[dictSummaryResponse])
async def revalidate_provider_account(
    provider_account_id: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    store = FirestoreStore()
    account = store.get_provider_account(provider_account_id)
    if not account or account.get("user_id") != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider account not found")

    if account.get("connection_type") != "api_key":
        return ApiResponse(data=_serialize_provider_account_summary(account))

    api_key = store.decrypt_for_user(user["id"], account["encrypted_api_key"], account["api_key_nonce"]).decode("utf-8")
    
    needs_reauth = False
    try:
        await _validate_api_key(account["provider_slug"], api_key)
    except HTTPException:
        needs_reauth = True
        
    store.update_provider_account(provider_account_id, {"needs_reauth": needs_reauth, "last_validated_at": datetime.now(UTC)})
    account = store.get_provider_account(provider_account_id) or account
    return ApiResponse(data=_serialize_provider_account_summary(account))

"""Ingestion endpoints for extension capture and API-log webhooks."""
from __future__ import annotations

import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.dependencies import emit_audit_log, get_extension_scoped_user
from app.firestore import FirestoreStore
from app.providers.registry import is_live_provider_slug, normalize_extension_conversations
from app.schemas.common import ApiResponse
from app.schemas.ingest import ApiLogIngestRequest, IngestRequest
from app.services.import_service import ImportPipelineService

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

MAX_INGEST_BYTES = 10 * 1024 * 1024


def _parse_payload(raw: bytes, model):
    try:
        payload = json.loads(raw.decode("utf-8"))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload") from exc
    try:
        return model.model_validate(payload)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid ingest payload") from exc


async def _process_captured_conversations(
    *,
    request: Request,
    scoped: dict,
    payload,
    source: str,
):
    action = "conversation.ingested_via_extension" if source == "extension" else "conversation.ingested_via_api_log"
    if payload.provider_slug.lower() != scoped["provider_slug"].lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provider slug does not match token")
    if not is_live_provider_slug(payload.provider_slug):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported provider_slug")

    conversations = normalize_extension_conversations(
        payload.provider_slug,
        [conversation.model_dump() for conversation in payload.conversations],
    )

    store = FirestoreStore()
    api_log = store.create_api_log(
        user_id=scoped["user_id"],
        provider_account_id=scoped["provider_account_id"],
        provider_slug=payload.provider_slug,
        request_id=getattr(payload, "request_id", None),
        conversations=[conversation.model_dump() for conversation in payload.conversations],
        source=source,
        metadata=getattr(payload, "metadata", None),
    )

    service = ImportPipelineService()
    result = await service.process_conversations(
        user_id=scoped["user_id"],
        workspace_id=scoped["account"].get("workspace_id"),
        conversations=conversations,
    )

    store.update_provider_account(scoped["provider_account_id"], {"last_synced_at": datetime.now(UTC)})
    await emit_audit_log(
        scoped["user_id"],
        action,
        "provider_account",
        scoped["provider_account_id"],
        request,
        after_state={
            "provider_slug": payload.provider_slug,
            "request_id": getattr(payload, "request_id", None),
            "imported": result["imported"],
            "updated": result["updated"],
            "skipped": result["skipped"],
            "api_log_id": api_log["id"],
        },
    )

    for conversation_id in result["conversation_ids"]:
        await emit_audit_log(
            scoped["user_id"],
            action,
            "conversation",
            conversation_id,
            request,
            after_state={"provider_account_id": scoped["provider_account_id"], "provider_slug": payload.provider_slug},
        )

    return ApiResponse(
        data={
            "provider_slug": payload.provider_slug,
            "source": source,
            "imported": result["imported"],
            "updated": result["updated"],
            "skipped": result["skipped"],
            "conversation_ids": result["conversation_ids"],
            "message_ids": result["message_ids"],
        }
    )


@router.post("/extension", response_model=ApiResponse)
async def ingest_extension(
    request: Request,
    scoped: dict = Depends(get_extension_scoped_user),
):
    raw = await request.body()
    if len(raw) > MAX_INGEST_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Payload too large")
    payload = _parse_payload(raw, IngestRequest)
    return await _process_captured_conversations(request=request, scoped=scoped, payload=payload, source="extension")


@router.post("/api-log", response_model=ApiResponse)
async def ingest_api_log(
    request: Request,
    scoped: dict = Depends(get_extension_scoped_user),
):
    raw = await request.body()
    if len(raw) > MAX_INGEST_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Payload too large")
    payload = _parse_payload(raw, ApiLogIngestRequest)
    return await _process_captured_conversations(request=request, scoped=scoped, payload=payload, source="api_log")

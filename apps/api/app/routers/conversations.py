"""Conversations router backed by Firebase/Firestore."""
from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from app.config import get_settings
from app.dependencies import emit_audit_log, get_current_user, get_idempotency_key
from app.firestore import FirestoreStore
from app.services.llm_service import LLMGenerationRequest, LLMRouterService
from app.schemas.common import ApiListResponse, ApiResponse, CursorMeta, Meta
from app.schemas.conversation import (
    ChatMessageRequest,
    ChatTurnResponse,
    CompareRequest,
    CompareResult,
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    DuplicateResponse,
    MessageResponse,
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


def _serialize_conversation(raw: dict) -> ConversationResponse:
    return ConversationResponse.model_validate(raw)


def _provider_slug_to_name(slug: str | None) -> str | None:
    return FirestoreStore()._provider_name(slug) if slug else None


@router.post("", response_model=ApiResponse[ConversationResponse], status_code=status.HTTP_201_CREATED)
async def create_conversation(body: ConversationCreate, user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    provider_slug = (body.provider_slug or "chatgpt").lower()
    conversation = store.create_conversation(
        user_id=user["id"],
        workspace_id=str(body.workspace_id) if body.workspace_id else None,
        provider_slug=provider_slug,
        external_id=None,
        title=body.title or "New Chat",
        summary=body.summary,
        status="active",
        import_source="manual",
        language=None,
        topics=body.topics or [],
        tags=body.tags or [],
        started_at=None,
        ended_at=None,
        metadata=body.metadata or {},
    )
    return ApiResponse(data=_serialize_conversation(conversation))


@router.get("", response_model=ApiListResponse[ConversationResponse])
async def list_conversations(
    cursor: str | None = None,
    limit: int = 50,
    provider_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    user: dict = Depends(get_current_user),
):
    items = FirestoreStore().list_conversations(user["id"])
    items.sort(key=lambda item: item.get("created_at") or datetime.now(UTC), reverse=True)

    if provider_id:
        items = [item for item in items if item.get("provider_id") == str(provider_id)]
    if status_filter:
        items = [item for item in items if item.get("status") == status_filter]
    if tag:
        items = [item for item in items if tag in (item.get("tags") or [])]
    if search:
        needle = search.lower()
        items = [
            item
            for item in items
            if needle in (item.get("title") or "").lower()
            or needle in (item.get("preview") or "").lower()
            or any(needle in value.lower() for value in (item.get("tags") or []))
            or any(needle in value.lower() for value in (item.get("topics") or []))
        ]

    total = len(items)
    if cursor:
        try:
            index = next(idx for idx, item in enumerate(items) if item["id"] == cursor)
            items = items[index + 1 :]
        except StopIteration:
            pass

    page = items[:limit]
    has_next = len(items) > limit

    return ApiListResponse(
        data=[_serialize_conversation(item) for item in page],
        meta=Meta(
            pagination=CursorMeta(
                has_next=has_next,
                next_cursor=page[-1]["id"] if page and has_next else None,
                total_count=total,
                page_size=limit,
            )
        ),
    )


async def _generate_chat_reply(*, provider_slug: str | None, conversation: dict, content: str, model: str | None, local_only: bool | None) -> str:
    router = LLMRouterService()
    provider_name = conversation.get("provider_name") or _provider_slug_to_name(provider_slug) or "Assistant"
    prompt = (
        f"You are a helpful conversation assistant for {provider_name}.\n"
        f"Conversation title: {conversation.get('title') or 'Untitled'}\n"
        f"Conversation summary: {conversation.get('summary') or 'None'}\n"
        f"User message: {content}\n"
        "Respond with a concise, useful answer."
    )
    try:
        reply = await router.generate_text(
            LLMGenerationRequest(
                task_type="summarization",
                prompt=prompt,
                system_prompt="You are a helpful, concise chat assistant.",
                temperature=0.2,
                model=model,
                local_only=local_only,
            )
        )
        if reply.strip():
            return reply.strip()
    except Exception:
        pass

    return (
        f"I saved your message in the live conversation store and I can build on it next. "
        f"Here is a starting point: {content[:240]}"
    )


@router.post("/{conversation_id}/messages", response_model=ApiResponse[ChatTurnResponse], status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: uuid.UUID,
    body: ChatMessageRequest,
    request: Request,
    user: dict = Depends(get_current_user),
):
    store = FirestoreStore()
    conversation = store.get_conversation(str(conversation_id))
    if not conversation or conversation.get("user_id") != user["id"] or conversation.get("deleted_at") is not None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = store.list_messages(str(conversation_id))
    next_sequence = (max((int(message.get("sequence_num") or 0) for message in messages), default=0) + 1)
    provider_slug = (body.provider_slug or conversation.get("provider_slug") or "chatgpt").lower()

    user_message = store.add_message(
        conversation_id=str(conversation_id),
        user_id=user["id"],
        external_id=None,
        role="user",
        content=body.content,
        content_type="text",
        model=body.model,
        token_count=max(1, len(body.content.split())),
        attachments=None,
        tool_calls=None,
        parent_id=None,
        sequence_num=next_sequence,
        created_at=None,
    )

    assistant_text = await _generate_chat_reply(
        provider_slug=provider_slug,
        conversation=conversation,
        content=body.content,
        model=body.model,
        local_only=body.local_only,
    )
    assistant_message = store.add_message(
        conversation_id=str(conversation_id),
        user_id=user["id"],
        external_id=None,
        role="assistant",
        content=assistant_text,
        content_type="text",
        model=body.model,
        token_count=max(1, len(assistant_text.split())),
        attachments=None,
        tool_calls=None,
        parent_id=user_message["id"],
        sequence_num=next_sequence + 1,
        created_at=None,
    )

    updated_title = conversation.get("title")
    if not updated_title or updated_title in {"New Chat", "Untitled", "Empty conversation."}:
        updated_title = body.content.strip().splitlines()[0][:60]
        if len(body.content.strip().splitlines()[0]) > 60:
            updated_title += "..."
        store.update_conversation(
            str(conversation_id),
            {
                "title": updated_title,
                "provider_slug": provider_slug,
                "provider_name": _provider_slug_to_name(provider_slug),
            },
        )
    else:
        store.update_conversation(
            str(conversation_id),
            {
                "provider_slug": provider_slug,
                "provider_name": _provider_slug_to_name(provider_slug),
            },
        )

    store.update_conversation_message_stats(str(conversation_id))
    updated_conversation = store.get_conversation(str(conversation_id))
    await emit_audit_log(
        user["id"],
        "conversation.message_sent",
        "conversation",
        str(conversation_id),
        request,
        after_state={"content": body.content, "sequence_num": next_sequence},
    )

    return ApiResponse(
        data=ChatTurnResponse(
            conversation=_serialize_conversation(updated_conversation or conversation),
            user_message=MessageResponse.model_validate(user_message),
            assistant_message=MessageResponse.model_validate(assistant_message),
        )
    )


@router.post("/import", response_model=ApiResponse, status_code=status.HTTP_202_ACCEPTED)
async def import_conversations(
    request: Request,
    file: UploadFile = File(...),
    provider_slug: str | None = Form(None),
    workspace_id: uuid.UUID | None = Form(None),
    user: dict = Depends(get_current_user),
    idempotency_key: str | None = Depends(get_idempotency_key),
):
    store = FirestoreStore()
    job = store.create_job(
        user_id=user["id"],
        workspace_id=str(workspace_id) if workspace_id else None,
        job_type="import_file",
        payload={
            "filename": file.filename,
            "provider_slug": provider_slug,
            "content_type": file.content_type,
            "idempotency_key": idempotency_key,
        },
    )

    settings = get_settings()
    os.makedirs(settings.upload_temp_dir, exist_ok=True)
    temp_path = os.path.join(settings.upload_temp_dir, f"{job['id']}_{file.filename}")
    content = await file.read()
    with open(temp_path, "wb") as uploaded:
        uploaded.write(content)

    store.update_job(
        job["id"],
        {
            "payload": {
                **job["payload"],
                "temp_path": temp_path,
                "file_size": len(content),
            }
        },
    )
    await emit_audit_log(user["id"], "conversation.import_started", "job", job["id"], request)

    from app.workers.tasks.import_tasks import run_import_pipeline

    task = run_import_pipeline.delay(job["id"])
    store.update_job(job["id"], {"celery_task_id": task.id})

    return ApiResponse(
        data={"job_id": job["id"], "status": "queued", "message": "Import job created"},
        meta=Meta(idempotency_key=idempotency_key),
    )


@router.get("/{conversation_id}", response_model=ApiResponse[ConversationResponse])
async def get_conversation(conversation_id: uuid.UUID, user: dict = Depends(get_current_user)):
    conversation = FirestoreStore().get_conversation(str(conversation_id))
    if not conversation or conversation.get("user_id") != user["id"] or conversation.get("deleted_at") is not None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ApiResponse(data=_serialize_conversation(conversation))


@router.patch("/{conversation_id}", response_model=ApiResponse[ConversationResponse])
async def update_conversation(
    conversation_id: uuid.UUID,
    body: ConversationUpdate,
    request: Request,
    user: dict = Depends(get_current_user),
):
    store = FirestoreStore()
    conversation = store.get_conversation(str(conversation_id))
    if not conversation or conversation.get("user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Conversation not found")

    before = {field: conversation.get(field) for field in body.model_fields_set}
    updated = store.update_conversation(str(conversation_id), body.model_dump(exclude_unset=True))
    await emit_audit_log(
        user["id"],
        "conversation.updated",
        "conversation",
        str(conversation_id),
        request,
        before_state=before,
        after_state=body.model_dump(exclude_unset=True),
    )
    return ApiResponse(data=_serialize_conversation(updated))


@router.delete("/{conversation_id}", response_model=ApiResponse)
async def delete_conversation(
    conversation_id: uuid.UUID,
    request: Request,
    user: dict = Depends(get_current_user),
):
    store = FirestoreStore()
    conversation = store.get_conversation(str(conversation_id))
    if not conversation or conversation.get("user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Conversation not found")

    store.soft_delete_conversation(str(conversation_id))
    await emit_audit_log(user["id"], "conversation.deleted", "conversation", str(conversation_id), request)
    return ApiResponse(data={"message": "Conversation deleted"})


@router.get("/{conversation_id}/messages", response_model=ApiListResponse[MessageResponse])
async def get_messages(
    conversation_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    store = FirestoreStore()
    conversation = store.get_conversation(str(conversation_id))
    if not conversation or conversation.get("user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = store.list_messages(str(conversation_id))
    if cursor:
        try:
            after = int(cursor)
            messages = [message for message in messages if int(message.get("sequence_num", 0)) > after]
        except ValueError:
            pass

    page = messages[:limit]
    has_next = len(messages) > limit
    return ApiListResponse(
        data=[MessageResponse.model_validate(message) for message in page],
        meta=Meta(
            pagination=CursorMeta(
                has_next=has_next,
                next_cursor=str(page[-1]["sequence_num"]) if page and has_next else None,
                page_size=limit,
            )
        ),
    )


@router.post("/compare", response_model=ApiResponse[CompareResult])
async def compare_conversations(body: CompareRequest, user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    conversations: list[dict] = []
    for conversation_id in body.conversation_ids:
        conversation = store.get_conversation(str(conversation_id))
        if not conversation or conversation.get("user_id") != user["id"]:
            raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
        conversations.append(conversation)

    all_topics = [set(conversation.get("topics") or []) for conversation in conversations]
    shared = set.intersection(*all_topics) if all_topics else set()
    unique = {
        item["id"]: list((set(item.get("topics") or []) - shared))
        for item in conversations
    }

    union = set().union(*all_topics) if all_topics else set()
    return ApiResponse(
        data=CompareResult(
            conversations=[_serialize_conversation(item) for item in conversations],
            shared_topics=list(shared),
            unique_topics=unique,
            similarity_score=len(shared) / max(len(union), 1),
        )
    )


@router.get("/duplicates", response_model=ApiListResponse[DuplicateResponse])
async def list_duplicates(user: dict = Depends(get_current_user)):
    return ApiListResponse(data=[])

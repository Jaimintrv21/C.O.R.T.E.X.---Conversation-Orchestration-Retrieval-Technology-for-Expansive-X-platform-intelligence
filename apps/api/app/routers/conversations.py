"""Conversations router: CRUD, import, compare, duplicates."""
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import emit_audit_log, get_current_user, get_idempotency_key
from app.models.conversation import Conversation
from app.models.duplicate import DuplicatePair
from app.models.job import Job
from app.models.user import User
from app.schemas.common import ApiResponse, ApiListResponse, CursorMeta, Meta, PaginationParams
from app.schemas.conversation import (
    ConversationResponse, ConversationUpdate, CompareRequest, CompareResult,
    DuplicateResponse, ImportRequest,
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", response_model=ApiListResponse[ConversationResponse])
async def list_conversations(
    cursor: str | None = None,
    limit: int = 50,
    provider_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    tag: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Conversation).where(
        Conversation.user_id == user.id,
        Conversation.deleted_at.is_(None),
    ).order_by(Conversation.created_at.desc())

    if provider_id:
        query = query.where(Conversation.provider_id == provider_id)
    if status_filter:
        query = query.where(Conversation.status == status_filter)
    if tag:
        query = query.where(Conversation.tags.contains([tag]))

    # Cursor-based pagination
    if cursor:
        try:
            cursor_id = uuid.UUID(cursor)
            cursor_conv = await db.get(Conversation, cursor_id)
            if cursor_conv:
                query = query.where(Conversation.created_at < cursor_conv.created_at)
        except ValueError:
            pass

    query = query.limit(limit + 1)
    result = await db.execute(query)
    conversations = list(result.scalars().all())

    has_next = len(conversations) > limit
    if has_next:
        conversations = conversations[:limit]

    # Total count
    count_q = select(func.count()).select_from(Conversation).where(
        Conversation.user_id == user.id, Conversation.deleted_at.is_(None)
    )
    total = (await db.execute(count_q)).scalar() or 0

    return ApiListResponse(
        data=[ConversationResponse.model_validate(c) for c in conversations],
        meta=Meta(pagination=CursorMeta(
            has_next=has_next,
            next_cursor=str(conversations[-1].id) if conversations and has_next else None,
            total_count=total,
            page_size=limit,
        )),
    )


@router.post("/import", response_model=ApiResponse, status_code=status.HTTP_202_ACCEPTED)
async def import_conversations(
    request: Request,
    file: UploadFile = File(...),
    provider_slug: str | None = Form(None),
    workspace_id: uuid.UUID | None = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str | None = Depends(get_idempotency_key),
):
    """Upload a provider export file for background import."""
    # Create a job record
    job = Job(
        user_id=user.id,
        workspace_id=workspace_id,
        job_type="import_file",
        status="queued",
        payload={
            "filename": file.filename,
            "provider_slug": provider_slug,
            "content_type": file.content_type,
            "idempotency_key": idempotency_key,
        },
    )
    db.add(job)
    await db.flush()

    # Save upload to temp storage
    import aiofiles
    import os
    from app.config import get_settings
    settings = get_settings()
    os.makedirs(settings.upload_temp_dir, exist_ok=True)
    temp_path = os.path.join(settings.upload_temp_dir, f"{job.id}_{file.filename}")

    content = await file.read()
    with open(temp_path, "wb") as f:
        f.write(content)

    # Update job payload with path
    job.payload["temp_path"] = temp_path
    job.payload["file_size"] = len(content)

    await emit_audit_log(db, user.id, "conversation.import_started", "job", job.id, request)

    # Dispatch Celery task
    # from app.workers.tasks.import_tasks import run_import_pipeline
    # task = run_import_pipeline.delay(str(job.id))
    # job.celery_task_id = task.id

    return ApiResponse(
        data={"job_id": str(job.id), "status": "queued", "message": "Import job created"},
        meta=Meta(idempotency_key=idempotency_key),
    )


@router.get("/{conversation_id}", response_model=ApiResponse[ConversationResponse])
async def get_conversation(
    conversation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv or conv.user_id != user.id or conv.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ApiResponse(data=ConversationResponse.model_validate(conv))


@router.patch("/{conversation_id}", response_model=ApiResponse[ConversationResponse])
async def update_conversation(
    conversation_id: uuid.UUID,
    body: ConversationUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv or conv.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    before = {k: getattr(conv, k) for k in body.model_fields_set}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(conv, field, value)

    await emit_audit_log(
        db, user.id, "conversation.updated", "conversation", conv.id, request,
        before_state=before, after_state=body.model_dump(exclude_unset=True),
    )

    return ApiResponse(data=ConversationResponse.model_validate(conv))


@router.delete("/{conversation_id}", response_model=ApiResponse)
async def delete_conversation(
    conversation_id: uuid.UUID,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv or conv.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    from datetime import datetime, timezone
    conv.deleted_at = datetime.now(timezone.utc)
    conv.status = "deleted"

    await emit_audit_log(db, user.id, "conversation.deleted", "conversation", conv.id, request)
    return ApiResponse(data={"message": "Conversation deleted"})


@router.get("/{conversation_id}/messages", response_model=ApiListResponse)
async def get_messages(
    conversation_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = 100,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.message import Message
    conv = await db.get(Conversation, conversation_id)
    if not conv or conv.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    query = select(Message).where(
        Message.conversation_id == conversation_id,
    ).order_by(Message.sequence_num)

    if cursor:
        try:
            query = query.where(Message.sequence_num > int(cursor))
        except ValueError:
            pass

    query = query.limit(limit + 1)
    result = await db.execute(query)
    messages = list(result.scalars().all())

    has_next = len(messages) > limit
    if has_next:
        messages = messages[:limit]

    from app.schemas.conversation import MessageResponse
    return ApiListResponse(
        data=[MessageResponse.model_validate(m) for m in messages],
        meta=Meta(pagination=CursorMeta(
            has_next=has_next,
            next_cursor=str(messages[-1].sequence_num) if messages and has_next else None,
            page_size=limit,
        )),
    )


@router.post("/compare", response_model=ApiResponse[CompareResult])
async def compare_conversations(
    body: CompareRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversations = []
    for cid in body.conversation_ids:
        conv = await db.get(Conversation, cid)
        if not conv or conv.user_id != user.id:
            raise HTTPException(status_code=404, detail=f"Conversation {cid} not found")
        conversations.append(conv)

    # Simple topic intersection/diff
    all_topics = [set(c.topics or []) for c in conversations]
    shared = set.intersection(*all_topics) if all_topics else set()
    unique = {str(c.id): list((set(c.topics or []) - shared)) for c in conversations}

    return ApiResponse(data=CompareResult(
        conversations=[ConversationResponse.model_validate(c) for c in conversations],
        shared_topics=list(shared),
        unique_topics=unique,
        similarity_score=len(shared) / max(len(set.union(*all_topics)), 1) if all_topics else 0.0,
    ))


@router.get("/duplicates", response_model=ApiListResponse[DuplicateResponse])
async def list_duplicates(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Join duplicate_pairs with conversations owned by user
    query = select(DuplicatePair).join(
        Conversation, DuplicatePair.conv_a_id == Conversation.id
    ).where(Conversation.user_id == user.id).order_by(DuplicatePair.similarity.desc()).limit(50)

    result = await db.execute(query)
    pairs = result.scalars().all()

    # Build response with conversation data
    data = []
    for p in pairs:
        conv_a = await db.get(Conversation, p.conv_a_id)
        conv_b = await db.get(Conversation, p.conv_b_id)
        if conv_a and conv_b:
            data.append(DuplicateResponse(
                id=p.id,
                conversation_a=ConversationResponse.model_validate(conv_a),
                conversation_b=ConversationResponse.model_validate(conv_b),
                similarity=p.similarity,
                detection_method=p.detection_method,
                is_confirmed=p.is_confirmed,
                created_at=p.created_at,
            ))

    return ApiListResponse(data=data)

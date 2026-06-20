"""Conversations router backed by Firebase/Firestore."""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import UTC, datetime
from contextlib import suppress

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.dependencies import emit_audit_log, get_current_user, get_idempotency_key
from app.firestore import FirestoreStore
from app.services.external_chat_errors import ExternalChatError, error_to_payload
from app.services.external_chat_service import ExternalChatService
from app.services.llm_service import LLMGenerationRequest, LLMRouterService
from app.workers.tasks.embedding_tasks import embed_batch
from app.schemas.common import ApiListResponse, ApiResponse, CursorMeta, Meta
from app.schemas.conversation import (
    ChatMessageRequest,
    ChatTurnResponse,
    ChatStreamDeltaResponse,
    ChatStreamErrorResponse,
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


async def _get_ollama_chat_response(
    *,
    user_id: str,
    messages: list[dict],
    model: str,
    use_knowledge: bool = True,
) -> str:
    # 1. Retrieve query (last message content)
    user_query = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_query = msg.get("content") or ""
            break
            
    context_chunks = []
    if use_knowledge:
        # 2. Retrieve search results from knowledge base
        if user_query:
            try:
                from app.routers.search import _run_semantic_search
                hits = await _run_semantic_search(query=user_query, user_id=user_id, limit=5)
                for hit in hits:
                    context_chunks.append(f"Source (Conversation: {hit.title}): {hit.snippet}")
            except Exception:
                pass
                
        # 3. Retrieve knowledge nodes from Firestore knowledge graph
        try:
            from app.firestore import FirestoreStore
            store = FirestoreStore()
            nodes = store.list_knowledge_nodes(user_id=user_id, limit=10)
            if nodes:
                node_context = "Knowledge Graph Nodes:\n" + "\n".join(
                    [f"- {node.get('label') or node.get('name')}: {node.get('description') or ''}" 
                     for node in nodes if node.get('description')]
                )
                context_chunks.append(node_context)
        except Exception:
            pass
        
    context_text = "\n\n".join(context_chunks)
    
    # 4. Formulate the system prompt with knowledge context
    if use_knowledge and context_text.strip():
        system_prompt = (
            "You are an AI assistant with access to the user's personal knowledge base.\n"
            "Here is the relevant context from the user's knowledge base:\n"
            "---------------------\n"
            f"{context_text}\n"
            "---------------------\n"
            "Use this context to answer the user's question. If the context is not relevant, answer using your general knowledge."
        )
    else:
        system_prompt = "You are a helpful, concise local AI assistant named CORTEX."
    
    # 5. Format messages list for Ollama SDK
    messages_for_ollama = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content")
        if role in {"user", "assistant"}:
            messages_for_ollama.append({"role": role, "content": content})
            
    # 6. Call Ollama Client
    from ollama import AsyncClient
    from app.config import get_settings
    settings = get_settings()
    client = AsyncClient(host=settings.ollama_base_url)
    try:
        response = await client.chat(
            model=model,
            messages=messages_for_ollama,
            stream=False,
        )
        return response.message.content or ""
    except Exception as exc:
        return f"Error calling Ollama model {model}: {str(exc)}"


async def _stream_ollama_chat(
    *,
    user_id: str,
    messages: list[dict],
    model: str,
    use_knowledge: bool = True,
) -> typing.AsyncIterator[str]:
    import typing
    # 1. Retrieve query (last message content)
    user_query = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_query = msg.get("content") or ""
            break
            
    context_chunks = []
    if use_knowledge:
        # 2. Retrieve search results from knowledge base
        if user_query:
            try:
                from app.routers.search import _run_semantic_search
                hits = await _run_semantic_search(query=user_query, user_id=user_id, limit=5)
                for hit in hits:
                    context_chunks.append(f"Source (Conversation: {hit.title}): {hit.snippet}")
            except Exception:
                pass
                
        # 3. Retrieve knowledge nodes from Firestore knowledge graph
        try:
            from app.firestore import FirestoreStore
            store = FirestoreStore()
            nodes = store.list_knowledge_nodes(user_id=user_id, limit=10)
            if nodes:
                node_context = "Knowledge Graph Nodes:\n" + "\n".join(
                    [f"- {node.get('label') or node.get('name')}: {node.get('description') or ''}" 
                     for node in nodes if node.get('description')]
                )
                context_chunks.append(node_context)
        except Exception:
            pass
        
    context_text = "\n\n".join(context_chunks)
    
    # 4. Formulate the system prompt with knowledge context
    if use_knowledge and context_text.strip():
        system_prompt = (
            "You are an AI assistant with access to the user's personal knowledge base.\n"
            "Here is the relevant context from the user's knowledge base:\n"
            "---------------------\n"
            f"{context_text}\n"
            "---------------------\n"
            "Use this context to answer the user's question. If the context is not relevant, answer using your general knowledge."
        )
    else:
        system_prompt = "You are a helpful, concise local AI assistant named CORTEX."
    
    # 5. Format messages list for Ollama SDK
    messages_for_ollama = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content")
        if role in {"user", "assistant"}:
            messages_for_ollama.append({"role": role, "content": content})
            
    # 6. Call Ollama Client and stream results
    from ollama import AsyncClient
    from app.config import get_settings
    settings = get_settings()
    client = AsyncClient(host=settings.ollama_base_url)
    try:
        response_stream = await client.chat(
            model=model,
            messages=messages_for_ollama,
            stream=True,
        )
        async for chunk in response_stream:
            delta = chunk.message.content or ""
            if delta:
                yield delta
    except Exception as exc:
        yield f"Error calling Ollama model {model}: {str(exc)}"


def _resolve_chat_provider(body: ChatMessageRequest, conversation: dict) -> str:
    if body.provider != "local":
        return body.provider
    if body.provider_slug:
        return body.provider_slug.lower()
    return str(conversation.get("provider_slug") or "chatgpt").lower()


def _conversation_title_from_message(content: str) -> str:
    first_line = content.strip().splitlines()[0] if content.strip() else "New Chat"
    if len(first_line) > 60:
        return f"{first_line[:60]}..."
    return first_line or "New Chat"


def _apply_conversation_metadata(store: FirestoreStore, conversation_id: str, conversation: dict, provider_slug: str, *, content: str) -> dict:
    title = conversation.get("title")
    if not title or title in {"New Chat", "Untitled", "Empty conversation."}:
        title = _conversation_title_from_message(content)
    updated = store.update_conversation(
        conversation_id,
        {
            "title": title,
            "provider_slug": provider_slug,
            "provider_name": _provider_slug_to_name(provider_slug),
        },
    )
    return updated or conversation


async def _collect_external_reply(
    *,
    store: FirestoreStore,
    user_id: str,
    provider_slug: str,
    messages: list[dict],
    model: str | None,
    conversation_id: str,
) -> tuple[str, ExternalChatService]:
    service = ExternalChatService(store)
    api_key = await service.get_decrypted_api_key(user_id, provider_slug)
    chunks: list[str] = []

    try:
        async for chunk in service.stream_completion(
            provider_slug=provider_slug,
            api_key=api_key,
            messages=messages,
            model=model,
            user_id=user_id,
        ):
            chunks.append(chunk)
    except ExternalChatError as exc:
        if service.last_usage:
            store.create_usage_record(
                user_id=user_id,
                provider_account_id=(service.last_provider_account or {}).get("id"),
                provider_slug=provider_slug,
                model=service.last_usage.model,
                prompt_tokens=service.last_usage.prompt_tokens,
                completion_tokens=service.last_usage.completion_tokens,
                estimated_cost_usd=service.last_usage.estimated_cost_usd,
                conversation_id=conversation_id,
            )
        exc.partial_text = "".join(chunks) or exc.partial_text
        raise

    if service.last_usage:
        store.create_usage_record(
            user_id=user_id,
            provider_account_id=(service.last_provider_account or {}).get("id"),
            provider_slug=provider_slug,
            model=service.last_usage.model,
            prompt_tokens=service.last_usage.prompt_tokens,
            completion_tokens=service.last_usage.completion_tokens,
            estimated_cost_usd=service.last_usage.estimated_cost_usd,
            conversation_id=conversation_id,
        )
    return "".join(chunks), service


def _persist_chat_turn(
    *,
    store: FirestoreStore,
    conversation_id: str,
    user_id: str,
    conversation: dict,
    provider_slug: str,
    user_message: dict,
    assistant_text: str | None,
) -> tuple[dict, dict | None, dict]:
    assistant_message: dict | None = None
    if assistant_text is not None:
        assistant_message = store.add_message(
            conversation_id=conversation_id,
            user_id=user_id,
            external_id=None,
            role="assistant",
            content=assistant_text,
            content_type="text",
            model=None,
            token_count=max(1, len(assistant_text.split())),
            attachments=None,
            tool_calls=None,
            parent_id=user_message["id"],
            sequence_num=int(user_message.get("sequence_num") or 0) + 1,
            created_at=None,
        )

    updated_conversation = _apply_conversation_metadata(
        store,
        conversation_id,
        conversation,
        provider_slug,
        content=str(user_message.get("content") or ""),
    )
    store.update_conversation_message_stats(conversation_id)
    return updated_conversation, assistant_message, user_message


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
    provider_slug = _resolve_chat_provider(body, conversation)

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

    assistant_text: str | None = None
    external_error: ExternalChatError | None = None
    if body.provider == "local" and provider_slug != "glm-5.2:cloud" and body.model != "glm-5.2:cloud":
        assistant_text = await _generate_chat_reply(
            provider_slug=provider_slug,
            conversation=conversation,
            content=body.content,
            model=body.model,
            local_only=body.local_only,
        )
    elif body.provider == "ollama" or provider_slug == "glm-5.2:cloud" or body.model == "glm-5.2:cloud":
        resolved_model = body.model or provider_slug or "glm-5.2:cloud"
        assistant_text = await _get_ollama_chat_response(
            user_id=user["id"],
            messages=store.list_messages(str(conversation_id)),
            model=resolved_model,
            use_knowledge=body.use_knowledge if body.use_knowledge is not None else True,
        )
    else:
        try:
            assistant_text, _ = await _collect_external_reply(
                store=store,
                user_id=user["id"],
                provider_slug=provider_slug,
                messages=store.list_messages(str(conversation_id)),
                model=body.model,
                conversation_id=str(conversation_id),
            )
        except ExternalChatError as exc:
            external_error = exc
            assistant_text = exc.partial_text or None

    assistant_message = None
    if assistant_text is not None:
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

    updated_conversation = _apply_conversation_metadata(
        store,
        str(conversation_id),
        conversation,
        provider_slug,
        content=body.content,
    )
    store.update_conversation_message_stats(str(conversation_id))

    # Queue async embedding generation for both messages (don't block the response)
    new_msg_ids = [user_message["id"]]
    if assistant_message:
        new_msg_ids.append(assistant_message["id"])
    embed_batch.delay(message_ids=new_msg_ids)

    await emit_audit_log(
        user["id"],
        "conversation.message_sent",
        "conversation",
        str(conversation_id),
        request,
        after_state={
            "content": body.content,
            "sequence_num": next_sequence,
            "provider": body.provider,
            "provider_slug": provider_slug,
            "error": error_to_payload(external_error) if external_error else None,
        },
    )

    if external_error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS if external_error.code in {"RATE_LIMITED", "SPEND_CAP_REACHED"} else status.HTTP_400_BAD_REQUEST,
            detail=error_to_payload(external_error),
        )

    return ApiResponse(
        data=ChatTurnResponse(
            conversation=_serialize_conversation(updated_conversation or conversation),
            user_message=MessageResponse.model_validate(user_message),
            assistant_message=MessageResponse.model_validate(assistant_message) if assistant_message else MessageResponse.model_validate({**user_message, "role": "assistant", "content": assistant_text or ""}),
        )
    )


def _external_error_status(error: ExternalChatError) -> int:
    if error.code in {"RATE_LIMITED", "SPEND_CAP_REACHED"}:
        return status.HTTP_429_TOO_MANY_REQUESTS
    if error.code in {"INVALID_API_KEY", "CONTEXT_TOO_LONG", "CONTENT_FILTERED"}:
        return status.HTTP_400_BAD_REQUEST
    return status.HTTP_502_BAD_GATEWAY


@router.post("/{conversation_id}/messages/stream")
async def stream_message(
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
    provider_slug = _resolve_chat_provider(body, conversation)

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

    async def event_stream():
        service = ExternalChatService(store)
        assistant_parts: list[str] = []
        provider_error: ExternalChatError | None = None
        assistant_message: dict | None = None
        queue: asyncio.Queue[tuple[str, object]] = asyncio.Queue()
        done = asyncio.Event()

        async def produce() -> None:
            nonlocal provider_error
            try:
                if body.provider == "local" and provider_slug != "glm-5.2:cloud" and body.model != "glm-5.2:cloud":
                    assistant_text = await _generate_chat_reply(
                        provider_slug=provider_slug,
                        conversation=conversation,
                        content=body.content,
                        model=body.model,
                        local_only=body.local_only,
                    )
                    await queue.put(("chunk", assistant_text))
                elif body.provider == "ollama" or provider_slug == "glm-5.2:cloud" or body.model == "glm-5.2:cloud":
                    resolved_model = body.model or provider_slug or "glm-5.2:cloud"
                    async for chunk in _stream_ollama_chat(
                        user_id=user["id"],
                        messages=store.list_messages(str(conversation_id)),
                        model=resolved_model,
                        use_knowledge=body.use_knowledge if body.use_knowledge is not None else True,
                    ):
                        await queue.put(("chunk", chunk))
                else:
                    api_key = await service.get_decrypted_api_key(user["id"], provider_slug)
                    async for chunk in service.stream_completion(
                        provider_slug=provider_slug,
                        api_key=api_key,
                        messages=store.list_messages(str(conversation_id)),
                        model=body.model,
                        user_id=user["id"],
                    ):
                        await queue.put(("chunk", chunk))
            except ExternalChatError as exc:
                provider_error = exc
                await queue.put(("error", exc))
            except Exception as exc:
                provider_error = ExternalChatError(
                    code="EXTERNAL_CHAT_FAILED",
                    message="The external model request failed.",
                    retryable=True,
                    provider=provider_slug,
                    original_exception=exc,
                )
                await queue.put(("error", provider_error))
            finally:
                done.set()
                await queue.put(("done", None))

        producer = asyncio.create_task(produce())

        try:
            while True:
                try:
                    kind, payload = await asyncio.wait_for(queue.get(), timeout=15)
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
                    continue

                if kind == "chunk":
                    chunk = str(payload)
                    if chunk:
                        assistant_parts.append(chunk)
                        yield f"data: {json.dumps(ChatStreamDeltaResponse(delta=chunk).model_dump())}\n\n"
                elif kind == "error":
                    error_obj = payload if isinstance(payload, ExternalChatError) else provider_error
                    if error_obj:
                        yield f"data: {json.dumps(ChatStreamErrorResponse(error=error_obj.message).model_dump())}\n\n"
                    break
                elif kind == "done":
                    break
        finally:
            if not producer.done():
                producer.cancel()
                with suppress(asyncio.CancelledError):
                    await producer
            else:
                with suppress(Exception):
                    await producer

            assistant_text = "".join(assistant_parts) if assistant_parts else (provider_error.partial_text if provider_error and provider_error.partial_text else None)
            if assistant_text is not None:
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

            _apply_conversation_metadata(
                store,
                str(conversation_id),
                conversation,
                provider_slug,
                content=body.content,
            )
            store.update_conversation_message_stats(str(conversation_id))

            # Queue async embedding generation for persisted messages
            stream_msg_ids = [user_message["id"]]
            if assistant_message:
                stream_msg_ids.append(assistant_message["id"])
            embed_batch.delay(message_ids=stream_msg_ids)
            await emit_audit_log(
                user["id"],
                "conversation.message_sent",
                "conversation",
                str(conversation_id),
                request,
                after_state={
                    "content": body.content,
                    "sequence_num": next_sequence,
                    "provider": body.provider,
                    "provider_slug": provider_slug,
                    "streaming": True,
                    "error": error_to_payload(provider_error) if provider_error else None,
                },
            )

        if provider_error:
            return

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
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
    store = FirestoreStore()
    pairs = store.list_duplicate_pairs(user["id"])
    results: list[DuplicateResponse] = []
    for pair in pairs:
        conv_a = store.get_conversation(pair["conv_a_id"])
        conv_b = store.get_conversation(pair["conv_b_id"])
        if not conv_a or not conv_b:
            continue
        if conv_a.get("user_id") != user["id"] or conv_b.get("user_id") != user["id"]:
            continue
        results.append(
            DuplicateResponse(
                id=pair["id"],
                conversation_a=_serialize_conversation(conv_a),
                conversation_b=_serialize_conversation(conv_b),
                similarity=pair.get("similarity", 0.0),
                detection_method=pair.get("detection_method", "embedding_cosine"),
                is_confirmed=pair.get("is_confirmed", True),
                created_at=pair.get("created_at"),
            )
        )
    return ApiListResponse(data=results)


@router.post("/duplicates/{pair_id}/resolve", response_model=ApiResponse)
async def resolve_duplicate(
    pair_id: str,
    body: dict,
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Resolve a duplicate pair: merge or dismiss."""
    action = body.get("action", "").lower()
    if action not in {"merge", "dismiss"}:
        raise HTTPException(status_code=400, detail="action must be 'merge' or 'dismiss'")

    store = FirestoreStore()
    pair = store.get_duplicate_pair(pair_id)
    if not pair or pair.get("user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Duplicate pair not found")

    if action == "merge":
        # Keep the older conversation, merge the newer one into it
        conv_a = store.get_conversation(pair["conv_a_id"])
        conv_b = store.get_conversation(pair["conv_b_id"])
        if not conv_a or not conv_b:
            raise HTTPException(status_code=404, detail="One of the conversations no longer exists")

        a_created = conv_a.get("created_at")
        b_created = conv_b.get("created_at")
        if a_created and b_created and a_created <= b_created:
            keep_id, remove_id = pair["conv_a_id"], pair["conv_b_id"]
        else:
            keep_id, remove_id = pair["conv_b_id"], pair["conv_a_id"]

        merged = store.merge_conversations(keep_id=keep_id, remove_id=remove_id)
        store.resolve_duplicate_pair(pair_id, resolution="merged")
        await emit_audit_log(
            user["id"], "duplicate.merged", "conversation", keep_id, request,
            after_state={"removed_id": remove_id, "pair_id": pair_id},
        )
        return ApiResponse(data={"action": "merged", "kept_conversation_id": keep_id, "removed_conversation_id": remove_id})
    else:
        store.resolve_duplicate_pair(pair_id, resolution="dismiss")
        await emit_audit_log(
            user["id"], "duplicate.dismissed", "duplicate_pair", pair_id, request,
        )
        return ApiResponse(data={"action": "dismissed", "pair_id": pair_id})

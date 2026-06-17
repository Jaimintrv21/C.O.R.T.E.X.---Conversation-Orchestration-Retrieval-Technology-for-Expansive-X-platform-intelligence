"""Knowledge graph router: nodes, edges, build, export."""
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import emit_audit_log, get_current_user
from app.models.job import Job
from app.models.knowledge import KnowledgeNode, KnowledgeEdge
from app.models.user import User
from app.schemas.common import ApiResponse, ApiListResponse
from app.schemas.knowledge import NodeResponse, EdgeResponse, BuildRequest, GraphExport

router = APIRouter(prefix="/knowledge", tags=["Knowledge Graph"])


@router.get("/nodes", response_model=ApiListResponse[NodeResponse])
async def list_nodes(
    workspace_id: uuid.UUID | None = None,
    limit: int = 200,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(KnowledgeNode).where(KnowledgeNode.user_id == user.id)
    if workspace_id:
        query = query.where(KnowledgeNode.workspace_id == workspace_id)
    query = query.order_by(KnowledgeNode.occurrence_count.desc()).limit(limit)
    result = await db.execute(query)
    nodes = result.scalars().all()
    return ApiListResponse(data=[NodeResponse.model_validate(n) for n in nodes])


@router.get("/edges", response_model=ApiListResponse[EdgeResponse])
async def list_edges(
    workspace_id: uuid.UUID | None = None,
    limit: int = 500,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(KnowledgeEdge).join(
        KnowledgeNode, KnowledgeEdge.source_id == KnowledgeNode.id
    ).where(KnowledgeNode.user_id == user.id).limit(limit)
    result = await db.execute(query)
    edges = result.scalars().all()
    return ApiListResponse(data=[EdgeResponse.model_validate(e) for e in edges])


@router.post("/build", response_model=ApiResponse, status_code=202)
async def build_graph(
    body: BuildRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = Job(
        user_id=user.id,
        workspace_id=body.workspace_id,
        job_type="build_knowledge_graph",
        payload={"conversation_ids": [str(c) for c in (body.conversation_ids or [])], "force": body.force_rebuild},
    )
    db.add(job)
    await db.flush()
    await emit_audit_log(db, user.id, "knowledge.build_started", "job", job.id, request)
    return ApiResponse(data={"job_id": str(job.id), "status": "queued"})


@router.get("/export", response_model=ApiResponse[GraphExport])
async def export_graph(
    workspace_id: uuid.UUID | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    nq = select(KnowledgeNode).where(KnowledgeNode.user_id == user.id)
    if workspace_id:
        nq = nq.where(KnowledgeNode.workspace_id == workspace_id)
    nodes = (await db.execute(nq)).scalars().all()

    node_ids = [n.id for n in nodes]
    eq = select(KnowledgeEdge).where(KnowledgeEdge.source_id.in_(node_ids))
    edges = (await db.execute(eq)).scalars().all()

    return ApiResponse(data=GraphExport(
        nodes=[NodeResponse.model_validate(n) for n in nodes],
        edges=[EdgeResponse.model_validate(e) for e in edges],
        metadata={"total_nodes": len(nodes), "total_edges": len(edges)},
    ))

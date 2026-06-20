"""Knowledge graph router backed by Neo4j relationships."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request

from app.dependencies import emit_audit_log, get_current_user
from app.firestore import FirestoreStore
from app.neo4j_client import Neo4jKnowledgeStore
from app.schemas.common import ApiListResponse, ApiResponse
from app.schemas.knowledge import BuildRequest, EdgeResponse, GraphExport, NodeResponse

router = APIRouter(prefix="/knowledge", tags=["Knowledge Graph"])


@router.get("/nodes", response_model=ApiListResponse[NodeResponse])
async def list_nodes(
    workspace_id: uuid.UUID | None = None,
    limit: int = 200,
    user: dict = Depends(get_current_user),
):
    nodes = Neo4jKnowledgeStore().list_nodes(user["id"], workspace_id=str(workspace_id) if workspace_id else None, limit=limit)
    return ApiListResponse(data=[NodeResponse.model_validate(node) for node in nodes])


@router.get("/edges", response_model=ApiListResponse[EdgeResponse])
async def list_edges(
    workspace_id: uuid.UUID | None = None,
    limit: int = 500,
    user: dict = Depends(get_current_user),
):
    edges = Neo4jKnowledgeStore().list_edges(user["id"], workspace_id=str(workspace_id) if workspace_id else None, limit=limit)
    return ApiListResponse(data=[EdgeResponse.model_validate(edge) for edge in edges])


@router.post("/build", response_model=ApiResponse, status_code=202)
async def build_graph(body: BuildRequest, request: Request, user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    job = store.create_job(
        user_id=user["id"],
        workspace_id=str(body.workspace_id) if body.workspace_id else None,
        job_type="build_knowledge_graph",
        payload={"conversation_ids": [str(c) for c in (body.conversation_ids or [])], "force": body.force_rebuild},
    )
    await emit_audit_log(user["id"], "knowledge.build_started", "job", job["id"], request)
    return ApiResponse(data={"job_id": job["id"], "status": "queued"})


@router.get("/export", response_model=ApiResponse[GraphExport])
async def export_graph(workspace_id: uuid.UUID | None = None, user: dict = Depends(get_current_user)):
    store = Neo4jKnowledgeStore()
    nodes = store.list_nodes(user["id"], workspace_id=str(workspace_id) if workspace_id else None, limit=1000)
    edges = store.list_edges(user["id"], workspace_id=str(workspace_id) if workspace_id else None, limit=2000)
    return ApiResponse(
        data=GraphExport(
            nodes=[NodeResponse.model_validate(node) for node in nodes],
            edges=[EdgeResponse.model_validate(edge) for edge in edges],
            metadata={"total_nodes": len(nodes), "total_edges": len(edges)},
        )
    )


@router.get("/nodes/{node_id}/related", response_model=ApiListResponse[NodeResponse])
async def find_related_nodes(
    node_id: str,
    depth: int = 2,
    user: dict = Depends(get_current_user),
):
    nodes = Neo4jKnowledgeStore().find_related(node_id, user_id=user["id"], depth=depth)
    return ApiListResponse(data=[NodeResponse.model_validate(node) for node in nodes])

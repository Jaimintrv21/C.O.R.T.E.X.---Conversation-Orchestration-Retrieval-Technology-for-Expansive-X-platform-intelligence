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


from fastapi.responses import PlainTextResponse
import json
from fastapi import File, UploadFile

@router.get("/export")
async def export_graph(format: str = "json", workspace_id: uuid.UUID | None = None, user: dict = Depends(get_current_user)):
    store = Neo4jKnowledgeStore()
    nodes = store.list_nodes(user["id"], workspace_id=str(workspace_id) if workspace_id else None, limit=1000)
    edges = store.list_edges(user["id"], workspace_id=str(workspace_id) if workspace_id else None, limit=2000)
    
    if format == "graphml":
        # Generate basic GraphML
        lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
            '  <key id="label" for="node" attr.name="label" attr.type="string"/>',
            '  <key id="type" for="node" attr.name="node_type" attr.type="string"/>',
            '  <graph id="G" edgedefault="directed">'
        ]
        for n in nodes:
            lines.append(f'    <node id="{n["id"]}">')
            lines.append(f'      <data key="label">{n.get("label", "")}</data>')
            lines.append(f'      <data key="type">{n.get("node_type", "concept")}</data>')
            lines.append('    </node>')
        for e in edges:
            lines.append(f'    <edge source="{e["source_id"]}" target="{e["target_id"]}" label="{e.get("relationship", "RELATES_TO")}"/>')
        lines.append('  </graph>')
        lines.append('</graphml>')
        return PlainTextResponse("\n".join(lines), media_type="application/xml")

    return ApiResponse(
        data=GraphExport(
            nodes=[NodeResponse.model_validate(node) for node in nodes],
            edges=[EdgeResponse.model_validate(edge) for edge in edges],
            metadata={"total_nodes": len(nodes), "total_edges": len(edges)},
        )
    )

@router.post("/import", response_model=ApiResponse)
async def import_graph(file: UploadFile = File(...), workspace_id: uuid.UUID | None = None, user: dict = Depends(get_current_user)):
    content = await file.read()
    try:
        data = json.loads(content)
    except Exception:
        raise HTTPException(status_code=400, detail="Only JSON format is currently supported for import.")
    
    store = Neo4jKnowledgeStore()
    nodes = data.get("data", {}).get("nodes", [])
    edges = data.get("data", {}).get("edges", [])
    
    node_id_map = {}
    
    for n in nodes:
        upserted = store.upsert_node(
            user_id=user["id"],
            workspace_id=str(workspace_id) if workspace_id else None,
            label=n.get("label", "Unknown"),
            node_type=n.get("node_type", "concept"),
            description=n.get("description"),
            source_ids=n.get("source_ids", []),
            metadata=n.get("metadata", {})
        )
        node_id_map[n["id"]] = upserted["id"]
        
    for e in edges:
        source_id = node_id_map.get(e["source_id"], e["source_id"])
        target_id = node_id_map.get(e["target_id"], e["target_id"])
        store.create_edge(
            source_id=source_id,
            target_id=target_id,
            relationship=e.get("relationship", "RELATES_TO"),
            weight=e.get("weight", 1.0),
            evidence=e.get("evidence", []),
            user_id=user["id"],
            workspace_id=str(workspace_id) if workspace_id else None,
        )
        
    return ApiResponse(data={"status": "success", "imported_nodes": len(nodes), "imported_edges": len(edges)})


@router.get("/nodes/{node_id}/related", response_model=ApiListResponse[NodeResponse])
async def find_related_nodes(
    node_id: str,
    depth: int = 2,
    user: dict = Depends(get_current_user),
):
    nodes = Neo4jKnowledgeStore().find_related(node_id, user_id=user["id"], depth=depth)
    return ApiListResponse(data=[NodeResponse.model_validate(node) for node in nodes])

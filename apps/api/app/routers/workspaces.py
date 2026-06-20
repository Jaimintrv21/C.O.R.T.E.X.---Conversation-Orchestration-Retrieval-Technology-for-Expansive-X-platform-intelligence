"""Workspaces router backed by Firebase/Firestore."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from app.dependencies import emit_audit_log, get_current_user
from app.firestore import FirestoreStore
from app.schemas.artifacts import AddMemberRequest, WorkspaceCreate, WorkspaceResponse, WorkspaceUpdate
from app.schemas.common import ApiListResponse, ApiResponse

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=ApiListResponse[WorkspaceResponse])
async def list_workspaces(user: dict = Depends(get_current_user)):
    workspaces = FirestoreStore().list_workspaces_for_user(user["id"])
    return ApiListResponse(data=[WorkspaceResponse.model_validate(item) for item in workspaces])


@router.post("", response_model=ApiResponse[WorkspaceResponse], status_code=201)
async def create_workspace(body: WorkspaceCreate, request: Request, user: dict = Depends(get_current_user)):
    store = FirestoreStore()
    if store.slug_exists(body.slug):
        raise HTTPException(status_code=409, detail="Workspace slug already taken")

    workspace = store.create_workspace(
        owner_id=user["id"],
        name=body.name,
        slug=body.slug,
        description=body.description,
        is_public=body.is_public,
    )
    await emit_audit_log(user["id"], "workspace.created", "workspace", workspace["id"], request)
    return ApiResponse(data=WorkspaceResponse.model_validate(workspace))


@router.patch("/{workspace_id}", response_model=ApiResponse[WorkspaceResponse])
async def update_workspace(
    workspace_id: uuid.UUID,
    body: WorkspaceUpdate,
    request: Request,
    user: dict = Depends(get_current_user),
):
    store = FirestoreStore()
    workspace = store.get_workspace(str(workspace_id))
    if not workspace or workspace["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Workspace not found or not owner")

    updated = store.update_workspace(str(workspace_id), body.model_dump(exclude_unset=True))
    await emit_audit_log(user["id"], "workspace.updated", "workspace", str(workspace_id), request)
    return ApiResponse(data=WorkspaceResponse.model_validate(updated))


@router.post("/{workspace_id}/members", response_model=ApiResponse, status_code=201)
async def add_member(
    workspace_id: uuid.UUID,
    body: AddMemberRequest,
    request: Request,
    user: dict = Depends(get_current_user),
):
    store = FirestoreStore()
    workspace = store.get_workspace(str(workspace_id))
    if not workspace or workspace["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only workspace owner can add members")

    store.add_workspace_member(
        workspace_id=str(workspace_id),
        user_id=str(body.user_id),
        role=body.role,
        invited_by=user["id"],
    )
    await emit_audit_log(user["id"], "workspace.member_added", "workspace", str(workspace_id), request)
    return ApiResponse(data={"message": "Member added"})


@router.delete("/{workspace_id}/members/{member_user_id}", response_model=ApiResponse)
async def remove_member(
    workspace_id: uuid.UUID,
    member_user_id: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    store = FirestoreStore()
    workspace = store.get_workspace(str(workspace_id))
    if not workspace or workspace["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only workspace owner can remove members")

    if not store.remove_workspace_member(str(workspace_id), str(member_user_id)):
        raise HTTPException(status_code=404, detail="Member not found")

    await emit_audit_log(user["id"], "workspace.member_removed", "workspace", str(workspace_id), request)
    return ApiResponse(data={"message": "Member removed"})

"""Workspaces router: CRUD and member management."""
from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import emit_audit_log, get_current_user
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.artifacts import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse, AddMemberRequest
from app.schemas.common import ApiResponse, ApiListResponse

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=ApiListResponse[WorkspaceResponse])
async def list_workspaces(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Owned + member workspaces
    owned = select(Workspace).where(Workspace.owner_id == user.id, Workspace.deleted_at.is_(None))
    member = select(Workspace).join(WorkspaceMember).where(
        WorkspaceMember.user_id == user.id, Workspace.deleted_at.is_(None)
    )
    query = owned.union(member)
    result = await db.execute(query)
    workspaces = result.scalars().all()
    return ApiListResponse(data=[WorkspaceResponse.model_validate(w) for w in workspaces])


@router.post("", response_model=ApiResponse[WorkspaceResponse], status_code=201)
async def create_workspace(
    body: WorkspaceCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Workspace).where(Workspace.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Workspace slug already taken")

    ws = Workspace(owner_id=user.id, **body.model_dump())
    db.add(ws)
    await db.flush()

    # Add owner as member
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="owner", invited_by=user.id))
    await emit_audit_log(db, user.id, "workspace.created", "workspace", ws.id, request)
    return ApiResponse(data=WorkspaceResponse.model_validate(ws))


@router.patch("/{workspace_id}", response_model=ApiResponse[WorkspaceResponse])
async def update_workspace(
    workspace_id: uuid.UUID,
    body: WorkspaceUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = await db.get(Workspace, workspace_id)
    if not ws or ws.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Workspace not found or not owner")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(ws, field, value)

    await emit_audit_log(db, user.id, "workspace.updated", "workspace", ws.id, request)
    return ApiResponse(data=WorkspaceResponse.model_validate(ws))


@router.post("/{workspace_id}/members", response_model=ApiResponse, status_code=201)
async def add_member(
    workspace_id: uuid.UUID,
    body: AddMemberRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = await db.get(Workspace, workspace_id)
    if not ws or ws.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only workspace owner can add members")

    member = WorkspaceMember(
        workspace_id=workspace_id, user_id=body.user_id, role=body.role, invited_by=user.id,
    )
    db.add(member)
    await emit_audit_log(db, user.id, "workspace.member_added", "workspace", workspace_id, request)
    return ApiResponse(data={"message": "Member added"})


@router.delete("/{workspace_id}/members/{member_user_id}", response_model=ApiResponse)
async def remove_member(
    workspace_id: uuid.UUID,
    member_user_id: uuid.UUID,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = await db.get(Workspace, workspace_id)
    if not ws or ws.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only workspace owner can remove members")

    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == member_user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(member)
    await emit_audit_log(db, user.id, "workspace.member_removed", "workspace", workspace_id, request)
    return ApiResponse(data={"message": "Member removed"})

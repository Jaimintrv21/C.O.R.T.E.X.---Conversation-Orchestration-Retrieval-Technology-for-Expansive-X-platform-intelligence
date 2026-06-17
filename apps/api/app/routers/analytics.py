"""Analytics router: overview, topics, timeline, providers, heatmap, models."""
from __future__ import annotations
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.analytics import (
    HeatmapCell, ModelUsage, OverviewMetrics,
    ProviderBreakdown, TimelinePoint, TopicCount,
)
from app.schemas.common import ApiResponse, ApiListResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=ApiResponse[OverviewMetrics])
async def analytics_overview(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate usage stats for the authenticated user."""
    conv_q = select(
        func.count(Conversation.id),
        func.coalesce(func.sum(Conversation.message_count), 0),
        func.coalesce(func.sum(Conversation.token_count), 0),
        func.count(func.distinct(Conversation.provider_id)),
    ).where(Conversation.user_id == user.id, Conversation.deleted_at.is_(None))

    result = await db.execute(conv_q)
    row = result.one()

    total_convs = row[0] or 0
    return ApiResponse(data=OverviewMetrics(
        total_conversations=total_convs,
        total_messages=row[1],
        total_tokens=row[2],
        providers_used=row[3],
        avg_messages_per_conversation=round(row[1] / max(total_convs, 1), 1),
        active_days=0,  # TODO: count distinct days
    ))


@router.get("/topics", response_model=ApiListResponse[TopicCount])
async def analytics_topics(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Top topics across user's conversations."""
    # TODO: unnest topics array and count
    return ApiListResponse(data=[])


@router.get("/timeline", response_model=ApiListResponse[TimelinePoint])
async def analytics_timeline(
    date_from: date | None = None,
    date_to: date | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Daily conversation/message counts over time."""
    # TODO: Group by date
    return ApiListResponse(data=[])


@router.get("/providers", response_model=ApiListResponse[ProviderBreakdown])
async def analytics_providers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Per-provider conversation breakdown."""
    # TODO: Group by provider_id with join to providers table
    return ApiListResponse(data=[])


@router.get("/heatmap", response_model=ApiListResponse[HeatmapCell])
async def analytics_heatmap(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Activity heatmap by day-of-week and hour."""
    # TODO: Extract day/hour from conversation timestamps
    return ApiListResponse(data=[])


@router.get("/models", response_model=ApiListResponse[ModelUsage])
async def analytics_models(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Usage breakdown by AI model."""
    # TODO: Group messages by model field
    return ApiListResponse(data=[])

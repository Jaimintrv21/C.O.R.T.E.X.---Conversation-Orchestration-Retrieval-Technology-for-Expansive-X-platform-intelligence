"""Analytics router backed by Firebase/Firestore."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.firestore import FirestoreStore
from app.schemas.analytics import HeatmapCell, ModelUsage, OverviewMetrics, ProviderBreakdown, TimelinePoint, TopicCount
from app.schemas.common import ApiListResponse, ApiResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=ApiResponse[OverviewMetrics])
async def analytics_overview(user: dict = Depends(get_current_user)):
    metrics = FirestoreStore().compute_overview_metrics(user["id"])
    return ApiResponse(data=OverviewMetrics.model_validate(metrics))


@router.get("/topics", response_model=ApiListResponse[TopicCount])
async def analytics_topics(user: dict = Depends(get_current_user)):
    topics = FirestoreStore().topic_breakdown(user["id"])
    return ApiListResponse(data=[TopicCount.model_validate(item) for item in topics])


@router.get("/timeline", response_model=ApiListResponse[TimelinePoint])
async def analytics_timeline(
    date_from: date | None = None,
    date_to: date | None = None,
    user: dict = Depends(get_current_user),
):
    points = FirestoreStore().timeline(user["id"])
    if date_from:
        points = [point for point in points if point["date"] >= date_from]
    if date_to:
        points = [point for point in points if point["date"] <= date_to]
    return ApiListResponse(data=[TimelinePoint.model_validate(item) for item in points])


@router.get("/providers", response_model=ApiListResponse[ProviderBreakdown])
async def analytics_providers(user: dict = Depends(get_current_user)):
    providers = FirestoreStore().provider_breakdown(user["id"])
    return ApiListResponse(data=[ProviderBreakdown.model_validate(item) for item in providers])


@router.get("/heatmap", response_model=ApiListResponse[HeatmapCell])
async def analytics_heatmap(user: dict = Depends(get_current_user)):
    return ApiListResponse(data=[])


@router.get("/models", response_model=ApiListResponse[ModelUsage])
async def analytics_models(user: dict = Depends(get_current_user)):
    return ApiListResponse(data=[])

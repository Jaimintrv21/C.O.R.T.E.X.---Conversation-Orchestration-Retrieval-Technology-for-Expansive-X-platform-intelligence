"""Analytics router backed by Firebase/Firestore."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.firestore import FirestoreStore
from app.schemas.analytics import HeatmapCell, ModelUsage, OverviewMetrics, ProviderBreakdown, TimelinePoint, TopicCount, SentimentTrend, ResponseQuality, TopicEvolution, CrossProviderComparison, KnowledgeGraphStats
from app.schemas.common import ApiListResponse, ApiResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=ApiResponse[OverviewMetrics])
async def analytics_overview(date_from: date | None = None, date_to: date | None = None, user: dict = Depends(get_current_user)):
    metrics = FirestoreStore().compute_overview_metrics(user["id"])
    return ApiResponse(data=OverviewMetrics.model_validate(metrics))


@router.get("/topics", response_model=ApiListResponse[TopicCount])
async def analytics_topics(date_from: date | None = None, date_to: date | None = None, user: dict = Depends(get_current_user)):
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
async def analytics_providers(date_from: date | None = None, date_to: date | None = None, user: dict = Depends(get_current_user)):
    providers = FirestoreStore().provider_breakdown(user["id"])
    return ApiListResponse(data=[ProviderBreakdown.model_validate(item) for item in providers])


@router.get("/heatmap", response_model=ApiListResponse[HeatmapCell])
async def analytics_heatmap(date_from: date | None = None, date_to: date | None = None, user: dict = Depends(get_current_user)):
    return ApiListResponse(data=[])


@router.get("/models", response_model=ApiListResponse[ModelUsage])
async def analytics_models(date_from: date | None = None, date_to: date | None = None, user: dict = Depends(get_current_user)):
    return ApiListResponse(data=[])

@router.get("/sentiment-trend", response_model=ApiListResponse[SentimentTrend])
async def analytics_sentiment_trend(date_from: date | None = None, date_to: date | None = None, user: dict = Depends(get_current_user)):
    # Mocked lightweight sentiment classification
    return ApiListResponse(data=[SentimentTrend(date=date.today(), sentiment_score=0.8)])

@router.get("/response-quality", response_model=ApiListResponse[ResponseQuality])
async def analytics_response_quality(date_from: date | None = None, date_to: date | None = None, user: dict = Depends(get_current_user)):
    # Mocked clarification rate using simple heuristic 
    return ApiListResponse(data=[ResponseQuality(provider="openai", model="gpt-4o", clarification_rate=0.15, total_samples=42)])

@router.get("/topic-evolution", response_model=ApiListResponse[TopicEvolution])
async def analytics_topic_evolution(date_from: date | None = None, date_to: date | None = None, user: dict = Depends(get_current_user)):
    # Mocked topic bucketing over time
    return ApiListResponse(data=[TopicEvolution(week_start=date.today(), topic="python", count=10, trend="growing")])

@router.get("/cross-provider-comparison", response_model=ApiListResponse[CrossProviderComparison])
async def analytics_cross_provider_comparison(date_from: date | None = None, date_to: date | None = None, user: dict = Depends(get_current_user)):
    # Mocked cross provider comparison based on semantic similarity
    return ApiListResponse(data=[CrossProviderComparison(query_cluster="auth handling", comparisons=[{"provider":"openai", "avg_length": 500, "avg_time": 2.5}])])

@router.get("/knowledge-graph-stats", response_model=ApiResponse[KnowledgeGraphStats])
async def analytics_knowledge_graph_stats(date_from: date | None = None, date_to: date | None = None, user: dict = Depends(get_current_user)):
    # Mocked graph stats from Neo4j
    return ApiResponse(data=KnowledgeGraphStats(node_count=150, edge_count=300, most_connected_nodes=[{"id": "auth0", "degree": 15}], growth_rate_pct=5.5))

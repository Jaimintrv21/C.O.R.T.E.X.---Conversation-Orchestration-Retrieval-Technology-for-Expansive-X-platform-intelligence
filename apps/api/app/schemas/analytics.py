"""Analytics schemas."""
from __future__ import annotations
from datetime import date
from pydantic import BaseModel


class OverviewMetrics(BaseModel):
    total_conversations: int
    total_messages: int
    total_tokens: int
    providers_used: int
    avg_messages_per_conversation: float
    active_days: int


class TopicCount(BaseModel):
    topic: str
    count: int
    percentage: float


class TimelinePoint(BaseModel):
    date: date
    conversations: int
    messages: int
    tokens: int


class ProviderBreakdown(BaseModel):
    provider: str
    conversations: int
    messages: int
    tokens: int
    percentage: float


class HeatmapCell(BaseModel):
    day: int  # 0-6 (Mon-Sun)
    hour: int  # 0-23
    count: int


class ModelUsage(BaseModel):
    model: str
    message_count: int
    token_count: int
    avg_response_length: float

class SentimentTrend(BaseModel):
    date: date
    sentiment_score: float

class ResponseQuality(BaseModel):
    provider: str
    model: str
    clarification_rate: float
    total_samples: int

class TopicEvolution(BaseModel):
    week_start: date
    topic: str
    count: int
    trend: str # "growing", "shrinking", "stable"

class CrossProviderComparison(BaseModel):
    query_cluster: str
    comparisons: list[dict] # Includes provider, avg_length, avg_time

class KnowledgeGraphStats(BaseModel):
    node_count: int
    edge_count: int
    most_connected_nodes: list[dict]
    growth_rate_pct: float


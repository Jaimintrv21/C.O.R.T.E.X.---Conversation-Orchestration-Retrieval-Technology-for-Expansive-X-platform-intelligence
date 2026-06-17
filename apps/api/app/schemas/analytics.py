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

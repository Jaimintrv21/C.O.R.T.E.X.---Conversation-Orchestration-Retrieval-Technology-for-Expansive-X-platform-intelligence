"""Usage summary schemas."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class UsageProviderSummary(BaseModel):
    provider_slug: str
    prompt_tokens: int
    completion_tokens: int
    estimated_cost_usd: float
    call_count: int


class UsageDaySummary(BaseModel):
    date: date
    prompt_tokens: int
    completion_tokens: int
    estimated_cost_usd: float
    call_count: int


class UsageSummaryResponse(BaseModel):
    date_from: datetime | None = None
    date_to: datetime | None = None
    totals: dict
    by_provider: list[UsageProviderSummary]
    by_day: list[UsageDaySummary]

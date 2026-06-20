"""Usage summary endpoints."""
from __future__ import annotations

from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.firestore import FirestoreStore
from app.schemas.common import ApiResponse
from app.schemas.usage import UsageSummaryResponse

router = APIRouter(prefix="/usage", tags=["Usage"])


def _to_aware_date_boundary(value: datetime | None, *, end_of_day: bool = False) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        base = value.date()
        naive = datetime.combine(base, time.max if end_of_day else time.min)
        return naive.replace(tzinfo=timezone.utc)
    return value


@router.get("/summary", response_model=ApiResponse[UsageSummaryResponse])
async def get_usage_summary(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    user: dict = Depends(get_current_user),
):
    store = FirestoreStore()
    summary = store.get_usage_summary(
        user["id"],
        date_from=_to_aware_date_boundary(date_from),
        date_to=_to_aware_date_boundary(date_to, end_of_day=True),
    )
    payload = UsageSummaryResponse.model_validate(summary)
    return ApiResponse(data=payload)

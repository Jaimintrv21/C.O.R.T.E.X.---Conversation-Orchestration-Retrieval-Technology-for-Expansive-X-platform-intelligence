"""Authentication schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    display_name: str | None
    avatar_url: str | None
    role: str
    is_active: bool
    is_verified: bool
    storage_quota: int
    storage_used: int

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    id: str
    user_id: str
    token_hash: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    expires_at: datetime
    revoked_at: datetime | None = None
    auth0_session_id: str | None = None
    auth0_jti: str | None = None
    last_seen_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True

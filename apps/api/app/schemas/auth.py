"""Authentication schemas."""
from __future__ import annotations
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: UUID
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


class VerifyEmailRequest(BaseModel):
    token: str


class TotpEnableRequest(BaseModel):
    password: str


class TotpEnableResponse(BaseModel):
    secret: str
    provisioning_uri: str
    backup_codes: list[str]

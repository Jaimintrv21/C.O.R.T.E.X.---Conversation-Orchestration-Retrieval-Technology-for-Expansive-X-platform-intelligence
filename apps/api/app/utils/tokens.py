"""Deprecated local JWT helpers.

Auth0 now owns token issuance and refresh token lifecycle. This module is kept
as a compatibility shim while the codebase migrates to Auth0-issued tokens.
"""
from __future__ import annotations

from app.auth0.jwt_verifier import verify_auth0_token


def create_access_token(*args, **kwargs) -> str:  # pragma: no cover - compatibility shim
    raise RuntimeError("Auth0 issues access tokens; local token creation is disabled")


def create_refresh_token(*args, **kwargs) -> str:  # pragma: no cover - compatibility shim
    raise RuntimeError("Auth0 issues refresh tokens; local token creation is disabled")


def decode_token(token: str) -> dict:
    return verify_auth0_token(token)

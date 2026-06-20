from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.security import HTTPAuthorizationCredentials

from app.auth0 import jwt_verifier
from app.auth0.jwt_verifier import AUTH0_ROLES_CLAIM, AUTH0_WORKSPACE_CLAIM, Auth0VerificationError
from app.config import Settings
from app.dependencies import get_current_user


def _generate_keypair() -> tuple[object, object, dict[str, object]]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(public_key))
    jwk["kid"] = "test-kid"
    jwk["use"] = "sig"
    jwk["alg"] = "RS256"
    return private_key, public_key, jwk


def _make_token(private_key, *, issuer: str, audience: str, exp_delta: timedelta, extra_claims: dict[str, object] | None = None) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": "auth0|123456",
        "iss": issuer,
        "aud": audience,
        "iat": int(now.timestamp()),
        "exp": int((now + exp_delta).timestamp()),
        "email": "user@example.com",
        "name": "Test User",
        AUTH0_ROLES_CLAIM: "user",
        AUTH0_WORKSPACE_CLAIM: "workspace_123",
        "sid": "session_abc",
        "jti": "jti_abc",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": "test-kid"})


@pytest.fixture(autouse=True)
def _reset_jwks_cache(monkeypatch):
    monkeypatch.setattr(jwt_verifier, "_JWKS_CACHE", None)
    yield
    monkeypatch.setattr(jwt_verifier, "_JWKS_CACHE", None)


@pytest.fixture
def auth0_settings(monkeypatch):
    settings = Settings(
        auth0_domain="tenant.example.com",
        auth0_audience="https://api.cortex.app",
        auth0_client_id="client-id",
        auth0_client_secret="client-secret",
        auth0_jwks_cache_ttl_seconds=86_400,
    )
    monkeypatch.setattr(jwt_verifier, "get_settings", lambda: settings)
    return settings


def test_valid_token_is_accepted(monkeypatch, auth0_settings):
    private_key, _, jwk = _generate_keypair()

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"keys": [jwk]}

    monkeypatch.setattr(httpx, "get", lambda *args, **kwargs: Response())
    token = _make_token(
        private_key,
        issuer=f"https://{auth0_settings.auth0_domain}/",
        audience=auth0_settings.auth0_audience,
        exp_delta=timedelta(minutes=30),
    )

    payload = jwt_verifier.verify_auth0_token(token)

    assert payload["sub"] == "auth0|123456"
    assert payload[AUTH0_ROLES_CLAIM] == "user"


def test_expired_token_is_rejected(monkeypatch, auth0_settings):
    private_key, _, jwk = _generate_keypair()

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"keys": [jwk]}

    monkeypatch.setattr(httpx, "get", lambda *args, **kwargs: Response())
    token = _make_token(
        private_key,
        issuer=f"https://{auth0_settings.auth0_domain}/",
        audience=auth0_settings.auth0_audience,
        exp_delta=timedelta(minutes=-5),
    )

    with pytest.raises(Auth0VerificationError):
        jwt_verifier.verify_auth0_token(token)


def test_wrong_audience_is_rejected(monkeypatch, auth0_settings):
    private_key, _, jwk = _generate_keypair()

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"keys": [jwk]}

    monkeypatch.setattr(httpx, "get", lambda *args, **kwargs: Response())
    token = _make_token(
        private_key,
        issuer=f"https://{auth0_settings.auth0_domain}/",
        audience="https://wrong-audience.example.com",
        exp_delta=timedelta(minutes=30),
    )

    with pytest.raises(Auth0VerificationError):
        jwt_verifier.verify_auth0_token(token)


def test_wrong_issuer_is_rejected(monkeypatch, auth0_settings):
    private_key, _, jwk = _generate_keypair()

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"keys": [jwk]}

    monkeypatch.setattr(httpx, "get", lambda *args, **kwargs: Response())
    token = _make_token(
        private_key,
        issuer="https://malicious.example.com/",
        audience=auth0_settings.auth0_audience,
        exp_delta=timedelta(minutes=30),
    )

    with pytest.raises(Auth0VerificationError):
        jwt_verifier.verify_auth0_token(token)


@pytest.mark.asyncio
async def test_jit_provisioning_on_first_request(monkeypatch, auth0_settings):
    private_key, _, jwk = _generate_keypair()

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"keys": [jwk]}

    monkeypatch.setattr(httpx, "get", lambda *args, **kwargs: Response())
    token = _make_token(
        private_key,
        issuer=f"https://{auth0_settings.auth0_domain}/",
        audience=auth0_settings.auth0_audience,
        exp_delta=timedelta(minutes=30),
    )

    class FakeStore:
        def __init__(self):
            self.calls = []

        def get_or_create_user_from_auth0(self, sub: str, claims: dict[str, object]) -> dict[str, object]:
            self.calls.append(("get_or_create", sub, claims))
            return {
                "id": sub,
                "email": claims["email"],
                "username": "test-user",
                "display_name": claims["name"],
                "avatar_url": None,
                "role": "user",
                "is_active": True,
                "is_verified": True,
                "storage_quota": 5_368_709_120,
                "storage_used": 0,
            }

        def upsert_auth0_session(self, *args, **kwargs):
            self.calls.append(("session", args, kwargs))

    store = FakeStore()
    monkeypatch.setattr("app.dependencies.FirestoreStore", lambda: store)

    request = SimpleNamespace(
        client=SimpleNamespace(host="127.0.0.1"),
        headers={"user-agent": "pytest"},
    )
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    user = await get_current_user(request, credentials)

    assert user["id"] == "auth0|123456"
    assert store.calls[0][0] == "get_or_create"
    assert store.calls[0][1] == "auth0|123456"
    assert store.calls[1][0] == "session"

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from starlette.responses import Response

from app.main import app
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers import ingest as ingest_router


class FakeEmbedTask:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def delay(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(id="task-1")


class FakeStore:
    def __init__(self) -> None:
        self.provider_accounts = {
            "pa1": {
                "id": "pa1",
                "user_id": "auth0|user-1",
                "provider_slug": "chatgpt",
                "connection_type": "extension",
                "display_name": "ChatGPT",
                "workspace_id": None,
                "is_active": True,
            }
        }
        self.provider_account_updates: list[tuple[str, dict]] = []
        self.api_logs: list[dict] = []
        self.conversations: dict[str, dict] = {}
        self.messages: dict[str, list[dict]] = {}
        self.audit_logs: list[dict] = []

    def get_provider_account(self, provider_account_id: str):
        return self.provider_accounts.get(provider_account_id)

    def update_provider_account(self, provider_account_id: str, patch: dict):
        account = self.provider_accounts[provider_account_id]
        account.update(patch)
        self.provider_account_updates.append((provider_account_id, patch))
        return account

    def create_api_log(self, **kwargs):
        payload = {"id": f"log-{len(self.api_logs) + 1}", **kwargs}
        self.api_logs.append(payload)
        return payload

    def create_audit_log(self, **kwargs):
        self.audit_logs.append(kwargs)

    def get_conversation_by_external_id(self, user_id: str, external_id: str):
        for conversation in self.conversations.values():
            if conversation["user_id"] == user_id and conversation["external_id"] == external_id:
                return conversation
        return None

    def create_conversation(self, **kwargs):
        conversation_id = f"conv-{len(self.conversations) + 1}"
        payload = {
            "id": conversation_id,
            "message_count": 0,
            "token_count": 0,
            "preview": None,
            "deleted_at": None,
            **kwargs,
        }
        self.conversations[conversation_id] = payload
        self.messages[conversation_id] = []
        return payload

    def add_message(self, **kwargs):
        message_id = f"msg-{sum(len(messages) for messages in self.messages.values()) + 1}"
        payload = {"id": message_id, **kwargs}
        self.messages.setdefault(kwargs["conversation_id"], []).append(payload)
        return payload

    def list_messages(self, conversation_id: str):
        return list(self.messages.get(conversation_id, []))

    def update_conversation(self, conversation_id: str, patch: dict):
        self.conversations[conversation_id].update(patch)
        return self.conversations[conversation_id]

    def update_conversation_message_stats(self, conversation_id: str):
        messages = self.list_messages(conversation_id)
        conversation = self.conversations[conversation_id]
        conversation["message_count"] = len(messages)
        conversation["token_count"] = sum(int(message.get("token_count") or 0) for message in messages)
        conversation["preview"] = messages[0]["content"][:240] if messages else None
        return conversation

    def _provider_name(self, provider_slug: str) -> str:
        return provider_slug.title()


def _extension_payload(messages: list[dict], *, external_id: str = "conv-1"):
    return {
        "provider_slug": "chatgpt",
        "conversations": [
            {
                "external_id": external_id,
                "title": "Test Conversation",
                "captured_at": "2026-06-20T00:00:00Z",
                "messages": messages,
            }
        ],
    }


@pytest.fixture
def fake_env(monkeypatch):
    fake_store = FakeStore()
    fake_embed = FakeEmbedTask()
    token_payload = {
        "sub": "auth0|user-1",
        "provider_account_id": "pa1",
        "provider_slug": "chatgpt",
        "jti": "ext-jti-1",
    }

    async def noop(*args, **kwargs):
        return None

    def mock_verify_extension_token(token: str):
        if token.startswith("eyJ"):
            from app.auth0.extension_tokens import ExtensionTokenError
            raise ExtensionTokenError("Not an extension token")
        return token_payload

    monkeypatch.setattr("app.dependencies.verify_extension_token", mock_verify_extension_token)
    monkeypatch.setattr("app.dependencies.FirestoreStore", lambda: fake_store)
    monkeypatch.setattr("app.routers.ingest.FirestoreStore", lambda: fake_store)
    monkeypatch.setattr("app.services.import_service.FirestoreStore", lambda: fake_store)
    monkeypatch.setattr("app.services.import_service.embed_batch", fake_embed)
    monkeypatch.setattr("app.routers.ingest.emit_audit_log", noop)
    monkeypatch.setattr("app.dependencies.emit_audit_log", noop)
    return fake_store, fake_embed


def test_extension_ingest_validates_payload(fake_env):
    client = TestClient(app)
    response = client.post(
        "/api/v1/ingest/extension",
        headers={"Authorization": "Bearer ext-token"},
        json={
            "provider_slug": "chatgpt",
            "conversations": [{"external_id": "conv-1", "messages": [{}]}],
        },
    )
    assert response.status_code == 422


def test_extension_ingest_rejects_large_payload(fake_env):
    client = TestClient(app)
    huge_message = "x" * (10 * 1024 * 1024 + 1)
    raw = json.dumps(_extension_payload([{"content": huge_message}])).encode("utf-8")
    response = client.post(
        "/api/v1/ingest/extension",
        headers={"Authorization": "Bearer ext-token", "Content-Type": "application/json"},
        content=raw,
    )
    assert response.status_code == 413


def test_extension_ingest_dedup_merges_new_messages(fake_env):
    fake_store, fake_embed = fake_env
    client = TestClient(app)

    first = client.post(
        "/api/v1/ingest/extension",
        headers={"Authorization": "Bearer ext-token"},
        json=_extension_payload(
            [
                {
                    "external_id": "m1",
                    "role": "user",
                    "content": "hello",
                    "token_count": 1,
                }
            ]
        ),
    )
    assert first.status_code == 200
    assert first.json()["data"]["imported"] == 1

    second = client.post(
        "/api/v1/ingest/extension",
        headers={"Authorization": "Bearer ext-token"},
        json=_extension_payload(
            [
                {
                    "external_id": "m1",
                    "role": "user",
                    "content": "hello",
                    "token_count": 1,
                },
                {
                    "external_id": "m2",
                    "role": "assistant",
                    "content": "world",
                    "token_count": 1,
                },
            ]
        ),
    )

    assert second.status_code == 200
    assert second.json()["data"]["updated"] == 1
    conversation = fake_store.conversations["conv-1"]
    assert conversation["message_count"] == 2
    assert len(fake_store.messages["conv-1"]) == 2
    assert fake_embed.calls
    assert fake_embed.calls[-1]["message_ids"]


def test_extension_ingest_rejects_normal_auth0_token(fake_env):
    client = TestClient(app)
    response = client.post(
        "/api/v1/ingest/extension",
        headers={"Authorization": "Bearer eyJ.invalid.auth0.token"},
        json=_extension_payload([{"content": "hello"}]),
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_extension_rate_limit_blocks_second_request():
    from app.config import get_settings

    settings = get_settings()
    original_limit = settings.rate_limit_extension
    settings.rate_limit_extension = 1
    try:
        middleware = RateLimitMiddleware(lambda scope, receive, send: None)

        async def call_next(_request):
            return Response("ok", status_code=200)

        request = SimpleNamespace(
            url=SimpleNamespace(path="/api/v1/ingest/extension"),
            headers={"authorization": "Bearer ext-token"},
            client=SimpleNamespace(host="127.0.0.1"),
        )

        first = await middleware.dispatch(request, call_next)
        second = await middleware.dispatch(request, call_next)

        assert first.status_code == 200
        assert second.status_code == 429
    finally:
        settings.rate_limit_extension = original_limit

"""Firebase Admin and Firestore helpers."""
from __future__ import annotations

import json
import secrets
import uuid
from collections import Counter, defaultdict
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore

from app.config import get_settings
from app.utils.crypto import decrypt_field, decrypt_with_key, encrypt_field, encrypt_with_key


def utcnow() -> datetime:
    return datetime.now(UTC)


def make_uuid() -> str:
    return str(uuid.uuid4())


@lru_cache
def get_firebase_app() -> firebase_admin.App:
    settings = get_settings()

    if firebase_admin._apps:
        return firebase_admin.get_app()

    cred: credentials.Base | None = None
    if settings.firebase_service_account_json:
        payload = json.loads(settings.firebase_service_account_json)
        if "private_key" in payload:
            payload["private_key"] = payload["private_key"].replace("\\n", "\n")
        cred = credentials.Certificate(payload)
    elif settings.firebase_service_account_path:
        cred = credentials.Certificate(settings.firebase_service_account_path)

    options: dict[str, Any] = {}
    if settings.firebase_project_id:
        options["projectId"] = settings.firebase_project_id
    if settings.firebase_storage_bucket:
        options["storageBucket"] = settings.firebase_storage_bucket

    if cred:
        return firebase_admin.initialize_app(cred, options=options)
    return firebase_admin.initialize_app(options=options)


@lru_cache
def get_firestore_client() -> firestore.Client:
    app = get_firebase_app()
    return firestore.client(app=app)


def _with_id(snapshot: Any) -> dict[str, Any]:
    data = snapshot.to_dict() or {}
    data["id"] = snapshot.id
    return data


class FirestoreStore:
    """Repository-like facade around Firestore collections and relationships."""

    def __init__(self) -> None:
        self.db = get_firestore_client()

    def _col(self, name: str):
        return self.db.collection(name)

    def _user_dek(self, user_id: str) -> bytes:
        user = self.get_user(user_id)
        if not user or not user.get("encrypted_dek") or not user.get("dek_iv"):
            raise ValueError("User does not have an envelope-encrypted DEK")
        encrypted_dek = user["encrypted_dek"]
        dek_iv = user["dek_iv"]
        if not isinstance(encrypted_dek, (bytes, bytearray)) or not isinstance(dek_iv, (bytes, bytearray)):
            raise ValueError("Invalid DEK payload")
        return decrypt_field(bytes(encrypted_dek), bytes(dek_iv))

    def encrypt_for_user(self, user_id: str, plaintext: bytes) -> tuple[bytes, bytes]:
        return encrypt_with_key(plaintext, self._user_dek(user_id))

    def decrypt_for_user(self, user_id: str, ciphertext: bytes, nonce: bytes) -> bytes:
        return decrypt_with_key(ciphertext, nonce, self._user_dek(user_id))

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        docs = list(self._col("users").where("email", "==", email.lower()).limit(1).stream())
        return _with_id(docs[0]) if docs else None

    def get_user_by_username(self, username: str) -> dict[str, Any] | None:
        docs = list(self._col("users").where("username", "==", username).limit(1).stream())
        return _with_id(docs[0]) if docs else None

    def get_user(self, user_id: str) -> dict[str, Any] | None:
        doc = self._col("users").document(user_id).get()
        return _with_id(doc) if doc.exists else None

    def create_user(
        self,
        *,
        user_id: str | None = None,
        email: str,
        username: str,
        display_name: str,
        avatar_url: str | None = None,
        role: str = "user",
        is_verified: bool = False,
        preferences: dict[str, Any] | None = None,
        encryption_mode: str = "envelope",
        auth0_subject: str | None = None,
        auth0_connection: str | None = None,
        auth0_claims: dict[str, Any] | None = None,
        primary_workspace_id: str | None = None,
    ) -> dict[str, Any]:
        user_id = user_id or make_uuid()
        now = utcnow()
        payload = {
            "email": email.lower(),
            "username": username,
            "display_name": display_name,
            "avatar_url": avatar_url,
            "role": role,
            "is_active": True,
            "is_verified": is_verified,
            "preferences": preferences or {},
            "storage_quota": 5_368_709_120,
            "storage_used": 0,
            "encrypted_dek": None,
            "dek_iv": None,
            "encryption_mode": encryption_mode,
            "auth0_subject": auth0_subject or user_id,
            "auth0_connection": auth0_connection,
            "auth0_claims": auth0_claims or {},
            "primary_workspace_id": primary_workspace_id,
            "last_login_at": None,
            "created_at": now,
            "updated_at": now,
            "deleted_at": None,
        }
        self._col("users").document(user_id).set(payload)
        payload["id"] = user_id
        return payload

    def get_or_create_user_from_auth0(self, sub: str, claims: dict[str, Any]) -> dict[str, Any]:
        user_ref = self._col("users").document(sub)
        
        @firestore.transactional
        def _txn_get_or_create(transaction: firestore.Transaction) -> dict[str, Any]:
            snapshot = user_ref.get(transaction=transaction)
            now = utcnow()
            role_claim = claims.get("https://cortex.app/roles", "user")
            if isinstance(role_claim, list):
                role = str(role_claim[0]) if role_claim else "user"
            else:
                role = str(role_claim or "user")

            email = str(claims.get("email") or claims.get("preferred_username") or f"{sub}@auth0.local")
            display_name = claims.get("name") or claims.get("nickname") or email.split("@")[0]
            avatar_url = claims.get("picture")
            workspace_id = claims.get("https://cortex.app/workspace_id")
            
            existing = snapshot.to_dict() if snapshot.exists else None
            
            patch = {
                "email": email.lower(),
                "display_name": display_name,
                "avatar_url": avatar_url,
                "role": role,
                "is_active": True,
                "is_verified": bool(claims.get("email_verified", True)),
                "preferences": (existing or {}).get("preferences", {}),
                "storage_quota": (existing or {}).get("storage_quota", 5_368_709_120),
                "storage_used": (existing or {}).get("storage_used", 0),
                "encryption_mode": (existing or {}).get("encryption_mode", "envelope"),
                "auth0_subject": sub,
                "auth0_connection": claims.get("gty") or claims.get("org_id") or claims.get("iss"),
                "auth0_claims": {
                    "iss": claims.get("iss"),
                    "aud": claims.get("aud"),
                    "azp": claims.get("azp"),
                    "scope": claims.get("scope"),
                    "roles": claims.get("https://cortex.app/roles"),
                    "workspace_id": workspace_id,
                },
                "primary_workspace_id": workspace_id,
                "last_login_at": now,
                "deleted_at": None,
            }

            if existing:
                patch.pop("storage_quota", None)
                patch.pop("storage_used", None)
                patch.pop("encryption_mode", None)
                patch["updated_at"] = now
                transaction.set(user_ref, patch, merge=True)
                return {**existing, **patch, "id": sub}

            dek = secrets.token_bytes(32)
            wrapped_dek, dek_iv = encrypt_field(dek)
            
            full_payload = {
                **patch,
                "username": str(claims.get("nickname") or claims.get("preferred_username") or email.split("@")[0] or sub.replace("|", "_")),
                "encrypted_dek": wrapped_dek,
                "dek_iv": dek_iv,
                "created_at": now,
                "updated_at": now,
            }
            transaction.set(user_ref, full_payload)
            full_payload["id"] = sub
            return full_payload

        transaction = self.db.transaction()
        return _txn_get_or_create(transaction)

    def update_user(self, user_id: str, patch: dict[str, Any]) -> None:
        patch["updated_at"] = utcnow()
        self._col("users").document(user_id).set(patch, merge=True)

    def record_login_history(
        self,
        *,
        user_id: str,
        session_key: str,
        ip_address: str | None,
        user_agent: str | None,
        expires_at: datetime,
    ) -> dict[str, Any]:
        ref = self._col("users").document(user_id).collection("login_history").document(session_key)
        payload = {
            "session_key": session_key,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "expires_at": expires_at,
            "last_seen_at": utcnow(),
            "revoked_at": None,
        }
        ref.set(payload, merge=True)
        doc = ref.get()
        return _with_id(doc) if doc.exists else payload

    def list_login_history(self, user_id: str, limit: int = 50) -> list[dict[str, Any]]:
        docs = list(self._col("users").document(user_id).collection("login_history").stream())
        items = [_with_id(doc) for doc in docs]
        items.sort(key=lambda item: item.get("last_seen_at") or datetime.min.replace(tzinfo=UTC), reverse=True)
        return items[:limit]

    def revoke_login_session(self, user_id: str, session_id: str) -> dict[str, Any] | None:
        ref = self._col("users").document(user_id).collection("login_history").document(session_id)
        if not ref.get().exists:
            return None
        patch = {"revoked_at": utcnow()}
        ref.set(patch, merge=True)
        return _with_id(ref.get())

    def create_provider_account(
        self,
        *,
        user_id: str,
        provider_slug: str,
        connection_method: str,
        display_name: str | None = None,
        api_key: str | None = None,
        extension_token_jti: str | None = None,
        extension_token_expires_at: datetime | None = None,
        monthly_cap_usd: float | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        provider_account_id = make_uuid()
        now = utcnow()
        payload: dict[str, Any] = {
            "user_id": user_id,
            "workspace_id": None,
            "provider_slug": provider_slug,
            "connection_method": connection_method,
            "display_name": display_name,
            "encrypted_api_key": None,
            "api_key_nonce": None,
            "api_key_preview": None,
            "monthly_cap_usd": monthly_cap_usd,
            "needs_reauth": False,
            "extension_token_jti": extension_token_jti,
            "extension_token_expires_at": extension_token_expires_at,
            "extension_token_revoked_at": None,
            "last_synced_at": None,
            "knowledge_sync_status": "idle",
            "is_active": True,
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now,
            "deleted_at": None,
        }
        if api_key is not None:
            encrypted_api_key, api_key_nonce = self.encrypt_for_user(user_id, api_key.encode("utf-8"))
            payload["encrypted_api_key"] = encrypted_api_key
            payload["api_key_nonce"] = api_key_nonce
        self._col("provider_accounts").document(provider_account_id).set(payload)
        payload["id"] = provider_account_id
        return payload

    def get_provider_account(self, provider_account_id: str) -> dict[str, Any] | None:
        doc = self._col("provider_accounts").document(provider_account_id).get()
        return _with_id(doc) if doc.exists else None

    def list_provider_accounts(self, user_id: str) -> list[dict[str, Any]]:
        docs = list(self._col("provider_accounts").where("user_id", "==", user_id).stream())
        items = [_with_id(doc) for doc in docs]
        items = [item for item in items if item.get("deleted_at") is None]
        items.sort(key=lambda item: item.get("created_at") or utcnow(), reverse=True)
        return items

    def update_provider_account(self, provider_account_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        patch["updated_at"] = utcnow()
        self._col("provider_accounts").document(provider_account_id).set(patch, merge=True)
        return self.get_provider_account(provider_account_id)

    def get_integration_status(self, user_id: str, provider_slug: str) -> dict[str, Any]:
        accounts = self.list_provider_accounts(user_id)
        accounts = [acc for acc in accounts if acc.get("provider_slug") == provider_slug and acc.get("is_active", True)]
        
        methods = {}
        last_synced = None
        for acc in accounts:
            method = acc.get("connection_method")
            if not method: continue
            
            acc_last_synced = acc.get("last_synced_at")
            methods[method] = {
                "id": acc["id"],
                "last_synced_at": acc_last_synced,
                "status": acc.get("knowledge_sync_status", "idle")
            }
            if acc_last_synced:
                if last_synced is None or acc_last_synced > last_synced:
                    last_synced = acc_last_synced
                    
        tier = "none"
        if methods:
            if "extension" in methods or "api_key" in methods:
                tier = "full"
            else:
                tier = "partial"
                
        return {
            "methods": methods,
            "last_synced_at": last_synced,
            "tier": tier
        }

    def revoke_provider_account(self, provider_account_id: str) -> dict[str, Any] | None:
        account = self.get_provider_account(provider_account_id)
        if not account:
            return None

        patch = {
            "is_active": False,
            "deleted_at": utcnow(),
            "updated_at": utcnow(),
            "encrypted_api_key": None,
            "api_key_nonce": None,
            "needs_reauth": False,
        }
        if account.get("extension_token_jti"):
            patch["extension_token_revoked_at"] = utcnow()
            self.revoke_extension_token(
                str(account["extension_token_jti"]),
                user_id=account.get("user_id"),
                provider_account_id=provider_account_id,
                expires_at=account.get("extension_token_expires_at"),
            )
        self._col("provider_accounts").document(provider_account_id).set(patch, merge=True)
        return self.get_provider_account(provider_account_id)

    def revoke_extension_token(
        self,
        jti: str,
        *,
        user_id: str | None = None,
        provider_account_id: str | None = None,
        expires_at: datetime | None = None,
    ) -> dict[str, Any]:
        payload = {
            "jti": jti,
            "user_id": user_id,
            "provider_account_id": provider_account_id,
            "expires_at": expires_at,
            "revoked_at": utcnow(),
        }
        self._col("extension_token_revocations").document(jti).set(payload, merge=True)
        payload["id"] = jti
        return payload

    def is_extension_token_revoked(self, jti: str) -> bool:
        doc = self._col("extension_token_revocations").document(jti).get()
        return doc.exists

    def create_api_log(
        self,
        *,
        user_id: str,
        provider_account_id: str,
        provider_slug: str,
        request_id: str | None,
        conversations: list[dict[str, Any]],
        source: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        api_log_id = make_uuid()
        payload = {
            "user_id": user_id,
            "provider_account_id": provider_account_id,
            "provider_slug": provider_slug,
            "request_id": request_id,
            "source": source,
            "conversations": conversations,
            "metadata": metadata or {},
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        self._col("api_logs").document(api_log_id).set(payload)
        payload["id"] = api_log_id
        return payload

    def create_usage_record(
        self,
        *,
        user_id: str,
        provider_account_id: str | None,
        provider_slug: str,
        model: str | None,
        prompt_tokens: int,
        completion_tokens: int,
        estimated_cost_usd: float,
        conversation_id: str | None,
        created_at: datetime | None = None,
    ) -> dict[str, Any]:
        usage_id = make_uuid()
        payload = {
            "user_id": user_id,
            "provider_account_id": provider_account_id,
            "provider_slug": provider_slug,
            "model": model,
            "prompt_tokens": int(prompt_tokens),
            "completion_tokens": int(completion_tokens),
            "estimated_cost_usd": float(estimated_cost_usd),
            "conversation_id": conversation_id,
            "created_at": created_at or utcnow(),
        }
        self._col("usage_records").document(usage_id).set(payload)
        payload["id"] = usage_id
        return payload

    def get_usage_summary(
        self,
        user_id: str,
        *,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> dict[str, Any]:
        docs = list(self._col("usage_records").where("user_id", "==", user_id).stream())
        items = [_with_id(doc) for doc in docs]
        if date_from:
            items = [item for item in items if item.get("created_at") and item["created_at"] >= date_from]
        if date_to:
            items = [item for item in items if item.get("created_at") and item["created_at"] <= date_to]

        provider_totals: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "provider_slug": None,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "estimated_cost_usd": 0.0,
                "call_count": 0,
            }
        )
        daily_totals: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "date": None,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "estimated_cost_usd": 0.0,
                "call_count": 0,
            }
        )

        totals = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "estimated_cost_usd": 0.0,
            "call_count": 0,
        }

        for item in items:
            created_at = item.get("created_at")
            provider_slug = str(item.get("provider_slug") or "unknown")
            cost = float(item.get("estimated_cost_usd") or 0.0)
            prompt_tokens = int(item.get("prompt_tokens") or 0)
            completion_tokens = int(item.get("completion_tokens") or 0)

            totals["prompt_tokens"] += prompt_tokens
            totals["completion_tokens"] += completion_tokens
            totals["estimated_cost_usd"] += cost
            totals["call_count"] += 1

            provider_bucket = provider_totals[provider_slug]
            provider_bucket["provider_slug"] = provider_slug
            provider_bucket["prompt_tokens"] += prompt_tokens
            provider_bucket["completion_tokens"] += completion_tokens
            provider_bucket["estimated_cost_usd"] += cost
            provider_bucket["call_count"] += 1

            if created_at:
                day_key = created_at.date().isoformat()
                daily_bucket = daily_totals[day_key]
                daily_bucket["date"] = created_at.date()
                daily_bucket["prompt_tokens"] += prompt_tokens
                daily_bucket["completion_tokens"] += completion_tokens
                daily_bucket["estimated_cost_usd"] += cost
                daily_bucket["call_count"] += 1

        return {
            "date_from": date_from,
            "date_to": date_to,
            "totals": totals,
            "by_provider": sorted(provider_totals.values(), key=lambda item: item["estimated_cost_usd"], reverse=True),
            "by_day": [daily_totals[key] for key in sorted(daily_totals.keys())],
        }

    def check_spend_cap(
        self,
        *,
        user_id: str,
        provider_account_id: str,
        monthly_cap_usd: float,
        as_of: datetime | None = None,
    ) -> dict[str, Any]:
        as_of = as_of or utcnow()
        month_start = as_of.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        docs = list(
            self._col("usage_records")
            .where("user_id", "==", user_id)
            .where("provider_account_id", "==", provider_account_id)
            .stream()
        )
        items = [_with_id(doc) for doc in docs]
        month_total = sum(
            float(item.get("estimated_cost_usd") or 0.0)
            for item in items
            if item.get("created_at") and item["created_at"] >= month_start
        )
        return {
            "monthly_cap_usd": float(monthly_cap_usd),
            "month_total_usd": round(month_total, 6),
            "remaining_usd": round(max(float(monthly_cap_usd) - month_total, 0.0), 6),
            "exceeded": month_total >= float(monthly_cap_usd),
            "month_start": month_start,
        }

    def list_api_logs(
        self,
        *,
        user_id: str,
        provider_account_id: str | None = None,
        provider_slug: str | None = None,
        since: datetime | None = None,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        query = self._col("api_logs").where("user_id", "==", user_id)
        if provider_account_id:
            query = query.where("provider_account_id", "==", provider_account_id)
        if provider_slug:
            query = query.where("provider_slug", "==", provider_slug)
        docs = list(query.stream())
        items = [_with_id(doc) for doc in docs]
        if since:
            items = [item for item in items if item.get("created_at") and item["created_at"] > since]
        items.sort(key=lambda item: item.get("created_at") or utcnow(), reverse=False)
        return items[:limit]

    def touch_session(self, session_id: str, *, last_seen_at: datetime | None = None) -> dict[str, Any] | None:
        patch = {"last_seen_at": last_seen_at or utcnow()}
        self._col("sessions").document(session_id).set(patch, merge=True)
        doc = self._col("sessions").document(session_id).get()
        return _with_id(doc) if doc.exists else None

    def create_audit_log(
        self,
        *,
        user_id: str | None,
        action: str,
        resource_type: str,
        resource_id: str | None,
        ip_address: str | None,
        user_agent: str | None,
        before_state: dict[str, Any] | None,
        after_state: dict[str, Any] | None,
    ) -> None:
        payload = {
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "before_state": before_state,
            "after_state": after_state,
            "created_at": utcnow(),
        }
        self._col("audit_logs").document(make_uuid()).set(payload)

    def slug_exists(self, slug: str) -> bool:
        docs = list(self._col("workspaces").where("slug", "==", slug).limit(1).stream())
        return bool(docs)

    def create_workspace(
        self,
        *,
        owner_id: str,
        name: str,
        slug: str,
        description: str | None = None,
        is_public: bool = False,
    ) -> dict[str, Any]:
        workspace_id = make_uuid()
        now = utcnow()
        payload = {
            "owner_id": owner_id,
            "slug": slug,
            "name": name,
            "description": description,
            "avatar_url": None,
            "plan": "free",
            "settings": {},
            "is_public": is_public,
            "created_at": now,
            "updated_at": now,
            "deleted_at": None,
        }
        self._col("workspaces").document(workspace_id).set(payload)
        payload["id"] = workspace_id
        self.add_workspace_member(
            workspace_id=workspace_id,
            user_id=owner_id,
            role="owner",
            invited_by=owner_id,
        )
        return payload

    def get_workspace(self, workspace_id: str) -> dict[str, Any] | None:
        doc = self._col("workspaces").document(workspace_id).get()
        return _with_id(doc) if doc.exists else None

    def update_workspace(self, workspace_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        patch["updated_at"] = utcnow()
        self._col("workspaces").document(workspace_id).set(patch, merge=True)
        return self.get_workspace(workspace_id)

    def add_workspace_member(
        self,
        *,
        workspace_id: str,
        user_id: str,
        role: str,
        invited_by: str | None,
    ) -> dict[str, Any]:
        docs = list(
            self._col("workspace_members")
            .where("workspace_id", "==", workspace_id)
            .where("user_id", "==", user_id)
            .limit(1)
            .stream()
        )
        if docs:
            doc = docs[0]
            doc.reference.set({"role": role, "invited_by": invited_by}, merge=True)
            return _with_id(doc.reference.get())

        member_id = make_uuid()
        payload = {
            "workspace_id": workspace_id,
            "user_id": user_id,
            "role": role,
            "invited_by": invited_by,
            "joined_at": utcnow(),
        }
        self._col("workspace_members").document(member_id).set(payload)
        payload["id"] = member_id
        return payload

    def remove_workspace_member(self, workspace_id: str, user_id: str) -> bool:
        docs = list(
            self._col("workspace_members")
            .where("workspace_id", "==", workspace_id)
            .where("user_id", "==", user_id)
            .limit(1)
            .stream()
        )
        if not docs:
            return False
        docs[0].reference.delete()
        return True

    def list_workspaces_for_user(self, user_id: str) -> list[dict[str, Any]]:
        owned_docs = list(
            self._col("workspaces")
            .where("owner_id", "==", user_id)
            .where("deleted_at", "==", None)
            .stream()
        )
        member_docs = list(
            self._col("workspace_members")
            .where("user_id", "==", user_id)
            .stream()
        )

        workspaces: dict[str, dict[str, Any]] = {
            doc.id: _with_id(doc)
            for doc in owned_docs
        }
        for member in member_docs:
            workspace_id = member.to_dict()["workspace_id"]
            if workspace_id in workspaces:
                continue
            workspace = self.get_workspace(workspace_id)
            if workspace and workspace.get("deleted_at") is None:
                workspaces[workspace_id] = workspace

        return sorted(workspaces.values(), key=lambda item: item["created_at"], reverse=True)

    def create_job(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        job_type: str,
        payload: dict[str, Any] | None,
        priority: int = 5,
    ) -> dict[str, Any]:
        job_id = make_uuid()
        data = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "job_type": job_type,
            "status": "queued",
            "priority": priority,
            "payload": payload or {},
            "result": None,
            "error_message": None,
            "progress": 0.0,
            "progress_detail": None,
            "attempts": 0,
            "max_attempts": 3,
            "celery_task_id": None,
            "scheduled_at": None,
            "started_at": None,
            "completed_at": None,
            "created_at": utcnow(),
        }
        self._col("jobs").document(job_id).set(data)
        data["id"] = job_id
        return data

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        doc = self._col("jobs").document(job_id).get()
        return _with_id(doc) if doc.exists else None

    def update_job(self, job_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        self._col("jobs").document(job_id).set(patch, merge=True)
        return self.get_job(job_id)

    def list_jobs(self, user_id: str, status_filter: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        docs = list(self._col("jobs").where("user_id", "==", user_id).stream())
        jobs = [_with_id(doc) for doc in docs]
        if status_filter:
            jobs = [job for job in jobs if job["status"] == status_filter]
        jobs.sort(key=lambda item: item["created_at"], reverse=True)
        return jobs[:limit]

    def create_conversation(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        provider_slug: str | None,
        external_id: str | None,
        title: str | None,
        summary: str | None,
        status: str,
        import_source: str | None,
        language: str | None,
        topics: list[str] | None,
        tags: list[str] | None,
        started_at: datetime | None,
        ended_at: datetime | None,
        metadata: dict[str, Any] | None,
    ) -> dict[str, Any]:
        conversation_id = make_uuid()
        now = utcnow()
        payload = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "provider_id": None,
            "provider_slug": provider_slug,
            "provider_name": self._provider_name(provider_slug),
            "external_id": external_id,
            "title": title,
            "summary": summary,
            "status": status,
            "session_status": "active",
            "knowledge_extraction_status": "pending",
            "import_source": import_source,
            "message_count": 0,
            "token_count": 0,
            "language": language,
            "topics": topics or [],
            "tags": tags or [],
            "folder_id": None,
            "is_pinned": False,
            "is_shared": False,
            "quality_score": None,
            "started_at": started_at,
            "ended_at": ended_at,
            "preview": None,
            "last_message_at": None,
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now,
            "deleted_at": None,
        }
        self._col("conversations").document(conversation_id).set(payload)
        payload["id"] = conversation_id
        return payload

    def get_conversation(self, conversation_id: str) -> dict[str, Any] | None:
        doc = self._col("conversations").document(conversation_id).get()
        return _with_id(doc) if doc.exists else None

    def get_conversation_by_external_id(self, user_id: str, external_id: str) -> dict[str, Any] | None:
        docs = list(
            self._col("conversations")
            .where("user_id", "==", user_id)
            .where("external_id", "==", external_id)
            .limit(1)
            .stream()
        )
        return _with_id(docs[0]) if docs else None

    def list_conversations(self, user_id: str) -> list[dict[str, Any]]:
        docs = list(self._col("conversations").where("user_id", "==", user_id).stream())
        items = [_with_id(doc) for doc in docs]
        return [item for item in items if item.get("deleted_at") is None]

    def update_conversation(self, conversation_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        patch["updated_at"] = utcnow()
        self._col("conversations").document(conversation_id).set(patch, merge=True)
        return self.get_conversation(conversation_id)

    def soft_delete_conversation(self, conversation_id: str) -> dict[str, Any] | None:
        patch = {"deleted_at": utcnow(), "status": "deleted", "updated_at": utcnow()}
        self._col("conversations").document(conversation_id).set(patch, merge=True)
        return self.get_conversation(conversation_id)

    def add_message(
        self,
        *,
        conversation_id: str,
        user_id: str,
        external_id: str | None,
        role: str,
        content: str,
        content_type: str,
        model: str | None,
        provider_slug: str | None = None,
        token_count: int,
        attachments: dict | list | None,
        tool_calls: dict | list | None,
        parent_id: str | None,
        sequence_num: int,
        created_at: datetime | None,
    ) -> dict[str, Any]:
        message_id = make_uuid()
        payload = {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "external_id": external_id,
            "role": role,
            "content": content,
            "content_type": content_type,
            "model": model,
            "provider_slug": provider_slug,
            "token_count": token_count,
            "attachments": attachments,
            "tool_calls": tool_calls,
            "parent_id": parent_id,
            "sequence_num": sequence_num,
            "created_at": created_at or utcnow(),
            "updated_at": utcnow(),
        }
        self._col("messages").document(message_id).set(payload)
        payload["id"] = message_id
        return payload

    def list_messages(self, conversation_id: str) -> list[dict[str, Any]]:
        docs = list(self._col("messages").where("conversation_id", "==", conversation_id).stream())
        items = [_with_id(doc) for doc in docs]
        items.sort(key=lambda item: item.get("sequence_num", 0))
        return items

    def update_conversation_message_stats(self, conversation_id: str) -> dict[str, Any] | None:
        messages = self.list_messages(conversation_id)
        preview = next((message["content"] for message in messages if message["content"].strip()), None)
        patch = {
            "message_count": len(messages),
            "token_count": sum(int(message.get("token_count") or 0) for message in messages),
            "preview": preview[:240] if preview else None,
            "last_message_at": messages[-1]["created_at"] if messages else None,
            "updated_at": utcnow(),
        }
        self._col("conversations").document(conversation_id).set(patch, merge=True)
        return self.get_conversation(conversation_id)

    def compute_overview_metrics(self, user_id: str) -> dict[str, Any]:
        conversations = self.list_conversations(user_id)
        total_conversations = len(conversations)
        total_messages = sum(int(conv.get("message_count") or 0) for conv in conversations)
        total_tokens = sum(int(conv.get("token_count") or 0) for conv in conversations)
        providers_used = len({conv.get("provider_slug") for conv in conversations if conv.get("provider_slug")})
        active_days = len(
            {
                (conv.get("started_at") or conv.get("created_at")).date().isoformat()
                for conv in conversations
                if conv.get("started_at") or conv.get("created_at")
            }
        )
        return {
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "total_tokens": total_tokens,
            "providers_used": providers_used,
            "avg_messages_per_conversation": round(total_messages / max(total_conversations, 1), 1),
            "active_days": active_days,
        }

    def provider_breakdown(self, user_id: str) -> list[dict[str, Any]]:
        conversations = self.list_conversations(user_id)
        accounts = self.list_provider_accounts(user_id)
        slug_to_name = {acc.get("provider_slug"): acc.get("display_name") for acc in accounts if acc.get("provider_slug")}
        
        totals = len(conversations) or 1
        grouped: dict[str, dict[str, Any]] = defaultdict(lambda: {"conversations": 0, "messages": 0, "tokens": 0})
        for conv in conversations:
            slug = conv.get("provider_slug")
            key = slug_to_name.get(slug) or conv.get("provider_name") or self._provider_name(slug)
            grouped[key]["conversations"] += 1
            grouped[key]["messages"] += int(conv.get("message_count") or 0)
            grouped[key]["tokens"] += int(conv.get("token_count") or 0)

        rows = []
        for provider, metrics in grouped.items():
            rows.append(
                {
                    "provider": provider,
                    "conversations": metrics["conversations"],
                    "messages": metrics["messages"],
                    "tokens": metrics["tokens"],
                    "percentage": round((metrics["conversations"] / totals) * 100, 1),
                }
            )
        rows.sort(key=lambda item: item["conversations"], reverse=True)
        return rows

    def topic_breakdown(self, user_id: str) -> list[dict[str, Any]]:
        conversations = self.list_conversations(user_id)
        counter: Counter[str] = Counter()
        for conversation in conversations:
            for topic in (conversation.get("topics") or conversation.get("tags") or []):
                if topic:
                    counter[str(topic)] += 1
        total = sum(counter.values()) or 1
        return [
            {
                "topic": topic,
                "count": count,
                "percentage": round((count / total) * 100, 1),
            }
            for topic, count in counter.most_common(10)
        ]

    def timeline(self, user_id: str) -> list[dict[str, Any]]:
        conversations = self.list_conversations(user_id)
        grouped: dict[str, dict[str, Any]] = defaultdict(lambda: {"conversations": 0, "messages": 0, "tokens": 0})
        for conv in conversations:
            stamp = conv.get("started_at") or conv.get("created_at")
            if not stamp:
                continue
            key = stamp.date().isoformat()
            grouped[key]["conversations"] += 1
            grouped[key]["messages"] += int(conv.get("message_count") or 0)
            grouped[key]["tokens"] += int(conv.get("token_count") or 0)

        return [
            {"date": datetime.fromisoformat(key).date(), **metrics}
            for key, metrics in sorted(grouped.items())
        ]

    def recent_activity(self, user_id: str, limit: int = 6) -> list[dict[str, Any]]:
        jobs = self.list_jobs(user_id, limit=limit * 2)
        activities = []
        for job in jobs:
            when = job.get("completed_at") or job.get("started_at") or job.get("created_at")
            label = job.get("progress_detail") or f"{job['job_type'].replace('_', ' ').title()} {job['status']}"
            activities.append(
                {
                    "title": label,
                    "time": when,
                    "status": job["status"],
                    "job_type": job["job_type"],
                }
            )
        activities.sort(key=lambda item: item["time"] or utcnow(), reverse=True)
        return activities[:limit]

    def provider_health(self, user_id: str) -> list[dict[str, Any]]:
        conversations = self.list_conversations(user_id)
        grouped: dict[str, dict[str, Any]] = defaultdict(lambda: {"count": 0, "last_message_at": None})
        for conv in conversations:
            provider = conv.get("provider_name") or self._provider_name(conv.get("provider_slug"))
            grouped[provider]["count"] += 1
            last_message_at = conv.get("last_message_at")
            if last_message_at and (
                grouped[provider]["last_message_at"] is None
                or last_message_at > grouped[provider]["last_message_at"]
            ):
                grouped[provider]["last_message_at"] = last_message_at

        rows = []
        for provider, value in grouped.items():
            rows.append(
                {
                    "provider": provider,
                    "status": "synced",
                    "conversation_count": value["count"],
                    "last_message_at": value["last_message_at"],
                }
            )
        rows.sort(key=lambda item: item["conversation_count"], reverse=True)
        return rows

    def create_artifact(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        title: str,
        artifact_type: str,
        source_ids: list[str],
        prompt: str | None,
        model_used: str | None = None,
    ) -> dict[str, Any]:
        artifact_id = make_uuid()
        now = utcnow()
        payload = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "title": title,
            "artifact_type": artifact_type,
            "status": "pending",
            "source_ids": source_ids,
            "prompt": prompt,
            "model_used": model_used,
            "content": None,
            "storage_key": None,
            "file_size": None,
            "version": 1,
            "is_public": False,
            "share_token": None,
            "error_message": None,
            "generation_ms": None,
            "metadata": {},
            "created_at": now,
            "updated_at": now,
            "deleted_at": None,
        }
        self._col("artifacts").document(artifact_id).set(payload)
        payload["id"] = artifact_id
        return payload

    def get_artifact(self, artifact_id: str) -> dict[str, Any] | None:
        doc = self._col("artifacts").document(artifact_id).get()
        return _with_id(doc) if doc.exists else None

    def list_artifacts(self, user_id: str) -> list[dict[str, Any]]:
        docs = list(self._col("artifacts").where("user_id", "==", user_id).stream())
        items = [_with_id(doc) for doc in docs]
        return [item for item in items if item.get("deleted_at") is None]

    def update_artifact(self, artifact_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        patch["updated_at"] = utcnow()
        self._col("artifacts").document(artifact_id).set(patch, merge=True)
        return self.get_artifact(artifact_id)

    def delete_artifact(self, artifact_id: str) -> dict[str, Any] | None:
        patch = {"deleted_at": utcnow(), "updated_at": utcnow()}
        self._col("artifacts").document(artifact_id).set(patch, merge=True)
        return self.get_artifact(artifact_id)

    def upsert_knowledge_node(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        label: str,
        node_type: str,
        description: str | None = None,
        source_ids: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        normalized_label = label.strip().lower()
        docs = list(
            self._col("knowledge_nodes")
            .where("user_id", "==", user_id)
            .where("label_normalized", "==", normalized_label)
            .limit(1)
            .stream()
        )
        if docs:
            doc = docs[0]
            current = doc.to_dict() or {}
            patch = {
                "occurrence_count": int(current.get("occurrence_count") or 0) + 1,
                "source_ids": sorted(set((current.get("source_ids") or []) + (source_ids or []))),
                "updated_at": utcnow(),
            }
            if description and not current.get("description"):
                patch["description"] = description
            doc.reference.set(patch, merge=True)
            return _with_id(doc.reference.get())

        node_id = make_uuid()
        payload = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "label": label,
            "label_normalized": normalized_label,
            "node_type": node_type,
            "description": description,
            "source_ids": source_ids or [],
            "occurrence_count": 1,
            "metadata": metadata or {},
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        self._col("knowledge_nodes").document(node_id).set(payload)
        payload["id"] = node_id
        return payload

    def list_knowledge_nodes(self, user_id: str, workspace_id: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
        query = self._col("knowledge_nodes").where("user_id", "==", user_id)
        if workspace_id:
            query = query.where("workspace_id", "==", workspace_id)
        docs = list(query.stream())
        items = [_with_id(doc) for doc in docs]
        items.sort(key=lambda item: item.get("occurrence_count", 0), reverse=True)
        return items[:limit]

    def list_knowledge_edges(self, user_id: str, workspace_id: str | None = None, limit: int = 500) -> list[dict[str, Any]]:
        nodes = self.list_knowledge_nodes(user_id, workspace_id=workspace_id, limit=1000)
        node_ids = {node["id"]: node for node in nodes}
        edges: list[dict[str, Any]] = []
        for source in nodes:
            tags = source.get("metadata", {}).get("related") if isinstance(source.get("metadata"), dict) else None
            if not tags:
                continue
            for target_label in tags:
                target = next((node for node in nodes if node.get("label") == target_label), None)
                if not target:
                    continue
                edges.append(
                    {
                        "id": make_uuid(),
                        "source_id": source["id"],
                        "target_id": target["id"],
                        "relationship": "related_to",
                        "weight": 1.0,
                        "evidence": {},
                        "created_at": utcnow(),
                    }
                )
        return edges[:limit]

    def _provider_name(self, slug: str | None) -> str | None:
        if not slug:
            return None
        mapping = {
            "chatgpt": "ChatGPT",
            "claude": "Claude",
            "gemini": "Gemini",
            "perplexity": "Perplexity",
            "grok": "Grok",
            "generic": "Generic",
        }
        return mapping.get(slug, slug.replace("_", " ").title())

    # ── Embedding storage ────────────────────────────────────────────────

    def store_embedding(
        self,
        *,
        message_id: str,
        conversation_id: str,
        user_id: str,
        workspace_id: str | None,
        chunk_index: int,
        chunk_text: str,
        vector: list[float],
        model: str,
        dimensions: int,
        provider_slug: str | None = None,
        created_at: datetime | None = None,
    ) -> dict[str, Any]:
        embedding_id = make_uuid()
        payload = {
            "message_id": message_id,
            "conversation_id": conversation_id,
            "user_id": user_id,
            "workspace_id": workspace_id,
            "chunk_index": chunk_index,
            "chunk_text": chunk_text,
            "vector": vector,
            "model": model,
            "dimensions": dimensions,
            "provider_slug": provider_slug,
            "created_at": created_at or utcnow(),
        }
        self._col("embeddings").document(embedding_id).set(payload)
        payload["id"] = embedding_id
        return payload

    def list_embeddings_for_user(
        self,
        user_id: str,
        *,
        workspace_id: str | None = None,
        provider_slug: str | None = None,
        conversation_ids: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Retrieve all embedding documents for a user (used by in-memory cosine search)."""
        query = self._col("embeddings").where("user_id", "==", user_id)
        if workspace_id:
            query = query.where("workspace_id", "==", workspace_id)
        if provider_slug:
            query = query.where("provider_slug", "==", provider_slug)
        docs = list(query.stream())
        items = [_with_id(doc) for doc in docs]
        if conversation_ids:
            id_set = set(conversation_ids)
            items = [item for item in items if item.get("conversation_id") in id_set]
        return items

    def list_embeddings_for_conversation(self, conversation_id: str) -> list[dict[str, Any]]:
        docs = list(self._col("embeddings").where("conversation_id", "==", conversation_id).stream())
        return [_with_id(doc) for doc in docs]

    def delete_embeddings_for_message(self, message_id: str) -> int:
        docs = list(self._col("embeddings").where("message_id", "==", message_id).stream())
        for doc in docs:
            doc.reference.delete()
        return len(docs)

    # ── Search history (for autocomplete suggestions) ────────────────────

    SEARCH_HISTORY_CAP = 50

    def record_search_query(self, *, user_id: str, query: str) -> None:
        """Store a search query for autocomplete, capped at 50 per user.

        Retention: only the most recent 50 queries are kept. Older entries
        are deleted automatically. This data is used exclusively for
        query-suggestion autocomplete and not for any other analytics.
        """
        entry_id = make_uuid()
        payload = {
            "user_id": user_id,
            "query": query.strip(),
            "created_at": utcnow(),
        }
        self._col("search_history").document(entry_id).set(payload)

        # Enforce cap
        docs = list(
            self._col("search_history")
            .where("user_id", "==", user_id)
            .stream()
        )
        items = [_with_id(doc) for doc in docs]
        items.sort(key=lambda item: item.get("created_at") or utcnow(), reverse=True)
        for old in items[self.SEARCH_HISTORY_CAP:]:
            self._col("search_history").document(old["id"]).delete()

    def list_search_history(self, user_id: str, *, prefix: str = "", limit: int = 10) -> list[str]:
        docs = list(
            self._col("search_history")
            .where("user_id", "==", user_id)
            .stream()
        )
        items = [_with_id(doc) for doc in docs]
        items.sort(key=lambda item: item.get("created_at") or utcnow(), reverse=True)
        seen: set[str] = set()
        result: list[str] = []
        prefix_lower = prefix.lower()
        for item in items:
            q = str(item.get("query") or "")
            key = q.lower()
            if prefix_lower and not key.startswith(prefix_lower):
                continue
            if key in seen:
                continue
            seen.add(key)
            result.append(q)
            if len(result) >= limit:
                break
        return result

    # ── Duplicate pairs ──────────────────────────────────────────────────

    def create_duplicate_pair(
        self,
        *,
        user_id: str,
        conv_a_id: str,
        conv_b_id: str,
        similarity: float,
        detection_method: str,
    ) -> dict[str, Any]:
        pair_id = make_uuid()
        payload = {
            "user_id": user_id,
            "conv_a_id": conv_a_id,
            "conv_b_id": conv_b_id,
            "similarity": similarity,
            "detection_method": detection_method,
            "is_confirmed": True,
            "resolved_at": None,
            "resolution": None,
            "created_at": utcnow(),
        }
        self._col("duplicate_pairs").document(pair_id).set(payload)
        payload["id"] = pair_id
        return payload

    def list_duplicate_pairs(self, user_id: str) -> list[dict[str, Any]]:
        docs = list(self._col("duplicate_pairs").where("user_id", "==", user_id).stream())
        items = [_with_id(doc) for doc in docs]
        items = [item for item in items if item.get("is_confirmed") is True and item.get("resolved_at") is None]
        items.sort(key=lambda item: item.get("similarity", 0), reverse=True)
        return items

    def get_duplicate_pair(self, pair_id: str) -> dict[str, Any] | None:
        doc = self._col("duplicate_pairs").document(pair_id).get()
        return _with_id(doc) if doc.exists else None

    def resolve_duplicate_pair(self, pair_id: str, *, resolution: str) -> dict[str, Any] | None:
        patch = {
            "resolved_at": utcnow(),
            "resolution": resolution,
        }
        if resolution == "dismiss":
            patch["is_confirmed"] = False
        self._col("duplicate_pairs").document(pair_id).set(patch, merge=True)
        return self.get_duplicate_pair(pair_id)

    def merge_conversations(self, *, keep_id: str, remove_id: str) -> dict[str, Any] | None:
        """Merge messages from remove_id into keep_id, then soft-delete remove_id."""
        keep = self.get_conversation(keep_id)
        remove = self.get_conversation(remove_id)
        if not keep or not remove:
            return None

        keep_messages = self.list_messages(keep_id)
        remove_messages = self.list_messages(remove_id)
        next_seq = (max((int(m.get("sequence_num") or 0) for m in keep_messages), default=0) + 1)

        for i, msg in enumerate(remove_messages):
            self.add_message(
                conversation_id=keep_id,
                user_id=msg["user_id"],
                external_id=msg.get("external_id"),
                role=msg["role"],
                content=msg["content"],
                content_type=msg.get("content_type", "text"),
                model=msg.get("model"),
                token_count=int(msg.get("token_count") or 0),
                attachments=msg.get("attachments"),
                tool_calls=msg.get("tool_calls"),
                parent_id=None,
                sequence_num=next_seq + i,
                created_at=msg.get("created_at"),
            )

        self.soft_delete_conversation(remove_id)
        self.update_conversation_message_stats(keep_id)
        return self.get_conversation(keep_id)

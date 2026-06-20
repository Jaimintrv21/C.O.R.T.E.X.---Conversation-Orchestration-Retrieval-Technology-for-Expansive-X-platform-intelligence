"""Migrate legacy Firestore users to Auth0 sub-based identities.

This script is resumable and idempotent:
- It records progress in `user_migrations/{legacy_user_id}`.
- It reuses an existing Auth0 user if one already exists for the email.
- It copies the Firestore user document to the new Auth0 `sub` as the doc id.
- It rewrites known foreign-key style references in Firestore collections.

Run from the repository root:
    python scripts/migrate_existing_users_to_auth0.py --dry-run
    python scripts/migrate_existing_users_to_auth0.py
"""
from __future__ import annotations

import argparse
import secrets
import sys
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parents[1]
API_ROOT = ROOT / "apps" / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.config import get_settings
from app.firestore import FirestoreStore, utcnow


@dataclass(slots=True)
class Auth0UserRecord:
    user_id: str
    email: str


class Auth0ManagementClient:
    def __init__(self, settings) -> None:
        self.settings = settings
        self._client = httpx.Client(timeout=30.0)
        self._token: str | None = None
        self._token_expires_at: datetime | None = None

    @property
    def issuer(self) -> str:
        return f"https://{self.settings.auth0_domain}"

    @property
    def audience(self) -> str:
        return f"{self.issuer}/api/v2/"

    def close(self) -> None:
        self._client.close()

    def _get_token(self) -> str:
        now = datetime.now(UTC)
        if self._token and self._token_expires_at and now < self._token_expires_at:
            return self._token

        response = self._client.post(
            f"{self.issuer}/oauth/token",
            json={
                "grant_type": "client_credentials",
                "client_id": self.settings.auth0_client_id,
                "client_secret": self.settings.auth0_client_secret,
                "audience": self.audience,
            },
        )
        response.raise_for_status()
        payload = response.json()
        self._token = str(payload["access_token"])
        expires_in = int(payload.get("expires_in", 3600))
        self._token_expires_at = now.replace(microsecond=0) + timedelta(seconds=max(60, expires_in - 30))
        return self._token

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._get_token()}"}

    def find_user_by_email(self, email: str) -> Auth0UserRecord | None:
        response = self._client.get(
            f"{self.issuer}/api/v2/users-by-email",
            params={"email": email},
            headers=self._headers(),
        )
        response.raise_for_status()
        users = response.json()
        if not users:
            return None
        user = users[0]
        return Auth0UserRecord(user_id=str(user["user_id"]), email=str(user.get("email") or email))

    def create_database_user(self, *, email: str, password: str, app_metadata: dict[str, Any]) -> Auth0UserRecord:
        response = self._client.post(
            f"{self.issuer}/api/v2/users",
            headers=self._headers(),
            json={
                "connection": self.settings.auth0_database_connection,
                "email": email,
                "password": password,
                "email_verified": False,
                "verify_email": False,
                "app_metadata": app_metadata,
            },
        )
        response.raise_for_status()
        user = response.json()
        return Auth0UserRecord(user_id=str(user["user_id"]), email=str(user.get("email") or email))

    def create_password_change_ticket(self, user_id: str) -> str:
        response = self._client.post(
            f"{self.issuer}/api/v2/tickets/password-change",
            headers=self._headers(),
            json={
                "user_id": user_id,
                "ttl_sec": 60 * 60 * 24 * 30,
            },
        )
        response.raise_for_status()
        payload = response.json()
        return str(payload.get("ticket") or payload.get("ticket_url") or "")


def _migration_doc_id(legacy_user_id: str) -> str:
    return legacy_user_id


def _migration_record_ref(store: FirestoreStore, legacy_user_id: str):
    return store.db.collection("user_migrations").document(_migration_doc_id(legacy_user_id))


def _doc_data(snapshot) -> dict[str, Any]:
    return snapshot.to_dict() or {}


def _rewrite_documents(
    store: FirestoreStore,
    *,
    collection: str,
    old_user_id: str,
    new_user_id: str,
    fields: list[str],
    dry_run: bool,
) -> int:
    updated: set[str] = set()
    count = 0
    for field in fields:
        docs = list(store.db.collection(collection).where(field, "==", old_user_id).stream())
        for doc in docs:
            if doc.id in updated:
                continue
            patch = {field: new_user_id, "updated_at": utcnow()}
            if not dry_run:
                doc.reference.set(patch, merge=True)
            updated.add(doc.id)
            count += 1
    return count


def _copy_user_document(store: FirestoreStore, old_user_id: str, new_user_id: str, migration_meta: dict[str, Any], dry_run: bool) -> None:
    old_ref = store.db.collection("users").document(old_user_id)
    old_snap = old_ref.get()
    if not old_snap.exists:
        return

    payload = _doc_data(old_snap)
    payload.update(
        {
            "id": new_user_id,
            "auth0_subject": new_user_id,
            "migrated_to_auth0": True,
            "migration_state": migration_meta,
            "last_login_at": payload.get("last_login_at") or utcnow(),
            "updated_at": utcnow(),
        }
    )
    payload.pop("hashed_password", None)
    payload.pop("totp_secret", None)
    payload.pop("password_hash", None)

    if not dry_run:
        store.db.collection("users").document(new_user_id).set(payload, merge=True)


def migrate_user(store: FirestoreStore, auth0: Auth0ManagementClient, legacy_user_id: str, *, dry_run: bool = False) -> dict[str, Any]:
    old_snap = store.db.collection("users").document(legacy_user_id).get()
    if not old_snap.exists:
        return {"legacy_user_id": legacy_user_id, "status": "skipped", "reason": "legacy user missing"}

    old_user = _doc_data(old_snap)
    email = str(old_user.get("email") or "").lower()
    if not email:
        raise ValueError(f"Legacy user {legacy_user_id} is missing email")

    migration_ref = _migration_record_ref(store, legacy_user_id)
    migration_snap = migration_ref.get()
    migration = _doc_data(migration_snap) if migration_snap.exists else {}

    if migration.get("status") == "completed" and migration.get("new_user_id"):
        return {"legacy_user_id": legacy_user_id, "new_user_id": migration["new_user_id"], "status": "already_completed"}

    now = utcnow()
    migration.setdefault("legacy_user_id", legacy_user_id)
    migration.setdefault("status", "started")
    migration["updated_at"] = now
    migration["started_at"] = migration.get("started_at") or now

    if not dry_run:
        migration_ref.set(migration, merge=True)

    existing_auth0 = auth0.find_user_by_email(email)
    if existing_auth0:
        new_user_id = existing_auth0.user_id
        auth0_created = False
    elif dry_run:
        new_user_id = f"auth0|dryrun-{legacy_user_id}"
        auth0_created = False
    else:
        temporary_password = secrets.token_urlsafe(32)
        existing_role = old_user.get("role") or "user"
        existing_workspace = old_user.get("primary_workspace_id")
        created = auth0.create_database_user(
            email=email,
            password=temporary_password,
            app_metadata={
                "roles": [existing_role],
                "workspace_id": existing_workspace,
                "legacy_user_id": legacy_user_id,
            },
        )
        new_user_id = created.user_id
        auth0_created = True

    migration["new_user_id"] = new_user_id
    migration["auth0_created"] = auth0_created
    migration["password_reset_ticket"] = None
    if not dry_run:
        migration["password_reset_ticket"] = auth0.create_password_change_ticket(new_user_id)
    migration["status"] = "auth0_ready"
    migration["updated_at"] = utcnow()
    if not dry_run:
        migration_ref.set(migration, merge=True)

    migration_meta = {
        "legacy_user_id": legacy_user_id,
        "new_user_id": new_user_id,
        "migrated_at": utcnow(),
        "migration_id": migration_ref.id,
    }
    _copy_user_document(store, legacy_user_id, new_user_id, migration_meta, dry_run)

    collections = {
        "conversations": ["user_id"],
        "messages": ["user_id"],
        "jobs": ["user_id"],
        "artifacts": ["user_id"],
        "knowledge_nodes": ["user_id"],
        "sessions": ["user_id"],
        "audit_logs": ["user_id"],
        "workspaces": ["owner_id"],
        "workspace_members": ["user_id", "invited_by"],
    }
    updates = {
        collection: _rewrite_documents(
            store,
            collection=collection,
            old_user_id=legacy_user_id,
            new_user_id=new_user_id,
            fields=fields,
            dry_run=dry_run,
        )
        for collection, fields in collections.items()
    }

    if not dry_run:
        if store.db.collection("users").document(new_user_id).get().exists:
            old_snap.reference.delete()
        migration_ref.set(
            {
                "status": "completed",
                "completed_at": utcnow(),
                "new_user_id": new_user_id,
                "collection_updates": updates,
                "updated_at": utcnow(),
            },
            merge=True,
        )

    return {
        "legacy_user_id": legacy_user_id,
        "new_user_id": new_user_id,
        "status": "completed" if not dry_run else "dry_run",
        "collection_updates": updates,
        "auth0_created": auth0_created,
    }


def iter_legacy_users(store: FirestoreStore, limit: int | None = None) -> list[str]:
    docs = list(store.db.collection("users").stream())
    user_ids: list[str] = []
    for doc in docs:
        if doc.id.startswith("auth0|") or doc.id.startswith("google-oauth2|") or doc.id.startswith("github|"):
            continue
        payload = doc.to_dict() or {}
        if payload.get("migrated_to_auth0"):
            continue
        user_ids.append(doc.id)
    user_ids.sort()
    if limit is not None:
        return user_ids[:limit]
    return user_ids


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate legacy Firestore users to Auth0 sub IDs.")
    parser.add_argument("--dry-run", action="store_true", help="Plan the migration without writing changes.")
    parser.add_argument("--limit", type=int, default=None, help="Limit the number of users migrated.")
    parser.add_argument("--user-id", action="append", dest="user_ids", help="Migrate only the specified legacy user id(s).")
    args = parser.parse_args()

    settings = get_settings()
    if not settings.auth0_domain or not settings.auth0_client_id or not settings.auth0_client_secret:
        raise SystemExit("Auth0 settings are missing. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET.")

    store = FirestoreStore()
    auth0 = Auth0ManagementClient(settings)
    try:
        if args.user_ids:
            user_ids = args.user_ids
        else:
            user_ids = iter_legacy_users(store, limit=args.limit)

        for legacy_user_id in user_ids:
            result = migrate_user(store, auth0, legacy_user_id, dry_run=args.dry_run)
            print(result)
        return 0
    finally:
        auth0.close()


if __name__ == "__main__":
    raise SystemExit(main())

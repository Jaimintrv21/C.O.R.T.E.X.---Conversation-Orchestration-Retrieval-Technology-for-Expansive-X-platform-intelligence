"""Firebase Admin and Firestore helpers."""
from __future__ import annotations

import json
import uuid
from collections import Counter, defaultdict
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore

from app.config import get_settings


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

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        docs = list(self._col("users").where("email", "==", email.lower()).limit(1).stream())
        return _with_id(docs[0]) if docs else None

    def get_user_by_username(self, username: str) -> dict[str, Any] | None:
        docs = list(self._col("users").where("username", "==", username).limit(1).stream())
        return _with_id(docs[0]) if docs else None

    def get_user(self, user_id: str) -> dict[str, Any] | None:
        doc = self._col("users").document(user_id).get()
        return _with_id(doc) if doc.exists else None

    def create_user(self, *, email: str, username: str, display_name: str, hashed_password: str) -> dict[str, Any]:
        user_id = make_uuid()
        now = utcnow()
        payload = {
            "email": email.lower(),
            "username": username,
            "display_name": display_name,
            "hashed_password": hashed_password,
            "avatar_url": None,
            "role": "user",
            "is_active": True,
            "is_verified": False,
            "totp_secret": None,
            "preferences": {},
            "storage_quota": 5_368_709_120,
            "storage_used": 0,
            "encryption_mode": "envelope",
            "last_login_at": None,
            "created_at": now,
            "updated_at": now,
            "deleted_at": None,
        }
        self._col("users").document(user_id).set(payload)
        payload["id"] = user_id
        return payload

    def update_user(self, user_id: str, patch: dict[str, Any]) -> None:
        patch["updated_at"] = utcnow()
        self._col("users").document(user_id).set(patch, merge=True)

    def create_session(
        self,
        *,
        user_id: str,
        token_hash: str,
        ip_address: str | None,
        user_agent: str | None,
        expires_at: datetime,
    ) -> dict[str, Any]:
        session_id = make_uuid()
        payload = {
            "user_id": user_id,
            "token_hash": token_hash,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "expires_at": expires_at,
            "revoked_at": None,
            "created_at": utcnow(),
        }
        self._col("sessions").document(session_id).set(payload)
        payload["id"] = session_id
        return payload

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
        totals = len(conversations) or 1
        grouped: dict[str, dict[str, Any]] = defaultdict(lambda: {"conversations": 0, "messages": 0, "tokens": 0})
        for conv in conversations:
            key = conv.get("provider_name") or self._provider_name(conv.get("provider_slug"))
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

"""Artifact generation orchestration."""
from __future__ import annotations

import json
import time
from collections import Counter

import structlog

from app.config import Settings, get_settings
from app.firestore import FirestoreStore
from app.services.llm_service import LLMGenerationRequest, LLMRouterService
from app.services.storage_service import StorageService

logger = structlog.get_logger()

TEMPLATE_MATRIX = {
    ("wiki", "general"): "wiki_reference",
    ("report", "general"): "report_summary",
    ("presentation", "general"): "deck_outline",
}


class ArtifactGenerationService:
    def __init__(
        self,
        store: FirestoreStore | None = None,
        settings: Settings | None = None,
        llm_router: LLMRouterService | None = None,
        storage: StorageService | None = None,
    ) -> None:
        self.store = store or FirestoreStore()
        self.settings = settings or get_settings()
        self.llm_router = llm_router or LLMRouterService(self.settings)
        self.storage = storage or StorageService(self.settings)

    async def generate(self, artifact_id: str, model: str | None = None) -> dict[str, str]:
        artifact = self.store.get_artifact(artifact_id)
        if not artifact:
            raise ValueError(f"Artifact {artifact_id} not found")

        started = time.perf_counter()
        self.store.update_artifact(artifact_id, {"status": "running", "error_message": None})

        try:
            conversations = [
                self.store.get_conversation(source_id)
                for source_id in (artifact.get("source_ids") or [])
            ]
            conversations = [conv for conv in conversations if conv]
            facts = self._extract_facts(conversations)
            intent = self._detect_intent(artifact["artifact_type"], facts)
            template = self._select_template(artifact["artifact_type"], intent)

            payload = await self.llm_router.generate_structured(
                LLMGenerationRequest(
                    task_type="artifact_generation",
                    model=model,
                    prompt=self._build_prompt(artifact, facts, template),
                    system_prompt=(
                        "Generate a structured artifact payload for downstream rendering. "
                        "Prefer concise, factual sections over marketing language."
                    ),
                    output_schema={
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "summary": {"type": "string"},
                            "sections": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "heading": {"type": "string"},
                                        "body": {"type": "string"},
                                    },
                                    "required": ["heading", "body"],
                                },
                            },
                            "action_items": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                        "required": ["title", "summary", "sections"],
                    },
                    local_only=self.settings.ai_local_only,
                )
            )

            rendered = self._render_artifact(artifact["artifact_type"], payload)
            storage_key = None
            try:
                storage_key = self.storage.store_bytes(
                    key=f"{self.settings.artifact_storage_prefix}/{artifact_id}.json",
                    data=json.dumps(rendered, ensure_ascii=True, indent=2).encode("utf-8"),
                    content_type="application/json",
                )
            except Exception:
                storage_key = None

            updated = self.store.update_artifact(
                artifact_id,
                {
                    "status": "ready",
                    "model_used": model or self.llm_router.resolve_model("artifact_generation"),
                    "content": rendered,
                    "storage_key": storage_key,
                    "file_size": len(json.dumps(rendered).encode("utf-8")),
                    "generation_ms": int((time.perf_counter() - started) * 1000),
                    "metadata": {
                        "intent": intent,
                        "template": template,
                        "sources": [conv["id"] for conv in conversations],
                    },
                },
            )
            return {"artifact_id": artifact_id, "status": updated["status"] if updated else "ready"}
        except Exception as exc:
            self.store.update_artifact(
                artifact_id,
                {
                    "status": "failed",
                    "error_message": str(exc),
                    "generation_ms": int((time.perf_counter() - started) * 1000),
                },
            )
            logger.error("artifact_generation_failed", artifact_id=artifact_id, error=str(exc))
            raise

    def _extract_facts(self, conversations: list[dict]) -> dict:
        top_terms: Counter[str] = Counter()
        decisions: list[str] = []
        message_total = 0

        for conversation in conversations:
            messages = self.store.list_messages(conversation["id"])
            for message in messages:
                message_total += 1
                words = [word.strip(".,:;!?()[]{}").lower() for word in message["content"].split()]
                top_terms.update(word for word in words if len(word) > 4)
                lowered = message["content"].lower()
                if any(marker in lowered for marker in ("decide", "decision", "agreed", "next step")):
                    decisions.append(message["content"][:240])

        return {
            "conversation_count": len(conversations),
            "message_count": message_total,
            "top_terms": [term for term, _ in top_terms.most_common(12)],
            "decisions": decisions[:10],
            "titles": [conversation.get("title") for conversation in conversations if conversation.get("title")],
        }

    def _detect_intent(self, artifact_type: str, facts: dict) -> str:
        if artifact_type in {"wiki", "report", "presentation"}:
            return "general"
        if facts.get("decisions"):
            return "decision_log"
        return "general"

    def _select_template(self, artifact_type: str, intent: str) -> str:
        return TEMPLATE_MATRIX.get(
            (artifact_type, intent),
            TEMPLATE_MATRIX.get((artifact_type, "general"), "report_summary"),
        )

    def _build_prompt(self, artifact: dict, facts: dict, template: str) -> str:
        prompt = {
            "artifact_type": artifact["artifact_type"],
            "title": artifact["title"],
            "template": template,
            "user_prompt": artifact.get("prompt"),
            "facts": facts,
        }
        return json.dumps(prompt, indent=2, sort_keys=True)

    def _render_artifact(self, artifact_type: str, payload: dict) -> dict:
        sections = payload.get("sections", [])
        markdown = [f"# {payload.get('title', 'Untitled')}", "", payload.get("summary", "")]
        for section in sections:
            markdown.extend(
                [
                    "",
                    f"## {section.get('heading', 'Section')}",
                    section.get("body", ""),
                ]
            )

        return {
            "artifact_type": artifact_type,
            "format": "markdown",
            "markdown": "\n".join(markdown).strip(),
            "payload": payload,
        }

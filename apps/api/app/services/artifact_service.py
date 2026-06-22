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
                        "source_provider_breakdown": facts["source_provider_breakdown"],
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
        MAX_TOTAL_CHARS = 100000  # Budget: ~25k tokens
        
        # Build the initial list of raw message content per conversation
        convo_data = []
        source_provider_breakdown = Counter()
        
        for conversation in conversations:
            messages = self.store.list_messages(conversation["id"])
            provider = conversation.get("provider_slug", "unknown")
            source_provider_breakdown[provider] += 1
            
            # Sort messages chronologically
            messages.sort(key=lambda m: m["created_at"])
            raw_text = []
            for m in messages:
                role = m.get("role", "user")
                created = m.get("created_at")
                created_str = created.isoformat() if hasattr(created, "isoformat") else str(created)
                provider_tag = m.get("provider_slug", provider)
                raw_text.append(f"[{created_str}] [{provider_tag}] {role.upper()}: {m['content']}")
            
            full_text = "\n".join(raw_text)
            convo_data.append({
                "id": conversation["id"],
                "title": conversation.get("title", "Untitled"),
                "provider": provider,
                "message_count": len(messages),
                "created_at": conversation.get("created_at"),
                "full_text": full_text,
                "char_length": len(full_text),
                "summary": None,
            })
            
        # Priority sort: Highest priority first (most messages, newest)
        convo_data.sort(key=lambda c: (c["message_count"], c["created_at"]), reverse=True)
        
        # Enforce budget by summarizing-down lowest priority if needed
        total_chars = sum(c["char_length"] for c in convo_data)
        if total_chars > MAX_TOTAL_CHARS:
            # We need to shrink. Process from lowest priority (end of list)
            for i in range(len(convo_data) - 1, -1, -1):
                if total_chars <= MAX_TOTAL_CHARS:
                    break
                # Mock summarize-down
                # In a real app we would call LLM to summarize this specific conversation block
                # Here we simulate by aggressively truncating and appending a summarization note
                c = convo_data[i]
                old_len = c["char_length"]
                target_len = min(500, old_len)
                c["full_text"] = "[SUMMARIZED TO FIT CONTEXT] " + c["full_text"][:target_len] + "... [END SUMMARY]"
                c["char_length"] = len(c["full_text"])
                total_chars = total_chars - old_len + c["char_length"]

        # Assemble the formatted sources
        sources_text = []
        for c in convo_data:
            sources_text.append(
                f"=== CONVERSATION SOURCE ===\n"
                f"Title: {c['title']}\n"
                f"Primary AI Provider: {c['provider']}\n"
                f"Date: {c['created_at']}\n"
                f"Content:\n{c['full_text']}\n"
                f"===========================\n"
            )

        return {
            "conversation_count": len(conversations),
            "source_provider_breakdown": dict(source_provider_breakdown),
            "sources_formatted_text": "\n".join(sources_text),
        }

    def _detect_intent(self, artifact_type: str, facts: dict) -> str:
        if artifact_type in {"wiki", "report", "presentation"}:
            return "general"
        return "general"

    def _select_template(self, artifact_type: str, intent: str) -> str:
        return TEMPLATE_MATRIX.get(
            (artifact_type, intent),
            TEMPLATE_MATRIX.get((artifact_type, "general"), "report_summary"),
        )

    def _build_prompt(self, artifact: dict, facts: dict, template: str) -> str:
        prompt = (
            f"You are tasked with generating a {artifact['artifact_type']} ({template}).\n"
            f"Title: {artifact['title']}\n"
            f"User Prompt: {artifact.get('prompt') or 'Generate a comprehensive artifact based on the provided sources.'}\n\n"
            f"Below are the source conversations you MUST synthesize and attribute correctly:\n\n"
            f"{facts['sources_formatted_text']}\n\n"
            "When writing the artifact, be sure to explicitly attribute information to the source provider (e.g., 'As discussed with ChatGPT...' or 'Based on the Claude conversation...')."
        )
        return prompt

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

"""Embedding pipeline helpers for chunking, batching, and local/cloud routing."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Protocol

from app.config import Settings, get_settings


@dataclass(slots=True)
class EmbeddingChunk:
    conversation_id: str
    message_id: str
    chunk_index: int
    text: str
    token_count: int


@dataclass(slots=True)
class EmbeddingBatchResult:
    model: str
    dimensions: int
    chunks: list[EmbeddingChunk]
    vectors: list[list[float]]


class EmbeddingBackend(Protocol):
    async def encode(self, texts: list[str], model: str) -> list[list[float]]:
        """Encode texts into vectors."""


class SentenceTransformerBackend:
    """Lazy local embedding backend."""

    def __init__(self) -> None:
        self._models: dict[str, object] = {}

    async def encode(self, texts: list[str], model: str) -> list[list[float]]:
        encoder = await self._get_model(model)

        def _encode() -> list[list[float]]:
            vectors = encoder.encode(texts, normalize_embeddings=True)
            return [list(map(float, row)) for row in vectors]

        return await asyncio.to_thread(_encode)

    async def _get_model(self, model: str):
        if model in self._models:
            return self._models[model]

        def _load():
            from sentence_transformers import SentenceTransformer

            return SentenceTransformer(model)

        self._models[model] = await asyncio.to_thread(_load)
        return self._models[model]


class LiteLLMEmbeddingBackend:
    """Cloud fallback backend through LiteLLM."""

    async def encode(self, texts: list[str], model: str) -> list[list[float]]:
        try:
            from litellm import aembedding
        except ImportError as exc:
            raise RuntimeError("LiteLLM is required for cloud embedding fallback") from exc

        response = await aembedding(model=model, input=texts)
        return [list(map(float, item["embedding"])) for item in response["data"]]


class EmbeddingService:
    def __init__(
        self,
        settings: Settings | None = None,
        local_backend: EmbeddingBackend | None = None,
        cloud_backend: EmbeddingBackend | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.local_backend = local_backend or SentenceTransformerBackend()
        self.cloud_backend = cloud_backend or LiteLLMEmbeddingBackend()

    def chunk_text(
        self,
        text: str,
        *,
        chunk_size: int | None = None,
        overlap: int | None = None,
    ) -> list[tuple[str, int]]:
        chunk_size = chunk_size or self.settings.embedding_chunk_size_tokens
        overlap = overlap if overlap is not None else self.settings.embedding_chunk_overlap_tokens
        if chunk_size <= 0:
            raise ValueError("chunk_size must be positive")
        if overlap < 0 or overlap >= chunk_size:
            raise ValueError("overlap must be between 0 and chunk_size - 1")

        tokens = text.split()
        if not tokens:
            return []

        step = chunk_size - overlap
        chunks: list[tuple[str, int]] = []
        for start in range(0, len(tokens), step):
            window = tokens[start : start + chunk_size]
            if not window:
                continue
            chunks.append((" ".join(window), len(window)))
            if start + chunk_size >= len(tokens):
                break
        return chunks

    def build_message_chunks(self, messages: list[object]) -> list[EmbeddingChunk]:
        chunks: list[EmbeddingChunk] = []
        for message in messages:
            content = str(getattr(message, "content", "") or "").strip()
            if not content:
                continue

            message_id = str(getattr(message, "id"))
            conversation_id = str(getattr(message, "conversation_id"))
            for chunk_index, (chunk_text, token_count) in enumerate(self.chunk_text(content)):
                chunks.append(
                    EmbeddingChunk(
                        conversation_id=conversation_id,
                        message_id=message_id,
                        chunk_index=chunk_index,
                        text=chunk_text,
                        token_count=token_count,
                    )
                )
        return chunks

    async def embed_chunks(
        self,
        chunks: list[EmbeddingChunk],
        *,
        model: str | None = None,
        prefer_cloud: bool = False,
        local_only: bool | None = None,
    ) -> EmbeddingBatchResult:
        resolved_model = model or self.settings.embedding_model
        local_only = self.settings.ai_local_only if local_only is None else local_only
        texts = [chunk.text for chunk in chunks]
        vectors = await self._encode_batches(
            texts,
            model=resolved_model,
            prefer_cloud=prefer_cloud,
            local_only=local_only,
        )
        return EmbeddingBatchResult(
            model=resolved_model,
            dimensions=self._dimensions_for_model(resolved_model),
            chunks=chunks,
            vectors=vectors,
        )

    async def _encode_batches(
        self,
        texts: list[str],
        *,
        model: str,
        prefer_cloud: bool,
        local_only: bool,
    ) -> list[list[float]]:
        if not texts:
            return []

        backend_order = self._backend_order(prefer_cloud=prefer_cloud, local_only=local_only)
        batch_size = self.settings.embedding_batch_size
        last_error: Exception | None = None

        for backend_name in backend_order:
            backend = self.cloud_backend if backend_name == "cloud" else self.local_backend
            vectors: list[list[float]] = []
            try:
                for start in range(0, len(texts), batch_size):
                    batch = texts[start : start + batch_size]
                    vectors.extend(await backend.encode(batch, model))
                return vectors
            except Exception as exc:
                last_error = exc
                if local_only:
                    break

        raise RuntimeError("Embedding generation failed") from last_error

    def _backend_order(self, *, prefer_cloud: bool, local_only: bool) -> list[str]:
        if local_only:
            return ["local"]
        return ["cloud", "local"] if prefer_cloud else ["local", "cloud"]

    def _dimensions_for_model(self, model: str) -> int:
        if model == self.settings.embedding_high_quality_model:
            return self.settings.embedding_high_quality_dimensions
        return self.settings.embedding_dimensions

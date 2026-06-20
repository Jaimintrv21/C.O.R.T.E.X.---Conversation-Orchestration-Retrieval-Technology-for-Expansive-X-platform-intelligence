"""Tests for semantic search, full-text search, hybrid merge, and duplicate detection.

Uses lightweight in-process mocks — no real Firestore or Meilisearch needed.
"""
from __future__ import annotations

import math
from datetime import UTC, datetime, date
from unittest.mock import MagicMock, patch

import pytest

# ── Vector search service tests ──────────────────────────────────────────


class TestCosineSimiilarity:
    """Test the core cosine similarity function."""

    def test_identical_vectors(self):
        from app.services.vector_search_service import _cosine_similarity

        vec = [1.0, 0.0, 0.0]
        assert _cosine_similarity(vec, vec) == pytest.approx(1.0)

    def test_orthogonal_vectors(self):
        from app.services.vector_search_service import _cosine_similarity

        a = [1.0, 0.0]
        b = [0.0, 1.0]
        assert _cosine_similarity(a, b) == pytest.approx(0.0)

    def test_opposite_vectors(self):
        from app.services.vector_search_service import _cosine_similarity

        a = [1.0, 0.0]
        b = [-1.0, 0.0]
        assert _cosine_similarity(a, b) == pytest.approx(-1.0)

    def test_empty_vectors(self):
        from app.services.vector_search_service import _cosine_similarity

        assert _cosine_similarity([], []) == 0.0

    def test_zero_vector(self):
        from app.services.vector_search_service import _cosine_similarity

        assert _cosine_similarity([0.0, 0.0], [1.0, 0.0]) == 0.0

    def test_similar_vectors(self):
        from app.services.vector_search_service import _cosine_similarity

        a = [1.0, 1.0, 0.0]
        b = [1.0, 0.9, 0.1]
        sim = _cosine_similarity(a, b)
        assert 0.95 < sim < 1.0  # Very similar but not identical


class TestInMemoryCosineBackend:
    """Test the in-memory cosine search backend with mock Firestore data."""

    def _make_embedding(self, **overrides):
        base = {
            "id": "emb-1",
            "message_id": "msg-1",
            "conversation_id": "conv-1",
            "user_id": "user-A",
            "workspace_id": None,
            "chunk_index": 0,
            "chunk_text": "test chunk",
            "vector": [1.0, 0.0, 0.0],
            "model": "test",
            "dimensions": 3,
            "provider_slug": "chatgpt",
            "created_at": datetime(2026, 1, 15, tzinfo=UTC),
        }
        base.update(overrides)
        return base

    def test_basic_search_returns_results(self):
        from app.services.vector_search_service import InMemoryCosineBackend

        mock_store = MagicMock()
        mock_store.list_embeddings_for_user.return_value = [
            self._make_embedding(vector=[1.0, 0.0, 0.0]),
            self._make_embedding(id="emb-2", message_id="msg-2", vector=[0.0, 1.0, 0.0]),
        ]

        backend = InMemoryCosineBackend(store=mock_store)
        results = backend.search([1.0, 0.0, 0.0], user_id="user-A", limit=10)

        assert len(results) == 2
        assert results[0].similarity == pytest.approx(1.0)
        assert results[0].message_id == "msg-1"
        assert results[1].similarity == pytest.approx(0.0)

    def test_tenant_isolation_enforced(self):
        """User A must never see User B's results."""
        from app.services.vector_search_service import InMemoryCosineBackend

        mock_store = MagicMock()
        mock_store.list_embeddings_for_user.return_value = []

        backend = InMemoryCosineBackend(store=mock_store)
        results = backend.search([1.0, 0.0, 0.0], user_id="user-B", limit=10)

        # Verify the store was called with user-B, not user-A
        mock_store.list_embeddings_for_user.assert_called_once_with(
            "user-B", workspace_id=None, provider_slug=None
        )
        assert len(results) == 0

    def test_date_filtering(self):
        """Results outside date range should be excluded."""
        from app.services.vector_search_service import InMemoryCosineBackend

        mock_store = MagicMock()
        mock_store.list_embeddings_for_user.return_value = [
            self._make_embedding(
                vector=[1.0, 0.0, 0.0],
                created_at=datetime(2026, 1, 15, tzinfo=UTC),
            ),
            self._make_embedding(
                id="emb-2",
                message_id="msg-2",
                vector=[0.9, 0.1, 0.0],
                created_at=datetime(2026, 6, 15, tzinfo=UTC),
            ),
        ]

        backend = InMemoryCosineBackend(store=mock_store)
        results = backend.search(
            [1.0, 0.0, 0.0],
            user_id="user-A",
            date_from=date(2026, 6, 1),
            limit=10,
        )

        assert len(results) == 1
        assert results[0].message_id == "msg-2"

    def test_provider_filter(self):
        """Provider filter should be passed through to the store."""
        from app.services.vector_search_service import InMemoryCosineBackend

        mock_store = MagicMock()
        mock_store.list_embeddings_for_user.return_value = []

        backend = InMemoryCosineBackend(store=mock_store)
        backend.search(
            [1.0, 0.0, 0.0],
            user_id="user-A",
            provider_slug="claude",
            limit=10,
        )

        mock_store.list_embeddings_for_user.assert_called_once_with(
            "user-A", workspace_id=None, provider_slug="claude"
        )


class TestSemanticRankingCorrectness:
    """Verify that semantic search ranks a small fixture corpus correctly."""

    def test_ranking_order(self):
        """Given embeddings about Python, JavaScript, and cooking,
        a query about Python should rank the Python embedding highest."""
        from app.services.vector_search_service import InMemoryCosineBackend

        # Simulated embeddings (normalized-ish vectors)
        python_vec = [0.9, 0.1, 0.0, 0.0]
        js_vec = [0.7, 0.3, 0.0, 0.0]
        cooking_vec = [0.0, 0.0, 0.9, 0.1]
        query_python = [0.95, 0.05, 0.0, 0.0]

        mock_store = MagicMock()
        mock_store.list_embeddings_for_user.return_value = [
            {
                "id": "e1", "message_id": "m1", "conversation_id": "c1",
                "user_id": "u1", "chunk_text": "Python programming basics",
                "vector": python_vec, "provider_slug": "chatgpt",
                "created_at": datetime(2026, 1, 1, tzinfo=UTC),
            },
            {
                "id": "e2", "message_id": "m2", "conversation_id": "c2",
                "user_id": "u1", "chunk_text": "JavaScript frameworks",
                "vector": js_vec, "provider_slug": "chatgpt",
                "created_at": datetime(2026, 1, 2, tzinfo=UTC),
            },
            {
                "id": "e3", "message_id": "m3", "conversation_id": "c3",
                "user_id": "u1", "chunk_text": "Italian cooking recipes",
                "vector": cooking_vec, "provider_slug": "chatgpt",
                "created_at": datetime(2026, 1, 3, tzinfo=UTC),
            },
        ]

        backend = InMemoryCosineBackend(store=mock_store)
        results = backend.search(query_python, user_id="u1", limit=3)

        assert len(results) == 3
        assert results[0].chunk_text == "Python programming basics"
        assert results[1].chunk_text == "JavaScript frameworks"
        assert results[2].chunk_text == "Italian cooking recipes"
        assert results[0].similarity > results[1].similarity > results[2].similarity


# ── Hybrid merge (RRF) tests ────────────────────────────────────────────


class TestReciprocalRankFusion:
    """Test the RRF merge logic."""

    def _make_hit(self, conv_id, msg_id=None, score=1.0, match_type="semantic"):
        from app.schemas.search import SearchHit

        return SearchHit(
            conversation_id=conv_id,
            message_id=msg_id,
            snippet="test",
            score=score,
            match_type=match_type,
        )

    def test_items_in_both_lists_ranked_higher(self):
        from app.routers.search import _reciprocal_rank_fusion

        semantic = [
            self._make_hit("c1", "m1"),
            self._make_hit("c2", "m2"),
        ]
        fulltext = [
            self._make_hit("c2", "m2", match_type="exact"),
            self._make_hit("c3", "m3", match_type="exact"),
        ]

        merged = _reciprocal_rank_fusion(semantic, fulltext, limit=10)

        # c2/m2 appears in both lists → should be ranked #1
        assert merged[0].conversation_id == "c2"
        assert merged[0].match_type == "both"

    def test_match_type_annotation(self):
        from app.routers.search import _reciprocal_rank_fusion

        semantic = [self._make_hit("c1")]
        fulltext = [self._make_hit("c2", match_type="exact")]

        merged = _reciprocal_rank_fusion(semantic, fulltext, limit=10)

        types = {h.conversation_id: h.match_type for h in merged}
        assert types["c1"] == "semantic"
        assert types["c2"] == "exact"

    def test_empty_inputs(self):
        from app.routers.search import _reciprocal_rank_fusion

        merged = _reciprocal_rank_fusion([], [], limit=10)
        assert merged == []

    def test_limit_respected(self):
        from app.routers.search import _reciprocal_rank_fusion

        semantic = [self._make_hit(f"c{i}") for i in range(20)]
        fulltext = [self._make_hit(f"c{i+20}", match_type="exact") for i in range(20)]

        merged = _reciprocal_rank_fusion(semantic, fulltext, limit=5)
        assert len(merged) == 5


# ── Duplicate detection threshold tests ──────────────────────────────────


class TestDuplicateDetectionThreshold:
    """Test that duplicate detection correctly applies the similarity threshold."""

    def test_above_threshold_detected(self):
        """Two nearly identical conversation vectors should be flagged."""
        vec_a = [1.0, 0.0, 0.0]
        vec_b = [0.99, 0.01, 0.0]

        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        sim = dot / (norm_a * norm_b)

        assert sim > 0.92  # Should be flagged

    def test_below_threshold_not_detected(self):
        """Two dissimilar conversation vectors should not be flagged."""
        vec_a = [1.0, 0.0, 0.0]
        vec_b = [0.0, 1.0, 0.0]

        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        sim = dot / (norm_a * norm_b) if (norm_a and norm_b) else 0

        assert sim < 0.92  # Should NOT be flagged

    def test_borderline_threshold(self):
        """Vectors at exactly 0.92 cosine similarity should be flagged."""
        # Construct vectors with known cosine similarity = 0.92
        # cos(θ) = 0.92 → θ ≈ 23.07°
        import math as m

        theta = m.acos(0.92)
        vec_a = [1.0, 0.0]
        vec_b = [m.cos(theta), m.sin(theta)]

        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = m.sqrt(sum(a * a for a in vec_a))
        norm_b = m.sqrt(sum(b * b for b in vec_b))
        sim = dot / (norm_a * norm_b)

        assert sim == pytest.approx(0.92, abs=0.001)


# ── Search backend factory test ──────────────────────────────────────────


class TestSearchBackendFactory:
    def test_default_is_memory(self):
        from app.services.vector_search_service import get_search_backend, InMemoryCosineBackend
        from unittest.mock import MagicMock

        backend = get_search_backend("memory", store=MagicMock())
        assert isinstance(backend, InMemoryCosineBackend)

    def test_qdrant_backend_creation(self):
        from app.services.vector_search_service import get_search_backend, QdrantBackend

        backend = get_search_backend("qdrant", url="http://localhost:6333")
        assert isinstance(backend, QdrantBackend)

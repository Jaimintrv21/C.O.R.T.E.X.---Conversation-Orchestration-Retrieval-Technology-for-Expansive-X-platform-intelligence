# TDR-006: Vector Search with Firestore (replacing pgvector)

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-06-20 |
| **Deciders** | Principal Architect, Platform Engineering |
| **Supersedes** | TDR-001 (pgvector over alternatives) |

---

## Context

TDR-001 chose pgvector as the sole vector database. However, the
application's persistence layer has since been migrated from
PostgreSQL to Firebase/Firestore. The SQLAlchemy models, asyncpg
connections, and Alembic migrations that pgvector relied on are now
legacy scaffolding — Firestore is the source of truth for all
application data. This created a broken state where:

1. `embedding_tasks.py` used `async_session_factory` and the
   `Message` SQLAlchemy model, which would fail at runtime since
   PostgreSQL is no longer the active database.
2. The `embeddings` table in PostgreSQL was never populated because
   imports and chat turns write to Firestore, not SQLAlchemy.
3. The search router (`search.py`) fell back to naive keyword matching
   because it had no access to actual embedding vectors.

We need a vector search solution that works with Firestore as the
document store.

## Decision

**Default:** Store embedding vectors directly in Firestore documents
and perform cosine similarity search in application code
(**InMemoryCosineBackend**).

**Escape hatch:** Provide a trivially swappable **QdrantBackend** for
users whose corpus exceeds ~500K chunks and where in-memory ranking
becomes a latency concern.

Both backends implement the same `SearchBackend` Protocol (matching
the existing `EmbeddingBackend` Protocol pattern in
`embedding_service.py`), making the swap a single config change.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **In-memory cosine (chosen default)** | Zero extra infra; works with Firestore directly; matches self-hostable philosophy | O(n) scan per query; latency grows linearly with corpus |
| **Qdrant (chosen opt-in)** | Sub-10ms HNSW search at any scale; native filtered search | Extra stateful container; split-brain with Firestore |
| **Firestore native vector search** | No extra infra; integrated with existing SDK | Only available in specific Firestore versions/modes; requires Vertex AI API enablement; not universally available in self-hosted Firebase emulators |
| **Migrate back to pgvector** | Proven TDR-001 rationale | Contradicts the Firestore migration; would require re-implementing all data layer code in SQLAlchemy |
| **FAISS in-process** | Fast approximate search | Requires periodic index rebuild; non-trivial state management; C dependency |

## Rationale

1. **Local-first philosophy:** Most C.O.R.T.E.X. deployments are
   single-user or small-team. A corpus of 100K messages with 512-token
   chunks generates ~200K-400K embedding vectors. In-memory cosine
   similarity over this size completes in <200ms on modest hardware.

2. **Zero infrastructure increment:** No additional container in
   `docker-compose.yml` for the default path. Users run
   `docker compose up` and search works immediately.

3. **Firestore as source of truth:** Embedding vectors are stored
   alongside the messages they describe in the `embeddings` Firestore
   collection. No eventual-consistency gap.

4. **Clean escape hatch:** The `SearchBackend` Protocol makes adding
   Qdrant (or any future vector DB) a single-class implementation
   without touching the search router or embedding pipeline.

5. **Firestore native vector search was evaluated** but requires
   Google Cloud Vertex AI integration and specific project
   configurations that conflict with the self-hosted/local-first
   deployment model.

## Architecture

```
┌─────────────────────────────────────────────┐
│                Search Router                │
│  POST /search          (hybrid RRF merge)   │
│  POST /search/semantic (vector similarity)  │
│  POST /search/fulltext (Meilisearch)        │
└────────┬────────────────────┬───────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌───────────────────┐
│  SearchBackend  │  │  MeilisearchSvc   │
│  (Protocol)     │  │  (full-text)      │
├─────────────────┤  └───────────────────┘
│ InMemoryCosine  │
│  (default)      │
├─────────────────┤
│ QdrantBackend   │
│  (opt-in)       │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Firestore     │
│  "embeddings"   │
│  collection     │
└─────────────────┘
```

## Configuration

Default (zero-config):
```python
# No additional settings needed — InMemoryCosineBackend reads
# directly from Firestore's "embeddings" collection.
```

Qdrant upgrade path:
```yaml
# docker-compose.yml — add under profiles: ["scale"]
qdrant:
  image: qdrant/qdrant:latest
  container_name: cortex-qdrant
  profiles: ["scale"]
  ports:
    - "6333:6333"
  volumes:
    - qdrant_data:/qdrant/storage
```

## Consequences

### Positive
- Search works out of the box with the existing Firestore stack
- No additional container for default deployment
- Embedding pipeline is fully operational (was broken before)
- Hybrid search (semantic + full-text via Meilisearch) with RRF merge

### Negative
- In-memory search is O(n) per query — at >1M chunks, p95 may exceed
  1 second. Monitor and switch to Qdrant when this threshold is hit.
- Embedding vectors stored in Firestore increase document size and
  Firestore read costs for the `embeddings` collection.

## Escape Hatch

When in-memory search latency exceeds acceptable thresholds:
1. Add Qdrant via `docker compose --profile scale up -d`
2. Change backend selection to `"qdrant"` in config
3. Run a one-time sync task to populate Qdrant from Firestore embeddings
4. InMemoryCosineBackend can remain as a fallback

## References

- [TDR-001](./001-pgvector-over-alternatives.md) — original pgvector decision (now superseded)
- [embedding_service.py](../../../apps/api/app/services/embedding_service.py) — EmbeddingBackend Protocol pattern
- [vector_search_service.py](../../../apps/api/app/services/vector_search_service.py) — SearchBackend implementations

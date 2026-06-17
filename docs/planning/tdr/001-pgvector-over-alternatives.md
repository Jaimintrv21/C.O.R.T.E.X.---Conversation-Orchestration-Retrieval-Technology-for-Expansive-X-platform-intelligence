# TDR-001: pgvector over Weaviate / Qdrant / Pinecone

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Deciders** | Principal Architect, Senior Staff Engineer, Platform Security |

---

## Context

C.O.R.T.E.X. requires semantic search over conversation and message embeddings at scales from solo developer (10K vectors) to enterprise (10M+ vectors). We need a vector storage and similarity search solution that aligns with local-first, self-hostable, zero-telemetry principles.

## Decision

Use **pgvector extension on PostgreSQL 16** as the sole vector database for Tier 1–3.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **pgvector (chosen)** | Same DB as relational data; ACID joins; one backup; no extra service | Less specialized than dedicated vector DB at 100M+ scale |
| **Weaviate** | Rich vector features, hybrid search built-in | Extra container; operational complexity; GPL/commercial licensing nuances |
| **Qdrant** | High performance HNSW, filtering | Another stateful service; split brain with PostgreSQL |
| **Pinecone** | Managed, scalable | Cloud-only; violates local-first; data leaves infrastructure |

## Rationale

1. **Local-first:** pgvector runs in the same PostgreSQL container already required for conversations. No additional service for solo `docker compose up`.
2. **Transactional consistency:** Embeddings insert in same transaction as messages — no eventual consistency gap between PG and external vector DB.
3. **Join capability:** Semantic search results hydrate conversations with single SQL:
   ```sql
   SELECT c.* FROM conversations c
   JOIN embeddings e ON e.entity_id = c.id
   ORDER BY e.embedding <=> :query_vec LIMIT 20;
   ```
4. **Operational simplicity:** One backup script (`pg_dump`), one migration tool (Alembic), one connection pool.
5. **Scale sufficient for target:** HNSW index on 384-dim vectors handles 10M rows on modest hardware (< 500ms p95 per benchmarks).
6. **Cost:** $0 incremental vs managed Pinecone.
7. **Privacy:** Vectors never leave user infrastructure.

## Configuration

```sql
CREATE INDEX idx_embeddings_hnsw ON embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
-- Query-time: SET hnsw.ef_search = 100;
```

Default model: 384 dimensions (`all-MiniLM-L6-v2`).

## Consequences

### Positive
- Reduced infrastructure footprint (6 containers vs 7+)
- Simpler disaster recovery
- Foreign-key integrity between embeddings and messages

### Negative
- At > 50M vectors, may need read replica or dedicated Qdrant (Tier 4 escape hatch)
- Hybrid search requires application-layer RRF (Meilisearch + pgvector), not single-query hybrid

## Escape Hatch

If vector count exceeds 50M per instance with p95 > 1s:
- Add optional Qdrant profile in `docker-compose.scale.yml`
- Sync embeddings via Celery without breaking pgvector path

## References

- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [pre-stage2-decisions.md](../pre-stage2-decisions.md) — 384-dim default

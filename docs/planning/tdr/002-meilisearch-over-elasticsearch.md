# TDR-002: Meilisearch over Elasticsearch

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Deciders** | Principal Architect, Senior Staff Engineer |

---

## Context

C.O.R.T.E.X. requires typo-tolerant full-text search with faceted filtering (provider, tags, date range) over conversation titles, summaries, and message content. PostgreSQL FTS alone lacks typo tolerance and sub-200ms faceted search at scale.

## Decision

Use **Meilisearch 1.x** as the dedicated full-text search engine, alongside PostgreSQL FTS as fallback.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Meilisearch (chosen)** | Fast setup; typo tolerance; low RAM; simple API | Less flexible analyzers than ES |
| **Elasticsearch** | Industry standard; powerful aggregations | Heavy JVM (2GB+ RAM); complex ops; licensing changes |
| **PostgreSQL FTS only** | Zero extra services | No typo tolerance; slower faceted queries |
| **Typesense** | Similar to Meilisearch | Smaller ecosystem; less Docker documentation |

## Rationale

1. **10-minute deploy:** Meilisearch starts in < 5s, single binary, ~100MB RAM idle vs Elasticsearch ~2GB.
2. **Typo tolerance:** Built-in — critical for search over messy chat content ("kuberntes" → "kubernetes").
3. **Faceted search:** Native `facetDistribution` for provider/tags filters in explorer UI.
4. **Resource fit:** Solo dev on 8GB machine can run full C.O.R.T.E.X. stack; Elasticsearch often OOMs.
5. **API simplicity:** REST index/search — no query DSL learning curve for contributors.
6. **License:** MIT — aligns with Apache 2.0 project.

## Architecture Role

```
PostgreSQL FTS  →  Fallback if Meilisearch unavailable (degraded mode)
Meilisearch     →  Primary full-text + facets
pgvector        →  Semantic similarity (see TDR-001)
Hybrid          →  Application-layer RRF merge
```

## Index Schema

```json
{
  "uid": "conversations",
  "primaryKey": "id",
  "searchableAttributes": ["title", "summary", "message_content"],
  "filterableAttributes": ["provider_slug", "tags", "user_id", "workspace_id", "created_at"],
  "sortableAttributes": ["created_at", "message_count"]
}
```

## Consequences

### Positive
- Sub-200ms full-text p95 at 100K documents
- Simple backup (index rebuild from PostgreSQL if lost)

### Negative
- Eventual consistency (index lag seconds after import)
- Dual indexing logic in worker (PG + Meili)
- Not suitable for complex nested JSON queries (not needed for v1)

## Mitigations

- Reindex job (`job_type=reindex`) rebuilds Meilisearch from PostgreSQL
- Health check: `/ready` verifies Meilisearch connectivity; degrade to PG FTS

## References

- [Meilisearch docs](https://www.meilisearch.com/docs)

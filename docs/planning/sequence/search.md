# Sequence Diagram — Search

Hybrid search across Meilisearch (full-text) and pgvector (semantic).

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Next.js Web
    participant API as FastAPI API
    participant SearchSvc as SearchService
    participant Meili as Meilisearch
    participant EmbSvc as EmbeddingService
    participant PG as PostgreSQL
    participant Redis as Redis

    User->>Web: Enter query "kubernetes deployment strategy"
    Web->>API: GET /search?q=...&mode=hybrid&filters[provider]=chatgpt

    API->>API: Validate JWT, check rate limit (Redis)
    API->>SearchSvc: search(query, filters, mode=hybrid)

    par Full-text leg
        SearchSvc->>Meili: search(index=conversations, q, filters)
        Meili-->>SearchSvc: hits[] (BM25 ranked, limit 50)
    and Semantic leg
        SearchSvc->>EmbSvc: embed_query(query)
        EmbSvc->>EmbSvc: sentence-transformers encode (384-dim)
        EmbSvc-->>SearchSvc: query_vector
        SearchSvc->>PG: SELECT ... ORDER BY embedding <=> query_vector LIMIT 50
        PG-->>SearchSvc: semantic_hits[]
    end

    SearchSvc->>SearchSvc: Reciprocal Rank Fusion (RRF) merge
    SearchSvc->>PG: Hydrate conversations + snippet highlights
    PG-->>SearchSvc: ConversationSearchResult[]

    SearchSvc-->>API: results (total, items, facets)
    API-->>Web: 200 JSON
    Web-->>User: Render ranked results with highlights
```

---

## Mode: fulltext only

```mermaid
sequenceDiagram
    participant SearchSvc
    participant Meili

    SearchSvc->>Meili: search with facets [provider, tags, date]
    Meili-->>SearchSvc: hits + facetDistribution
```

## Mode: semantic only

```mermaid
sequenceDiagram
    participant SearchSvc
    participant EmbSvc
    participant PG

    SearchSvc->>EmbSvc: embed_query
    EmbSvc-->>SearchSvc: vector
    SearchSvc->>PG: cosine similarity on embeddings
    Note over PG: Uses HNSW index vector_cosine_ops
    PG-->>SearchSvc: ranked entity_ids
    SearchSvc->>PG: JOIN conversations/messages for display
```

---

## Index Sync (background, post-import)

```mermaid
sequenceDiagram
    participant Worker
    participant PG
    participant Meili

    Worker->>PG: SELECT conversations WHERE indexed_at IS NULL LIMIT 100
    Worker->>Meili: addDocuments(batch)
    Worker->>PG: UPDATE indexed_at = NOW()
```

---

## Performance Targets

| Mode | p95 Target | Bottleneck |
|------|------------|------------|
| fulltext | < 200 ms | Meilisearch |
| semantic | < 500 ms | pgvector HNSW |
| hybrid | < 600 ms | Both + RRF |

---

## Related Documents

- [TDR: pgvector](../tdr/001-pgvector-over-alternatives.md)
- [TDR: Meilisearch](../tdr/002-meilisearch-over-elasticsearch.md)

# Data Flow Overview

High-level data movement in C.O.R.T.E.X.. Detailed per-provider flows are in planning docs.

---

## Primary Flows

| Flow | Document |
|------|----------|
| Import (all providers) | [Import Pipelines](../planning/data-flow/import-pipelines.md) |
| Provider schemas | [Provider Schemas](../planning/data-flow/provider-schemas.md) |
| Search | [Sequence: Search](../planning/sequence/search.md) |
| Artifact generation | [Sequence: Artifact](../planning/sequence/artifact-generation.md) |
| Knowledge graph | [Sequence: KG Build](../planning/sequence/knowledge-graph-build.md) |

---

## End-to-End Data Lifecycle

```mermaid
flowchart LR
    subgraph Ingest
        UP[User Upload] --> PARSE[Provider Parser]
        SYNC[API Sync] --> PARSE
    end

    subgraph Store
        PARSE --> PG[(PostgreSQL)]
        PARSE --> MO[(MinIO raw)]
    end

    subgraph Index
        PG --> EMB[Embedding Worker]
        EMB --> VEC[(pgvector)]
        PG --> MEI[(Meilisearch)]
    end

    subgraph Consume
        VEC --> SEARCH[Search API]
        MEI --> SEARCH
        PG --> UI[Web UI]
        PG --> EXPORT[Export]
        PG --> ANALYTICS[Analytics]
    end

    subgraph Intelligence
        PG --> KG[Knowledge Graph]
        PG --> ART[Artifacts]
        OLLAMA[Ollama] --> KG
        OLLAMA --> ART
    end
```

---

## Related Documents

- [C4 Container Diagram](../planning/architecture/c4-container.md)
- [Privacy Model](../planning/privacy-model.md)

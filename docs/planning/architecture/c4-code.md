# C4 Model — Level 4: Code-Level View

**Selected Code Structures — Import & Search Paths**

This level documents package boundaries and key classes for the two highest-traffic code paths. Full implementation occurs in Stage 2.

---

## Package Structure (API)

```
apps/api/app/
├── main.py                 # FastAPI app factory, lifespan, router mount
├── config.py               # Settings (Pydantic BaseSettings)
├── database.py             # AsyncEngine, sessionmaker
├── dependencies.py         # get_db, get_current_user, rate_limit
├── middleware/
│   ├── auth.py
│   ├── rate_limit.py
│   ├── logging.py
│   └── cors.py
├── routers/                # Thin: validate → service → response
├── services/               # Business logic, no HTTP concerns
├── workers/
│   ├── celery_app.py
│   └── tasks/
├── providers/              # Versioned parsers
├── models/                 # SQLAlchemy ORM
├── schemas/                # Pydantic v2 request/response
└── utils/
    ├── crypto.py           # AES-GCM, DEK wrap/unwrap
    └── tokens.py           # JWT encode/decode
```

---

## Code Diagram: Import Pipeline

```mermaid
classDiagram
    class ImportRouter {
        +POST /imports/upload()
        +GET /imports/:id
        +WS /imports/:id/progress
    }
    class ConversationService {
        +create_from_normalized()
        +upsert_by_external_id()
    }
    class ProviderRegistry {
        +detect_parser(file) ProviderParser
        +get_parser(slug, version) ProviderParser
    }
    class ChatGPTParserV1 {
        +detect() float
        +parse() List~NormalizedConversation~
    }
    class ImportTask {
        +run(job_id)
    }
    class JobRepository {
        +update_progress()
        +complete()
    }

    ImportRouter --> ImportTask : celery.delay
    ImportTask --> ProviderRegistry
    ImportTask --> ChatGPTParserV1
    ImportTask --> ConversationService
    ImportTask --> JobRepository
    ConversationService --> MessageRepository
    ConversationService --> EmbeddingService : enqueue embed
```

---

## Code Diagram: Search Pipeline

```mermaid
classDiagram
    class SearchRouter {
        +GET /search?q=&mode=
    }
    class SearchService {
        +search(query, filters, mode)
        -fulltext_search()
        -semantic_search()
        -hybrid_search()
    }
    class EmbeddingService {
        +embed_text(text) vector
        +get_model_config() EmbeddingConfig
    }
    class MeilisearchClient {
        +search(index, query, filters)
    }
    class EmbeddingRepository {
        +similarity(query_vector, limit)
    }

    SearchRouter --> SearchService
    SearchService --> MeilisearchClient : mode=fulltext
    SearchService --> EmbeddingService : mode=semantic
    SearchService --> EmbeddingRepository : mode=semantic
    SearchService --> MeilisearchClient : mode=hybrid (rerank)
    SearchService --> EmbeddingRepository : mode=hybrid
```

---

## Key Models (ORM)

| Model | Table | Primary Relationships |
|-------|-------|----------------------|
| `User` | users | → sessions, conversations, workspaces |
| `Conversation` | conversations | → messages, provider, workspace |
| `Message` | messages | → conversation (partitioned) |
| `Embedding` | embeddings | polymorphic entity_type/entity_id |
| `Job` | jobs | → user, celery_task_id |
| `KnowledgeNode` | knowledge_nodes | → knowledge_edges |
| `Artifact` | artifacts | → user, workspace |

---

## Frontend Code Boundaries

```
apps/web/src/
├── app/(auth)/             # Public auth pages
├── app/(app)/              # Protected shell
│   ├── conversations/      # List + [id] detail
│   ├── search/             # Search results
│   └── ...
├── components/features/
│   ├── import/             # Dropzone, progress WS
│   ├── conversations/      # Virtualized list
│   └── search/             # Query bar, filters
├── hooks/
│   ├── use-conversations.ts
│   ├── use-search.ts
│   └── use-job-progress.ts
└── lib/api.ts              # ApiClient class
```

---

## Testing Boundaries

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | pytest / Vitest | Services, parsers, crypto |
| Integration | pytest-asyncio | API + test DB |
| E2E | Playwright | Import → search flow |

Fixtures: `examples/sample-data/` — 50 synthetic conversations per provider.

---

## Related Documents

- [C4 Component](./c4-component.md)
- [Sequence: Import](../sequence/import.md)
- [Sequence: Search](../sequence/search.md)
- [Folder Structure](../../architecture/folder-structure.md)

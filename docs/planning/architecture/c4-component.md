# C4 Model — Level 3: Component Diagram

**FastAPI API Gateway — Internal Components**

```mermaid
C4Component
    title Component Diagram — API Gateway (FastAPI)

    Container_Boundary(api, "API Gateway") {
        Component(routers, "HTTP Routers", "FastAPI routers", "auth, conversations, search, analytics, artifacts, jobs, workspaces, knowledge_graph")
        Component(deps, "Dependencies", "FastAPI Depends", "JWT validation, DB session, rate limit, current user")
        Component(middleware, "Middleware Stack", "Starlette middleware", "CORS, logging, rate limit, security headers")
        Component(services, "Domain Services", "Python modules", "Business logic orchestration")
        Component(providers, "Provider Parsers", "Parser plugins", "ChatGPT, Claude, Gemini, generic importers")
        Component(ws, "WebSocket Handler", "FastAPI WS", "Job progress streaming via Redis pub/sub")
    }

    ContainerDb(postgres, "PostgreSQL", "Database")
    ContainerDb(redis, "Redis", "Cache/Queue")
    ContainerDb(meili, "Meilisearch", "Search")
    ContainerDb(minio, "MinIO", "Storage")
    Container(worker, "Celery Worker", "Background tasks")

    Rel(routers, deps, "Uses")
    Rel(routers, services, "Delegates")
    Rel(middleware, routers, "Wraps")
    Rel(services, postgres, "SQLAlchemy async")
    Rel(services, redis, "Cache/enqueue")
    Rel(services, meili, "Search index")
    Rel(services, minio, "Object CRUD")
    Rel(services, providers, "Parse imports")
    Rel(services, worker, "Celery delay")
    Rel(ws, redis, "Subscribe job:*")
    Rel(routers, ws, "Upgrade connection")
```

---

## Domain Services (Component Detail)

```mermaid
flowchart TB
    subgraph Routers
        R_AUTH[auth.py]
        R_CONV[conversations.py]
        R_MSG[messages.py]
        R_SEARCH[search.py]
        R_ANLY[analytics.py]
        R_ART[artifacts.py]
        R_JOB[jobs.py]
        R_WS[workspaces.py]
        R_KG[knowledge_graph.py]
    end

    subgraph Services
        S_CONV[ConversationService]
        S_EMB[EmbeddingService]
        S_SEARCH[SearchService]
        S_ANLY[AnalyticsService]
        S_KG[KnowledgeService]
        S_ART[ArtifactService]
        S_SYNC[ProviderSyncService]
        S_PII[PiiService]
        S_DUP[DuplicateService]
    end

    subgraph Workers Tasks
        T_IMP[import_tasks]
        T_EMB[embedding_tasks]
        T_ANLY[analytics_tasks]
        T_ART[artifact_tasks]
        T_SYNC[sync_tasks]
    end

    R_CONV --> S_CONV
    R_SEARCH --> S_SEARCH
    R_ANLY --> S_ANLY
    R_ART --> S_ART
    R_KG --> S_KG
    R_JOB --> T_IMP
    R_JOB --> T_EMB

    S_CONV --> S_EMB
    S_SEARCH --> S_EMB
    S_SEARCH --> S_DUP
    S_CONV --> S_SYNC
    T_IMP --> S_CONV
    T_EMB --> S_EMB
    T_ANLY --> S_ANLY
    T_ART --> S_ART
    T_SYNC --> S_SYNC
```

---

## Web Application Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| **App Router pages** | `apps/web/src/app/` | Route segments, layouts, SSR |
| **Feature components** | `components/features/` | Conversation list, import wizard, search |
| **UI primitives** | `components/ui/` | shadcn/ui base |
| **Visualizations** | `components/visualizations/` | Recharts, Sigma.js graph |
| **API client** | `lib/api.ts` | Typed fetch wrapper |
| **Auth** | `lib/auth.ts` | Auth.js 5 config |
| **Stores** | `stores/` | Zustand client state |
| **Hooks** | `hooks/` | TanStack Query hooks |

---

## Worker Components

| Task Module | Triggers | Output |
|-------------|----------|--------|
| `import_tasks` | File upload, API sync | Conversations + messages in PG |
| `embedding_tasks` | Post-import, reindex job | pgvector rows |
| `analytics_tasks` | Cron / manual | analytics_snapshots |
| `artifact_tasks` | User request | artifacts + MinIO objects |
| `sync_tasks` | Scheduled provider sync | Updated conversations |

---

## Provider Parser Interface

```python
# Conceptual contract (Stage 2 implementation)
class ProviderParser(Protocol):
    provider_slug: str
    schema_version: str

    def detect(self, raw: bytes) -> float: ...       # 0.0–1.0 confidence
    def parse(self, raw: bytes) -> list[NormalizedConversation]: ...
```

Implementations: `chatgpt/v1`, `claude/v1`, `gemini/v1`, `perplexity/v1`, `grok/v1`, `generic/json`, `generic/markdown`.

---

## Related Documents

- [C4 Container](./c4-container.md)
- [C4 Code](./c4-code.md)
- [Data Flow: Import](../data-flow/import-pipelines.md)

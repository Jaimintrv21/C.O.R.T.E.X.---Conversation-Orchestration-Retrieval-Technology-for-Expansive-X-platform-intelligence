# C4 Model — Level 2: Container Diagram

**C.O.R.T.E.X. Platform — Deployable Containers**

```mermaid
C4Container
    title Container Diagram — C.O.R.T.E.X. Platform

    Person(user, "User", "Browser access")

    System_Boundary(cortex, "C.O.R.T.E.X. Platform") {
        Container(web, "Web Application", "Next.js 14", "UI: explorer, search, analytics, settings")
        Container(caddy, "Reverse Proxy", "Caddy 2", "TLS termination, routing")
        Container(api, "API Gateway", "FastAPI", "REST + WebSocket, auth, routing")
        Container(worker, "Background Worker", "Celery", "Import, embed, analytics, artifacts")
        ContainerDb(postgres, "Primary Database", "PostgreSQL 16 + pgvector", "Conversations, users, embeddings")
        ContainerDb(redis, "Cache & Queue", "Redis 7", "Sessions, rate limits, Celery broker, pub/sub")
        ContainerDb(meili, "Search Engine", "Meilisearch 1.x", "Typo-tolerant full-text, facets")
        ContainerDb(minio, "Object Storage", "MinIO", "Attachments, exports, artifact files")
        Container(ollama, "Local AI Runtime", "Ollama", "LLM + optional embeddings")
    }

    System_Ext(litellm, "Cloud LLM APIs", "LiteLLM adapters")
    System_Ext(providers, "AI Provider Exports", "ChatGPT, Claude, etc.")

    Rel(user, caddy, "HTTPS")
    Rel(caddy, web, "Proxy /")
    Rel(caddy, api, "Proxy /api")
    Rel(web, api, "API calls", "JSON/HTTPS")
    Rel(api, postgres, "Read/Write", "async SQL")
    Rel(api, redis, "Sessions, rate limit")
    Rel(api, meili, "Search queries")
    Rel(api, minio, "File URLs")
    Rel(worker, postgres, "Read/Write")
    Rel(worker, redis, "Task queue, pub/sub progress")
    Rel(worker, meili, "Index updates")
    Rel(worker, minio, "Store artifacts")
    Rel(worker, ollama, "Embeddings, LLM", "HTTP")
    Rel(worker, litellm, "Cloud LLM (opt-in)", "HTTPS")
    Rel(user, providers, "Export download")
    Rel(api, providers, "Optional API sync", "HTTPS")
```

---

## Container Descriptions

| Container | Technology | Responsibility | Scaling |
|-----------|------------|----------------|---------|
| **Web Application** | Next.js 14, TypeScript | SSR/CSR UI, Auth.js session, TanStack Query | Horizontal (stateless) |
| **Reverse Proxy** | Caddy 2 | Auto HTTPS, path routing, security headers | Single or HA pair |
| **API Gateway** | FastAPI 0.115+ | Auth, REST API, WebSockets (job progress) | Horizontal |
| **Background Worker** | Celery 5 + Redis | Long-running: import, embed, analytics, KG, artifacts | Horizontal by queue |
| **PostgreSQL** | PG 16 + pgvector | Source of truth, FTS, vector similarity | Vertical + read replicas |
| **Redis** | Redis 7 | Broker, cache, rate limit, pub/sub | Sentinel/cluster optional |
| **Meilisearch** | 1.x | Fast facet search, typo tolerance | Single node (Tier 1) |
| **MinIO** | S3-compatible | Blobs: uploads, PDF exports, artifact HTML | Distributed optional |
| **Ollama** | Latest | Local llama3, mistral, nomic-embed | GPU node |

---

## Inter-Container Communication

```mermaid
flowchart LR
    subgraph Client
        Browser
    end

    subgraph Edge
        Caddy
    end

    subgraph App
        Web
        API
        Worker
    end

    subgraph Data
        PG[(PostgreSQL)]
        Redis[(Redis)]
        Meili[(Meilisearch)]
        MinIO[(MinIO)]
    end

    subgraph AI
        Ollama
        LiteLLM[Cloud LLMs]
    end

    Browser --> Caddy
    Caddy --> Web
    Caddy --> API
    Web --> API
    API --> PG
    API --> Redis
    API --> Meili
    API --> MinIO
    API -->|enqueue| Redis
    Worker --> Redis
    Worker --> PG
    Worker --> Meili
    Worker --> MinIO
    Worker --> Ollama
    Worker -.->|opt-in| LiteLLM
    API -->|WS progress| Redis
    Redis -->|pub/sub| API
```

---

## Deployment Profiles

| Profile | Compose File | Containers |
|---------|--------------|------------|
| **Minimal** | `docker-compose.minimal.yml` | caddy, web, api, worker, postgres, redis, meili, minio |
| **Standard** | `docker-compose.yml` | + ollama |
| **Full observability** | `docker-compose.prod.yml` | + prometheus, grafana, loki, jaeger |

---

## Container-Level Security

| Container | Exposure | Auth |
|-----------|----------|------|
| Caddy | Public :443/:80 | TLS |
| Web | Internal only | Session cookie |
| API | Internal (+ public via Caddy) | JWT RS256 |
| Worker | Internal only | Service credentials |
| PostgreSQL | Internal only | SCRAM auth |
| Redis | Internal only | Password |
| Meilisearch | Internal only | Master key |
| MinIO | Internal only | Access key |
| Ollama | Internal only | None (network isolated) |

---

## Related Documents

- [C4 Context](./c4-context.md)
- [C4 Component](./c4-component.md)
- [TDR: Caddy](../tdr/005-caddy-over-nginx.md)

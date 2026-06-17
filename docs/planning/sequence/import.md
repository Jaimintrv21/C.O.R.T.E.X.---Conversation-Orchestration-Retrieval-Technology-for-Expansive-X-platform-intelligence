# Sequence Diagram — Conversation Import

End-to-end flow from file upload to searchable conversation.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Next.js Web
    participant API as FastAPI API
    participant MinIO as MinIO
    participant PG as PostgreSQL
    participant Redis as Redis
    participant Worker as Celery Worker
    participant Registry as ProviderRegistry
    participant Parser as ChatGPTParserV1
    participant ConvSvc as ConversationService
    participant WS as WebSocket Handler

    User->>Web: Drop export.zip
    Web->>API: POST /imports/upload (multipart)
    API->>API: Validate JWT + storage quota
    API->>MinIO: PUT raw/{job_id}/export.zip
    API->>PG: INSERT jobs (status=queued, type=import_file)
    API->>Redis: CELERY enqueue import_task(job_id)
    API-->>Web: 202 { job_id }

    Web->>API: WS /imports/{job_id}/progress
    API->>Redis: SUBSCRIBE job:{job_id}

    Worker->>Redis: BRPOP celery queue
    Worker->>PG: UPDATE jobs status=running
    Worker->>MinIO: GET raw/{job_id}/export.zip
    Worker->>Registry: detect_parser(bytes)
    Registry->>Parser: detect() → 0.98 confidence
    Worker->>Parser: parse(bytes)
    Parser-->>Worker: NormalizedConversation[]

    loop Each conversation batch (50)
        Worker->>ConvSvc: upsert_batch(normalized)
        ConvSvc->>PG: UPSERT conversations + messages
        Worker->>Redis: PUBLISH job:{job_id} progress=0.45
        Redis-->>WS: progress event
        WS-->>Web: { progress: 0.45, detail: "120/267 conversations" }
        Web-->>User: Progress bar update
    end

    Worker->>PG: UPDATE jobs status=completed
    Worker->>Redis: PUBLISH job:{job_id} progress=1.0
    Worker->>Redis: ENQUEUE embed_batch(job_id)

    Note over Worker,PG: Embedding job runs asynchronously (see Search sequence)

    Web-->>User: Import complete → navigate to conversations
```

---

## Alternate Flows

### Parse failure
```mermaid
sequenceDiagram
    participant Worker
    participant Registry
    participant PG
    participant Redis
    participant Web

    Worker->>Registry: detect_parser(bytes)
    Registry-->>Worker: No match (confidence < 0.5)
    Worker->>PG: UPDATE jobs status=failed, error=UNSUPPORTED_SCHEMA
    Worker->>Redis: PUBLISH job:{id} failed
    Redis-->>Web: Error toast with schema fingerprint
```

### Re-import (idempotent)
```mermaid
sequenceDiagram
    participant Worker
    participant ConvSvc
    participant PG

    Worker->>ConvSvc: upsert(external_id=abc123)
    ConvSvc->>PG: SELECT existing by (provider_id, external_id, user_id)
    PG-->>ConvSvc: Found existing conversation
    ConvSvc->>PG: UPDATE metadata, INSERT new messages only
```

---

## Related Documents

- [Import Pipelines](../data-flow/import-pipelines.md)
- [Provider Schemas](../data-flow/provider-schemas.md)

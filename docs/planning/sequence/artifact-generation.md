# Sequence Diagram — Artifact Generation

Tier 2 feature: generate wiki, report, or presentation from selected conversations.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Next.js Web
    participant API as FastAPI API
    participant ArtSvc as ArtifactService
    participant PG as PostgreSQL
    participant Redis as Redis
    participant Worker as Celery Worker
    participant Ollama as Ollama
    participant LiteLLM as LiteLLM (opt-in)
    participant MinIO as MinIO
    participant WS as WebSocket

    User->>Web: Select 5 conversations → "Generate Wiki"
    Web->>API: POST /artifacts { type: wiki, source_ids[], prompt }

    API->>ArtSvc: create_artifact_request()
    ArtSvc->>PG: INSERT artifacts (status=pending)
    ArtSvc->>PG: INSERT jobs (type=generate_artifact)
    ArtSvc->>Redis: ENQUEUE artifact_task
    API-->>Web: 202 { artifact_id, job_id }

    Web->>API: WS /jobs/{job_id}/progress

    Worker->>PG: UPDATE artifact status=generating
    Worker->>PG: SELECT messages for source_ids (ordered)
    Worker->>Worker: Build context window (truncate to model limit)

    alt Local-first (default)
        Worker->>Ollama: POST /api/generate { model: llama3, prompt }
        Ollama-->>Worker: Generated markdown content
    else Cloud opt-in
        Worker->>LiteLLM: completion(model=claude-3-5-sonnet)
        LiteLLM-->>Worker: Generated content
    end

    Worker->>Worker: Structure content as wiki JSON schema
    Worker->>MinIO: PUT artifacts/{id}/wiki.html
    Worker->>PG: UPDATE artifacts content, storage_key, status=ready
    Worker->>Redis: PUBLISH job progress=1.0
    Redis-->>WS: complete event
    WS-->>Web: Generation complete

    Web->>API: GET /artifacts/{id}
    API->>PG: SELECT artifact
    API->>MinIO: Presigned URL for wiki.html
    API-->>Web: Artifact metadata + preview URL
    Web-->>User: Render wiki in Tiptap viewer
```

---

## Artifact Types & Output

| Type | Output | MinIO key | content JSONB |
|------|--------|-----------|---------------|
| wiki | HTML + MD | `artifacts/{id}/wiki.html` | Tiptap document tree |
| report | PDF | `artifacts/{id}/report.pdf` | Section outline |
| presentation | HTML slides | `artifacts/{id}/deck/` | Slide array |
| summary | Markdown | — | Text only |
| mindmap | JSON graph | — | nodes + edges |

---

## Failure & Retry

```mermaid
sequenceDiagram
    participant Worker
    participant Ollama
    participant PG

    Worker->>Ollama: generate
    Ollama-->>Worker: 503 unavailable
    Worker->>Worker: attempts++ (max 3)
    alt attempts < max
        Worker->>Worker: exponential backoff
        Worker->>Ollama: retry
    else exhausted
        Worker->>PG: UPDATE artifact status=failed, error_message
    end
```

---

## Related Documents

- [TDR: LiteLLM](../tdr/004-litellm-ai-routing.md)
- [Roadmap — Tier 2](../roadmap.md)

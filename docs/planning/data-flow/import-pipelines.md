# Data Flow — Import Pipelines

Per-provider import data flows from user upload to searchable indexed conversation.

---

## Master Import Flow

```mermaid
flowchart TB
    subgraph User
        U[Upload export file]
    end

    subgraph API
        A1[POST /api/v1/imports/upload]
        A2[Validate auth + quota]
        A3[Store raw file in MinIO]
        A4[Create job record status=queued]
        A5[Enqueue Celery import_task]
    end

    subgraph Worker
        W1[Fetch file from MinIO]
        W2[ProviderRegistry.detect_parser]
        W3[Parser.parse → NormalizedConversation[]]
        W4[ConversationService.upsert batch]
        W5[Publish progress via Redis pub/sub]
        W6[Enqueue embed_batch job]
        W7[Update Meilisearch index]
        W8[Mark job completed]
    end

    subgraph Storage
        PG[(PostgreSQL)]
        MS[(Meilisearch)]
        MO[(MinIO)]
        RD[(Redis)]
    end

    U --> A1
    A1 --> A2 --> A3 --> MO
    A2 --> A4 --> PG
    A4 --> A5 --> RD
    A5 --> W1
    W1 --> MO
    W1 --> W2 --> W3 --> W4 --> PG
    W4 --> W5 --> RD
    W4 --> W6
    W6 --> W7 --> MS
    W7 --> W8 --> PG
```

---

## ChatGPT Import Pipeline

```mermaid
flowchart LR
    subgraph Input
        ZIP[export.zip]
        CJ[conversations.json]
    end

    subgraph Detection
        D1{Has mapping + title?}
    end

    subgraph Parse
        P1[Load JSON array]
        P2[For each conversation]
        P3[Walk message tree from current_node]
        P4[Flatten to ordered messages]
        P5[Map author.role → message_role]
    end

    subgraph Persist
        S1[Upsert by provider_id + external_id + user_id]
        S2[Insert messages with sequence_num]
        S3[Update message_count, token_count]
    end

    ZIP --> CJ --> D1
    D1 -->|yes| P1 --> P2 --> P3 --> P4 --> P5 --> S1 --> S2 --> S3
```

**Error paths:**
- Missing `conversations.json` → job failed, error: `MISSING_PRIMARY_FILE`
- Broken tree (orphan nodes) → skip orphans, warn if > 5% messages lost
- Duplicate re-import → upsert messages by `external_id`, no duplicates

---

## Claude Import Pipeline

```mermaid
flowchart LR
    subgraph Input
        ZIP2[export.zip]
        CJ2[conversations.json]
    end

    subgraph Parse
        C1[Load JSON array]
        C2[For each: uuid, name, chat_messages]
        C3[Map sender human→user, assistant→assistant]
        C4[Sequence by array order]
    end

    subgraph Persist
        S4[Same upsert path as ChatGPT]
    end

    ZIP2 --> CJ2 --> C1 --> C2 --> C3 --> C4 --> S4
```

---

## Gemini Import Pipeline

```mermaid
flowchart TB
    subgraph Input
        TO[Takeout MyActivity.json]
        APP[App export JSON]
    end

    subgraph Detect
        GD{Format variant?}
    end

    subgraph Takeout Path
        T1[Parse activity entries]
        T2[Filter header contains Gemini/Bard]
        T3[Group by 30-min time windows]
        T4[Extract Prompt/Response pairs]
    end

    subgraph App Path
        AP1[Parse conversations array]
        AP2[Direct message mapping]
    end

    subgraph Persist
        PS[Normalized upsert]
    end

    TO --> GD
    APP --> GD
    GD -->|takeout| T1 --> T2 --> T3 --> T4 --> PS
    GD -->|app| AP1 --> AP2 --> PS
```

---

## Perplexity Import Pipeline

```mermaid
flowchart LR
    IN[JSON threads array] --> PR[Parse id, title, messages]
    PR --> MR[Map roles + metadata.sources]
    MR --> UP[Upsert]
```

---

## Grok Import Pipeline

```mermaid
flowchart LR
    IN2[JSON conversations wrapper] --> GR[Best-effort parse]
    GR --> UP2[Upsert with metadata.parser_warning if partial]
```

---

## Post-Import Indexing Pipeline

Runs for **all providers** after successful parse:

```mermaid
flowchart LR
    subgraph embed_batch Job
        E1[Load unembedded messages]
        E2[Chunk text 512 tokens, overlap 64]
        E3[sentence-transformers encode]
        E4[INSERT embeddings entity_type=message]
        E5[Aggregate conversation embedding mean pool]
        E6[INSERT embeddings entity_type=conversation]
    end

    subgraph meilisearch
        M1[Bulk index conversations]
        M2[Bulk index messages searchable attrs]
    end

    subgraph duplicate_detection
        DUP[Queue detect_duplicates job async]
    end

    E1 --> E2 --> E3 --> E4 --> E5 --> E6
    E6 --> M1 --> M2
    M2 --> DUP
```

---

## API Sync Pipeline (Tier 2)

```mermaid
flowchart TB
    CRON[Celery beat schedule] --> SYNC[sync_tasks.sync_provider_account]
    SYNC --> TOKEN[Decrypt provider token]
    TOKEN --> API[Provider API fetch delta]
    API --> CURSOR[Update sync_cursor]
    CURSOR --> PARSE[Same normalization path]
    PARSE --> PERSIST[Upsert conversations]
```

---

## Data Classification During Import

| Data element | Classification | Storage |
|--------------|----------------|---------|
| Raw upload file | Confidential | MinIO (encrypted at rest) |
| Parsed messages | Internal | PostgreSQL |
| Provider tokens | Restricted | PostgreSQL BYTEA encrypted |
| Embeddings | Internal | PostgreSQL pgvector |
| Job progress | Internal | Redis (TTL 24h) |

---

## Related Documents

- [Provider Schemas](./provider-schemas.md)
- [Sequence: Import](../sequence/import.md)
- [Privacy Model](../privacy-model.md)

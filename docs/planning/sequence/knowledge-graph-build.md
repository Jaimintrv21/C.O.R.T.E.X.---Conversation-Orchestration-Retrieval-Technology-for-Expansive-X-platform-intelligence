# Sequence Diagram — Knowledge Graph Build

Tier 2 feature: extract entities and relationships from conversations into knowledge graph.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Next.js Web
    participant API as FastAPI API
    participant KGSvc as KnowledgeService
    participant PG as PostgreSQL
    participant Redis as Redis
    participant Worker as Celery Worker
    participant NLP as spaCy NER
    participant Ollama as Ollama
    participant EmbSvc as EmbeddingService

    User->>Web: Click "Build Knowledge Graph" (workspace scope)
    Web->>API: POST /knowledge/build { workspace_id, options }

    API->>KGSvc: enqueue_build()
    KGSvc->>PG: INSERT jobs (type=build_knowledge_graph)
    KGSvc->>Redis: ENQUEUE kg_build_task
    API-->>Web: 202 { job_id }

    Worker->>PG: SELECT messages for workspace (batch 500)
    
    loop Each message batch
        Worker->>NLP: extract entities (PERSON, ORG, PRODUCT, etc.)
        NLP-->>Worker: entities[]
        
        Worker->>Ollama: extract concepts + decisions (structured JSON prompt)
        Ollama-->>Worker: concepts[], decisions[], relationships[]

        Worker->>PG: UPSERT knowledge_nodes (merge by label similarity)
        Worker->>EmbSvc: embed_node(label + description)
        EmbSvc-->>Worker: node_vector
        Worker->>PG: UPDATE knowledge_nodes.embedding

        Worker->>PG: UPSERT knowledge_edges (source, target, relationship)
        Worker->>PG: APPEND evidence snippets to edges

        Worker->>Redis: PUBLISH progress
    end

    Worker->>Worker: Prune orphan nodes (occurrence_count < 2)
    Worker->>Worker: Compute edge weights from co-occurrence
    Worker->>PG: UPDATE jobs status=completed
    Worker-->>Web: Job complete (via WS)

    User->>Web: Open Knowledge Graph view
    Web->>API: GET /knowledge/graph?workspace_id=
    API->>PG: SELECT nodes + edges
    API-->>Web: Graphology-compatible JSON
    Web-->>User: Sigma.js force-directed visualization
```

---

## Node Merge Strategy

```mermaid
flowchart TD
    A[New entity label] --> B{Exact match exists?}
    B -->|yes| C[Increment occurrence_count]
    B -->|no| D{Cosine sim > 0.92 to existing?}
    D -->|yes| E[Merge into existing node]
    D -->|no| F[INSERT new knowledge_node]
```

---

## Relationship Types

| relationship | Example |
|--------------|---------|
| relates_to | "Kubernetes" relates_to "Docker" |
| leads_to | "Architecture review" leads_to "Microservices decision" |
| contradicts | "Use MongoDB" contradicts "Use PostgreSQL" |
| mentions | "Project Alpha" mentions "Jordan" |
| answers | Message pair user question → assistant answer |

---

## Incremental Update (scheduled)

```mermaid
sequenceDiagram
    participant Beat as Celery Beat
    participant Worker
    participant PG

    Beat->>Worker: nightly kg_incremental
    Worker->>PG: SELECT messages WHERE kg_processed_at IS NULL
    Worker->>Worker: Process delta only
    Worker->>PG: SET kg_processed_at = NOW()
```

---

## Related Documents

- [ERD](../erd.md)
- [Roadmap — Tier 2](../roadmap.md)

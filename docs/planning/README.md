# Stage 1 — Planning & Architecture

**C.O.R.T.E.X. AI Conversation Intelligence Platform**

Stage 1 objective: **Zero ambiguity before a single line of production code is written.**

**Status:** ✅ Complete — Ready for Stage 2

---

## Deliverables Checklist

| # | Deliverable | Document | Status |
|---|-------------|----------|--------|
| 1 | Product Requirements Document | [PRD.md](./PRD.md) | ✅ |
| 2 | C4 Context Diagram | [architecture/c4-context.md](./architecture/c4-context.md) | ✅ |
| 3 | C4 Container Diagram | [architecture/c4-container.md](./architecture/c4-container.md) | ✅ |
| 4 | C4 Component Diagram | [architecture/c4-component.md](./architecture/c4-component.md) | ✅ |
| 5 | C4 Code Diagram | [architecture/c4-code.md](./architecture/c4-code.md) | ✅ |
| 6 | Entity-Relationship Diagram | [erd.md](./erd.md) | ✅ |
| 7 | Import Pipeline Data Flows | [data-flow/import-pipelines.md](./data-flow/import-pipelines.md) | ✅ |
| 8 | Provider Export Schemas | [data-flow/provider-schemas.md](./data-flow/provider-schemas.md) | ✅ |
| 9 | Sequence: Import | [sequence/import.md](./sequence/import.md) | ✅ |
| 10 | Sequence: Search | [sequence/search.md](./sequence/search.md) | ✅ |
| 11 | Sequence: Artifact Generation | [sequence/artifact-generation.md](./sequence/artifact-generation.md) | ✅ |
| 12 | Sequence: Knowledge Graph Build | [sequence/knowledge-graph-build.md](./sequence/knowledge-graph-build.md) | ✅ |
| 13 | TDR: pgvector | [tdr/001-pgvector-over-alternatives.md](./tdr/001-pgvector-over-alternatives.md) | ✅ |
| 14 | TDR: Meilisearch | [tdr/002-meilisearch-over-elasticsearch.md](./tdr/002-meilisearch-over-elasticsearch.md) | ✅ |
| 15 | TDR: Celery | [tdr/003-celery-over-alternatives.md](./tdr/003-celery-over-alternatives.md) | ✅ |
| 16 | TDR: LiteLLM | [tdr/004-litellm-ai-routing.md](./tdr/004-litellm-ai-routing.md) | ✅ |
| 17 | TDR: Caddy | [tdr/005-caddy-over-nginx.md](./tdr/005-caddy-over-nginx.md) | ✅ |
| 18 | Privacy Model | [privacy-model.md](./privacy-model.md) | ✅ |
| 19 | Threat Model (STRIDE) | [threat-model.md](./threat-model.md) | ✅ |
| 20 | Feature Roadmap | [roadmap.md](./roadmap.md) | ✅ |
| 21 | Folder Structure | [../architecture/folder-structure.md](../architecture/folder-structure.md) | ✅ |
| 22 | Pre-Stage-2 Decisions | [pre-stage2-decisions.md](./pre-stage2-decisions.md) | ✅ |

---

## Pre-Stage-2 Questions — Resolved

| Question | Resolution |
|----------|------------|
| Provider export formats? | [provider-schemas.md](./data-flow/provider-schemas.md) |
| Format change handling? | Versioned parsers + schema negotiation |
| Default embedding model? | `all-MiniLM-L6-v2` (384 dimensions) |
| Encryption key management? | Envelope encryption: master key → per-user DEK |

Details: [pre-stage2-decisions.md](./pre-stage2-decisions.md)

---

## Key Architectural Decisions Summary

```
┌─────────────────────────────────────────────────────────┐
│  LOCAL-FIRST STACK                                      │
│  PostgreSQL + pgvector │ Meilisearch │ Redis │ MinIO   │
│  Ollama (direct)       │ LiteLLM (cloud opt-in)        │
│  Celery workers        │ Caddy reverse proxy            │
└─────────────────────────────────────────────────────────┘
```

---

## Stage 2 Entry Criteria

All items below must be true before implementation begins:

- [x] All 22 deliverables documented
- [x] No unresolved blocking questions
- [x] Threat model reviewed
- [x] Embedding dimension aligned with schema (384)
- [x] Encryption model defined (envelope, not password-only)
- [x] Acceptance criteria defined per Tier 1 milestone

**Gate: OPEN — Proceed to Stage 2 (M1.1 Foundation & Infrastructure)**

---

## Document Map

```
docs/
├── planning/               ← You are here
│   ├── README.md
│   ├── PRD.md
│   ├── erd.md
│   ├── roadmap.md
│   ├── privacy-model.md
│   ├── threat-model.md
│   ├── pre-stage2-decisions.md
│   ├── architecture/       # C4 diagrams
│   ├── data-flow/          # Import pipelines + schemas
│   ├── sequence/           # Sequence diagrams
│   └── tdr/                # Technical decision records
└── architecture/
    ├── overview.md
    └── folder-structure.md
```

---

## Next Step

**Stage 2 — M1.1 Foundation & Infrastructure**

Scaffold `cortex/` monorepo per [folder-structure.md](../architecture/folder-structure.md):
- Docker Compose stack
- FastAPI skeleton + Alembic
- Next.js skeleton
- Makefile + CI

Say **"Start Stage 2 M1.1"** to begin implementation.

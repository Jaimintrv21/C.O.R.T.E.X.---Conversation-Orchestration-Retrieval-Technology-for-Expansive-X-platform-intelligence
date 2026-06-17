# C.O.R.T.E.X. Architecture Overview

**C.O.R.T.E.X. — AI Conversation Intelligence Platform**

> *Your AI conversations. Your knowledge. Your control.*

---

## Quick Links

| Document | Description |
|----------|-------------|
| [Folder Structure](./folder-structure.md) | Canonical repo layout |
| [Planning Index](../planning/README.md) | Stage 1 deliverables |
| [PRD](../planning/PRD.md) | Product requirements |
| [Roadmap](../planning/roadmap.md) | Milestones & acceptance criteria |

---

## System Summary

C.O.R.T.E.X. is a self-hostable platform that:

1. **Imports** conversations from ChatGPT, Claude, Gemini, Perplexity, Grok, and generic formats
2. **Indexes** content via Meilisearch (full-text) and pgvector (semantic)
3. **Organizes** with tags, folders, and workspaces
4. **Analyzes** usage patterns and detects duplicate questions
5. **Generates** artifacts (wikis, reports, presentations) — Tier 2
6. **Visualizes** knowledge graphs — Tier 2

---

## Architecture Diagrams

| Level | Document |
|-------|----------|
| C1 — Context | [c4-context.md](../planning/architecture/c4-context.md) |
| C2 — Container | [c4-container.md](../planning/architecture/c4-container.md) |
| C3 — Component | [c4-component.md](../planning/architecture/c4-component.md) |
| C4 — Code | [c4-code.md](../planning/architecture/c4-code.md) |

---

## Data Architecture

- **Primary store:** PostgreSQL 16 (JSONB, FTS, partitioning)
- **Vectors:** pgvector 384-dim (all-MiniLM-L6-v2)
- **Search:** Meilisearch 1.x
- **Cache/Queue:** Redis 7
- **Objects:** MinIO (S3-compatible)
- **Local AI:** Ollama
- **Cloud AI:** LiteLLM (opt-in)

See [ERD](../planning/erd.md) for full schema.

---

## Security Architecture

- **Auth:** JWT RS256 + Argon2id passwords
- **Encryption:** Envelope encryption (master key → user DEK → provider tokens)
- **Privacy:** Zero telemetry; local-first default
- **Threat model:** [STRIDE analysis](../planning/threat-model.md)

---

## Technical Decisions

| TDR | Decision |
|-----|----------|
| [001](../planning/tdr/001-pgvector-over-alternatives.md) | pgvector over Weaviate/Qdrant/Pinecone |
| [002](../planning/tdr/002-meilisearch-over-elasticsearch.md) | Meilisearch over Elasticsearch |
| [003](../planning/tdr/003-celery-over-alternatives.md) | Celery over ARQ/Dramatiq |
| [004](../planning/tdr/004-litellm-ai-routing.md) | LiteLLM for cloud AI routing |
| [005](../planning/tdr/005-caddy-over-nginx.md) | Caddy over Nginx |

---

## Stage Status

| Stage | Status |
|-------|--------|
| Stage 1 — Planning & Architecture | ✅ Complete |
| Stage 2 — Implementation | 🔜 Next |

---

## License

Apache 2.0

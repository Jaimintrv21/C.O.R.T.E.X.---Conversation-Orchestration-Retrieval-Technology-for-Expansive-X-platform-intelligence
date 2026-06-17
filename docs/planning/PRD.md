# C.O.R.T.E.X. Product Requirements Document (PRD)

**Product:** C.O.R.T.E.X. — AI Conversation Intelligence Platform  
**Version:** 1.0  
**Stage:** 1 — Planning & Architecture  
**License:** Apache 2.0  
**Tagline:** *Your AI conversations. Your knowledge. Your control.*

---

## 1. Executive Summary

C.O.R.T.E.X. is an open-source, self-hostable platform that unifies AI conversation history from multiple providers into a single searchable knowledge base. It targets solo developers who need a 10-minute Docker deployment and enterprises that require zero-trust privacy, auditability, and scale.

**North star:** Every decision serves local-first operation, explicit opt-in for external data flows, and composable architecture that scales from one container to multi-tenant Kubernetes.

---

## 2. Problem Statement

| Pain Point | Current Reality | Impact |
|------------|-----------------|--------|
| Fragmented AI history | ChatGPT, Claude, Gemini, Perplexity, Grok siloed | Lost context, repeated work |
| Lost insights | Key decisions buried in chat threads | Poor institutional memory |
| No analytics | No visibility into AI usage patterns | Cannot optimize spend or workflows |
| Vendor lock-in | Conversations trapped in platforms | Migration and compliance risk |
| No institutional memory | Teams cannot share AI learnings | Duplicated effort across org |
| Privacy risk | Chats processed by third-party cloud | Regulatory and trust exposure |
| Repeated queries | Same questions asked repeatedly | Wasted tokens and time |
| No artifact reuse | Insights die in chat threads | No durable knowledge assets |

---

## 3. User Personas

### 3.1 Solo Developer — Alex

| Attribute | Detail |
|-----------|--------|
| **Role** | Indie hacker, uses 3+ AI tools daily |
| **Goals** | Import all chats, semantic search, local Ollama, zero cloud dependency |
| **Pain** | Cannot find "that prompt from last month" across tools |
| **Success metric** | `docker compose up` → first import searchable in < 15 minutes |
| **Privacy stance** | Hard requirement: no telemetry, no external API calls by default |

### 3.2 Knowledge Worker — Jordan

| Attribute | Detail |
|-----------|--------|
| **Role** | Product manager, heavy ChatGPT + Claude user |
| **Goals** | Tag conversations, export reports, duplicate detection |
| **Pain** | Re-asks same research questions; insights not shareable |
| **Success metric** | Finds duplicate questions within 5 seconds; exports PDF weekly |
| **Privacy stance** | OK with cloud LLM if explicitly configured |

### 3.3 Team Lead — Morgan

| Attribute | Detail |
|-----------|--------|
| **Role** | Engineering manager, 8-person team |
| **Goals** | Shared workspace, RBAC, analytics on team AI usage |
| **Pain** | No visibility into what the team learns from AI |
| **Success metric** | 80% of team conversations in shared workspace within 30 days |
| **Privacy stance** | Requires workspace isolation and audit logs (Tier 3) |

### 3.4 Enterprise Admin — Riley

| Attribute | Detail |
|-----------|--------|
| **Role** | IT/Security admin, Fortune 500 |
| **Goals** | SSO, PII redaction, tamper-evident audit, multi-tenant |
| **Pain** | Shadow AI usage with no governance |
| **Success metric** | Pass internal security review; SAML SSO live |
| **Privacy stance** | Zero data leakage; encryption at rest mandatory |

### 3.5 Researcher — Sam

| Attribute | Detail |
|-----------|--------|
| **Role** | Academic / analyst, long conversation archives |
| **Goals** | Knowledge graph, timeline, cross-conversation fact extraction |
| **Pain** | Cannot trace how ideas evolved across months of chats |
| **Success metric** | Interactive knowledge graph with > 90% relevant entity extraction |
| **Privacy stance** | Local-first; anonymization pipeline for published research |

---

## 4. Product Vision & Scope

### 4.1 In Scope (by Tier)

See [roadmap.md](./roadmap.md) for full milestone acceptance criteria.

| Tier | Timeline | Theme |
|------|----------|-------|
| Tier 1 — MVP | Weeks 1–6 (Stage 2–3) | Import, search, analytics, export, Docker, Ollama, auth |
| Tier 2 — Growth | Weeks 7–12 | Compare, knowledge graph, artifacts, RBAC, summarization |
| Tier 3 — Scale | Weeks 13–20 | Plugins, webhooks, SSO, multi-tenant, PII pipeline |
| Tier 4 — Advanced AI | Ongoing | RAG, contradiction detection, multi-modal, memory assistant |

### 4.2 Out of Scope (v1)

- Native mobile apps (responsive web only)
- Real-time collaborative editing of conversations
- Built-in chat interface to replace ChatGPT/Claude (C.O.R.T.E.X. is intelligence layer, not chat client)
- Managed SaaS offering (self-host only in open-source repo)

---

## 5. Functional Requirements

### 5.1 Conversation Import (FR-IMP)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| FR-IMP-01 | Import ChatGPT JSON export | P0 | 1 |
| FR-IMP-02 | Import Claude JSON export | P0 | 1 |
| FR-IMP-03 | Import Gemini export | P0 | 1 |
| FR-IMP-04 | Import Perplexity export | P1 | 1 |
| FR-IMP-05 | Import Grok export | P1 | 1 |
| FR-IMP-06 | Import generic JSON/Markdown | P0 | 1 |
| FR-IMP-07 | Background import with progress WebSocket | P0 | 1 |
| FR-IMP-08 | Idempotent re-import (dedupe by external_id) | P0 | 1 |
| FR-IMP-09 | Versioned parsers with schema negotiation | P0 | 1 |
| FR-IMP-10 | API sync where provider supports it | P1 | 2 |

### 5.2 Search & Discovery (FR-SRC)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| FR-SRC-01 | Full-text search (PostgreSQL + Meilisearch) | P0 | 1 |
| FR-SRC-02 | Semantic search via pgvector embeddings | P0 | 1 |
| FR-SRC-03 | Filter by provider, date, tags, folder | P0 | 1 |
| FR-SRC-04 | Hybrid search (BM25 + vector rerank) | P1 | 2 |
| FR-SRC-05 | Duplicate question detection | P0 | 1 |

### 5.3 Organization (FR-ORG)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| FR-ORG-01 | Tags, folders, favorites, pin | P0 | 1 |
| FR-ORG-02 | Archive and soft-delete | P0 | 1 |
| FR-ORG-03 | Share via token (read-only) | P1 | 2 |
| FR-ORG-04 | Workspace with RBAC | P1 | 2 |

### 5.4 Analytics (FR-ANL)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| FR-ANL-01 | Usage dashboard (conversations, messages, tokens) | P0 | 1 |
| FR-ANL-02 | Topic clusters | P1 | 2 |
| FR-ANL-03 | Provider breakdown | P0 | 1 |
| FR-ANL-04 | Scheduled snapshot aggregation | P0 | 1 |

### 5.5 Export (FR-EXP)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| FR-EXP-01 | Export JSON, Markdown, CSV | P0 | 1 |
| FR-EXP-02 | Export PDF | P0 | 1 |
| FR-EXP-03 | Bulk export by filter | P1 | 1 |

### 5.6 AI & Intelligence (FR-AI)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| FR-AI-01 | Local embeddings via sentence-transformers | P0 | 1 |
| FR-AI-02 | Local LLM via Ollama (summarization) | P1 | 2 |
| FR-AI-03 | Cloud LLM via LiteLLM (opt-in) | P1 | 2 |
| FR-AI-04 | Artifact generation (wiki, report, deck) | P1 | 2 |
| FR-AI-05 | Knowledge graph build | P1 | 2 |
| FR-AI-06 | RAG over conversation history | P2 | 4 |

### 5.7 Authentication & Security (FR-SEC)

| ID | Requirement | Priority | Tier |
|----|-------------|----------|------|
| FR-SEC-01 | Email/password registration and login | P0 | 1 |
| FR-SEC-02 | JWT (RS256) session tokens | P0 | 1 |
| FR-SEC-03 | Multi-user on single instance | P0 | 1 |
| FR-SEC-04 | API keys with scopes | P1 | 3 |
| FR-SEC-05 | Enterprise SSO (SAML/OIDC) | P2 | 3 |
| FR-SEC-06 | AES-256-GCM encryption for provider tokens | P0 | 1 |
| FR-SEC-07 | Audit log (tamper-evident) | P2 | 3 |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-01 | Full-text search p95 latency | < 200 ms (10K conversations) |
| NFR-PERF-02 | Semantic search p95 latency | < 500 ms (100K embeddings) |
| NFR-PERF-03 | Import throughput | ≥ 100 conversations/min (background) |
| NFR-PERF-04 | Dashboard load | < 2 s (first contentful paint) |

### 6.2 Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-REL-01 | API availability (self-hosted) | 99.9% (operator responsibility) |
| NFR-REL-02 | Job retry on failure | 3 attempts with exponential backoff |
| NFR-REL-03 | Database backup | Daily automated pg_dump + MinIO |

### 6.3 Security & Privacy

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SEC-01 | Zero telemetry by default | No outbound calls except configured AI |
| NFR-SEC-02 | Encryption at rest for sensitive fields | AES-256-GCM |
| NFR-SEC-03 | Password hashing | Argon2id |
| NFR-SEC-04 | Rate limiting | Per-user sliding window via Redis |

### 6.4 Operability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-OPS-01 | Single-command deploy | `docker compose up` |
| NFR-OPS-02 | Health endpoints | `/health`, `/ready`, `/live` on all services |
| NFR-OPS-03 | Structured logging | JSON via structlog + OpenTelemetry |

### 6.5 Accessibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-A11Y-01 | WCAG 2.1 AA compliance | All core flows |
| NFR-A11Y-02 | Keyboard navigation | Command palette (cmdk) + focus management |

---

## 7. Success Metrics (KPIs)

### 7.1 Adoption (Self-Hosted)

| Metric | Target (6 months post-release) |
|--------|--------------------------------|
| GitHub stars | 1,000+ |
| Docker pulls (ghcr.io) | 5,000+ |
| Documented successful deploys | 100+ community reports |

### 7.2 Activation

| Metric | Target |
|--------|--------|
| Time to first import | < 15 min from `docker compose up` |
| Time to first search result | < 5 min after import completes |
| Users with ≥ 1 provider imported | 80% of registered users |

### 7.3 Engagement

| Metric | Target |
|--------|--------|
| Weekly active users / registered | 40% |
| Searches per active user per week | ≥ 5 |
| Conversations tagged or foldered | 30% of imported |

### 7.4 Quality

| Metric | Target |
|--------|--------|
| Import success rate | ≥ 99% for supported formats |
| Search relevance (manual eval sample) | ≥ 85% top-5 precision |
| Duplicate detection precision | ≥ 90% at 0.85 similarity threshold |
| Critical security findings (post-audit) | 0 open |

### 7.5 Enterprise Readiness (Tier 3)

| Metric | Target |
|--------|--------|
| SSO integration time | < 4 hours with Keycloak |
| Audit log completeness | 100% of mutating API calls |
| PII redaction recall | ≥ 95% on standard entities |

---

## 8. Core Design Principles (Requirements Traceability)

| Principle | PRD Trace |
|-----------|-----------|
| Local-first, cloud-optional | FR-AI-01, FR-AI-02, NFR-SEC-01 |
| Zero data leakage by default | NFR-SEC-01, privacy-model.md |
| Composable architecture | C4 Container diagram, folder structure |
| Progressive complexity | NFR-OPS-01, Tier roadmap |
| Conversation as first-class object | ERD, FR-ORG, FR-SRC |

---

## 9. Dependencies & Assumptions

### 9.1 Assumptions

- Users can obtain export files from AI providers (Settings → Export Data).
- Self-hosters have Docker 24+ and 8 GB RAM minimum (16 GB recommended with Ollama).
- PostgreSQL 16 and pgvector are acceptable for all target deployments.
- English is primary language for v1 FTS; i18n deferred.

### 9.2 External Dependencies

| Dependency | Purpose | Required? |
|------------|---------|-----------|
| Ollama | Local LLM + optional embeddings | Optional (cloud fallback) |
| LiteLLM | Cloud provider routing | Optional (opt-in) |
| Meilisearch | Typo-tolerant search | Required (Tier 1) |
| MinIO | Attachment/object storage | Required |

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Provider export format changes | High | High | Versioned parsers (FR-IMP-09) |
| Embedding dimension mismatch | Medium | Medium | Configurable vector columns (see pre-stage2-decisions.md) |
| Ollama resource exhaustion | Medium | Medium | Queue limits, cloud fallback |
| Scope creep across tiers | High | High | Strict milestone gates in roadmap |
| Enterprise SSO complexity | Medium | High | Keycloak as optional compose profile |

---

## 11. Open Questions (Resolved in Stage 1)

All pre-Stage-2 questions are resolved in [pre-stage2-decisions.md](./pre-stage2-decisions.md).

---

## 12. Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Architect | — | Stage 1 | Draft |
| Platform Security | — | Stage 1 | Draft |
| Senior Staff Engineer | — | Stage 1 | Draft |

**Stage 1 gate:** All linked deliverables complete → proceed to Stage 2 (Implementation).

---

## Appendix A — Document Index

| Document | Path |
|----------|------|
| C4 Architecture | [architecture/c4-*.md](./architecture/) |
| ERD | [erd.md](./erd.md) |
| Data Flows | [data-flow/](./data-flow/) |
| Sequence Diagrams | [sequence/](./sequence/) |
| TDRs | [tdr/](./tdr/) |
| Privacy Model | [privacy-model.md](./privacy-model.md) |
| Threat Model | [threat-model.md](./threat-model.md) |
| Roadmap | [roadmap.md](./roadmap.md) |
| Pre-Stage-2 Decisions | [pre-stage2-decisions.md](./pre-stage2-decisions.md) |
| Folder Structure | [../architecture/folder-structure.md](../architecture/folder-structure.md) |

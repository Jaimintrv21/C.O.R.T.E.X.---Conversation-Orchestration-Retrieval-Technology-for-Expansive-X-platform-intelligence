# C.O.R.T.E.X. Production Folder Structure

**Version:** 1.0 — Stage 1  
**Status:** Canonical layout for Stage 2 implementation

---

## Complete Tree

```
cortex/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Lint, test, build on every PR
│   │   ├── release.yml               # Tag → build → push Docker images
│   │   └── security.yml              # Trivy + OWASP dependency scan
│   └── CONTRIBUTING.md
│
├── apps/
│   ├── web/                          # Next.js 14 frontend
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   │   ├── (auth)/           # Login, Register, Forgot Password
│   │   │   │   │   ├── login/
│   │   │   │   │   ├── register/
│   │   │   │   │   └── forgot-password/
│   │   │   │   ├── (app)/            # Protected routes
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── conversations/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   ├── compare/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   ├── knowledge/
│   │   │   │   │   ├── artifacts/
│   │   │   │   │   ├── search/
│   │   │   │   │   └── settings/
│   │   │   │   ├── api/              # Next.js API routes (auth proxy)
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui base components
│   │   │   │   ├── features/         # Feature-specific components
│   │   │   │   │   ├── import/
│   │   │   │   │   ├── conversations/
│   │   │   │   │   ├── search/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   ├── knowledge/
│   │   │   │   │   └── artifacts/
│   │   │   │   ├── layouts/          # Shell, Sidebar, Header
│   │   │   │   └── visualizations/   # Graph, Charts, Timeline
│   │   │   ├── hooks/
│   │   │   ├── stores/               # Zustand stores
│   │   │   ├── lib/
│   │   │   │   ├── api.ts            # API client (typed)
│   │   │   │   ├── auth.ts           # Auth.js config
│   │   │   │   └── utils.ts
│   │   │   └── types/                # Shared TypeScript types
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── playwright.config.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── api/                          # FastAPI backend
│       ├── app/
│       │   ├── main.py               # FastAPI app + lifespan
│       │   ├── config.py             # Pydantic settings
│       │   ├── database.py           # Async SQLAlchemy engine
│       │   ├── dependencies.py       # FastAPI dependencies (auth, db)
│       │   ├── middleware/
│       │   │   ├── auth.py
│       │   │   ├── rate_limit.py
│       │   │   ├── logging.py
│       │   │   └── cors.py
│       │   ├── routers/
│       │   │   ├── auth.py
│       │   │   ├── conversations.py
│       │   │   ├── messages.py
│       │   │   ├── search.py
│       │   │   ├── analytics.py
│       │   │   ├── artifacts.py
│       │   │   ├── knowledge_graph.py
│       │   │   ├── jobs.py
│       │   │   ├── imports.py
│       │   │   ├── workspaces.py
│       │   │   └── health.py
│       │   ├── services/
│       │   │   ├── conversation_service.py
│       │   │   ├── embedding_service.py
│       │   │   ├── search_service.py
│       │   │   ├── analytics_service.py
│       │   │   ├── knowledge_service.py
│       │   │   ├── artifact_service.py
│       │   │   ├── provider_sync_service.py
│       │   │   ├── pii_service.py
│       │   │   └── duplicate_service.py
│       │   ├── workers/
│       │   │   ├── celery_app.py
│       │   │   ├── tasks/
│       │   │   │   ├── import_tasks.py
│       │   │   │   ├── embedding_tasks.py
│       │   │   │   ├── analytics_tasks.py
│       │   │   │   ├── artifact_tasks.py
│       │   │   │   └── sync_tasks.py
│       │   │   └── beat_schedule.py
│       │   ├── providers/
│       │   │   ├── base.py           # Abstract provider interface
│       │   │   ├── registry.py       # Parser detection + routing
│       │   │   ├── chatgpt/
│       │   │   │   ├── v1.py
│       │   │   │   └── detector.py
│       │   │   ├── claude/
│       │   │   │   └── v1.py
│       │   │   ├── gemini/
│       │   │   │   └── v1.py
│       │   │   ├── perplexity/
│       │   │   │   └── v1.py
│       │   │   ├── grok/
│       │   │   │   └── v1.py
│       │   │   └── generic/
│       │   │       ├── json.py
│       │   │       └── markdown.py
│       │   ├── models/               # SQLAlchemy ORM models
│       │   ├── schemas/              # Pydantic request/response schemas
│       │   └── utils/
│       │       ├── crypto.py         # AES-GCM, DEK wrap/unwrap
│       │       └── tokens.py         # JWT encode/decode
│       ├── tests/
│       │   ├── unit/
│       │   ├── integration/
│       │   └── e2e/
│       ├── alembic/
│       │   ├── env.py
│       │   └── versions/
│       ├── pyproject.toml
│       └── Dockerfile
│
├── packages/
│   └── shared-types/                 # Shared TypeScript types (npm workspace)
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml        # Full stack (dev + prod)
│   │   ├── docker-compose.dev.yml    # Dev overrides (hot reload)
│   │   ├── docker-compose.prod.yml   # Prod overrides (observability)
│   │   └── docker-compose.minimal.yml # Minimal: no Grafana/Jaeger/Ollama
│   ├── caddy/
│   │   └── Caddyfile
│   ├── prometheus/
│   │   ├── prometheus.yml
│   │   └── alert.rules.yml
│   ├── grafana/
│   │   └── dashboards/
│   │       └── cortex-overview.json
│   ├── k8s/                          # Optional Kubernetes manifests
│   │   └── helm/
│   │       └── cortex/
│   └── scripts/
│       ├── backup.sh
│       ├── restore.sh
│       ├── seed.py                   # Dev seed data
│       └── health_check.sh
│
├── docs/
│   ├── planning/                     # Stage 1 deliverables (this phase)
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── data-flow.md
│   │   ├── security.md
│   │   └── folder-structure.md       # This file
│   ├── api/                          # Auto-generated from OpenAPI
│   ├── self-hosting/
│   │   ├── quick-start.md
│   │   ├── configuration.md
│   │   ├── upgrading.md
│   │   └── troubleshooting.md
│   └── contributing/
│       ├── setup.md
│       ├── code-style.md
│       └── adding-providers.md
│
├── examples/
│   └── sample-data/                  # Synthetic conversations per provider
│       ├── chatgpt/
│       ├── claude/
│       ├── gemini/
│       ├── perplexity/
│       └── grok/
│
├── .env.example
├── .gitignore
├── Makefile                          # dev up / dev down / test / lint / migrate
├── README.md
├── LICENSE                           # Apache 2.0
└── package.json                      # npm workspaces root (optional)
```

---

## Directory Responsibilities

| Path | Owner | Purpose |
|------|-------|---------|
| `apps/web` | Frontend | UI, Auth.js, client state |
| `apps/api` | Backend | REST, WS, business logic |
| `packages/shared-types` | Shared | TS types synced with OpenAPI |
| `infra/docker` | DevOps | Compose profiles, deployment |
| `infra/caddy` | DevOps | Reverse proxy, TLS |
| `docs/planning` | Product | PRD, diagrams, TDRs (Stage 1) |
| `examples/sample-data` | QA | Parser test fixtures |

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Python modules | snake_case | `conversation_service.py` |
| Python classes | PascalCase | `ConversationService` |
| API routes | kebab-case paths | `/api/v1/knowledge-graph` |
| React components | PascalCase files | `ConversationList.tsx` |
| DB tables | snake_case plural | `conversations` |
| Env vars | `C.O.R.T.E.X._` prefix | `C.O.R.T.E.X._DATABASE_URL` |
| Docker services | lowercase | `api`, `worker`, `postgres` |

---

## Module Boundaries (Enforcement)

```
Routers  →  may call Services, never Providers directly
Services →  may call Models, other Services, enqueue Workers
Workers  →  may call Services, Providers
Providers →  pure parse logic, no DB access
```

---

## Stage 2 Bootstrap Order

1. `infra/docker/docker-compose.yml` + `.env.example`
2. `apps/api` skeleton + Alembic migration
3. `apps/web` skeleton + auth pages
4. `packages/shared-types`
5. `Makefile` + `README.md`
6. `.github/workflows/ci.yml`
7. `examples/sample-data/` fixtures

---

## Related Documents

- [C4 Component Diagram](../planning/architecture/c4-component.md)
- [Roadmap](../planning/roadmap.md)

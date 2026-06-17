# C.O.R.T.E.X. Threat Model

**Methodology:** STRIDE per API surface  
**Version:** 1.0  
**Stage:** 1 — Planning

---

## 1. Scope

### 1.1 In Scope

- FastAPI REST endpoints (`/api/v1/*`)
- WebSocket endpoints (`/api/v1/ws/*`)
- Next.js frontend attack surface
- Docker Compose deployment (single-tenant)
- Background workers (Celery)
- Data stores (PostgreSQL, Redis, Meilisearch, MinIO)

### 1.2 Out of Scope (Stage 1)

- Kubernetes multi-tenant isolation (Tier 3)
- Physical datacenter security
- Client device compromise

### 1.3 Trust Boundaries

```
[Internet] ──TLS──▶ [Caddy] ──▶ [Web + API] ──▶ [Data Stores]
                                              ──▶ [Ollama] (internal)
                                              ──opt-in──▶ [Cloud LLMs]
```

---

## 2. Assets

| ID | Asset | Impact if Compromised |
|----|-------|----------------------|
| A1 | Conversation content | IP leakage, embarrassment, regulatory |
| A2 | Provider API keys | Financial abuse, data exfil from providers |
| A3 | User credentials | Account takeover |
| A4 | JWT signing keys | Forge sessions, full API access |
| A5 | Master encryption key | Decrypt all provider tokens |
| A6 | Embeddings | Semantic inference of private topics |
| A7 | Audit logs | Cover tracks of attacker |

---

## 3. STRIDE Analysis — Authentication Endpoints

**Surface:** `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`

| Threat | Category | Description | Risk | Mitigation |
|--------|----------|-------------|------|------------|
| T-AUTH-01 | Spoofing | Credential stuffing | High | Rate limit; Argon2id; account lockout |
| T-AUTH-02 | Tampering | JWT alg=none attack | High | RS256 only; reject none |
| T-AUTH-03 | Repudiation | Deny login event | Med | audit_logs on login |
| T-AUTH-04 | Info Disclosure | User enumeration via register | Med | Generic "invalid credentials" |
| T-AUTH-05 | DoS | Login flood | Med | Redis sliding window rate limit |
| T-AUTH-06 | Elevation | Role manipulation in JWT | High | Role from DB, not JWT claim alone |

---

## 4. STRIDE Analysis — Conversation Endpoints

**Surface:** `GET/POST/PATCH/DELETE /conversations`, `/conversations/{id}/messages`

| Threat | Category | Description | Risk | Mitigation |
|--------|----------|-------------|------|------------|
| T-CONV-01 | Spoofing | Access other user's conversations | Critical | user_id filter on all queries |
| T-CONV-02 | Tampering | Modify another user's tags | High | Ownership check middleware |
| T-CONV-03 | Repudiation | Deny deletion | Med | audit_logs |
| T-CONV-04 | Info Disclosure | IDOR via UUID guess | Med | UUID v4; 403 not 404 |
| T-CONV-05 | DoS | Import massive file | High | File size limit; storage quota |
| T-CONV-06 | Elevation | Viewer role writes | High | RBAC decorator per route |

---

## 5. STRIDE Analysis — Import Endpoints

**Surface:** `POST /imports/upload`, `WS /imports/{id}/progress`

| Threat | Category | Description | Risk | Mitigation |
|--------|----------|-------------|------|------------|
| T-IMP-01 | Spoofing | Upload to another user's job | High | job.user_id == current_user |
| T-IMP-02 | Tampering | Zip slip path traversal | Critical | Sanitize extract paths; store blob as-is |
| T-IMP-03 | Repudiation | — | Low | Job audit trail |
| T-IMP-04 | Info Disclosure | Error leaks internal paths | Med | Generic errors in production |
| T-IMP-05 | DoS | Zip bomb (42.zip) | Critical | Max uncompressed ratio check |
| T-IMP-06 | Elevation | Malicious JSON executes code | Critical | Parse with json.loads only; no eval |

---

## 6. STRIDE Analysis — Search Endpoints

**Surface:** `GET /search`, `GET /search/semantic`

| Threat | Category | Description | Risk | Mitigation |
|--------|----------|-------------|------|------------|
| T-SRC-01 | Spoofing | Cross-user search results | Critical | user_id/workspace filter mandatory |
| T-SRC-02 | Tampering | Query injection in Meilisearch | Med | Parameterized filter; escape user input |
| T-SRC-03 | Repudiation | — | Low | — |
| T-SRC-04 | Info Disclosure | Search reveals deleted convos | Med | Filter deleted_at IS NULL |
| T-SRC-05 | DoS | Expensive vector scan | Med | Rate limit; query timeout |
| T-SRC-06 | Elevation | Workspace boundary bypass | High | workspace membership check |

---

## 7. STRIDE Analysis — Artifact Endpoints

**Surface:** `POST /artifacts`, `GET /artifacts/{id}`, share tokens

| Threat | Category | Description | Risk | Mitigation |
|--------|----------|-------------|------|------------|
| T-ART-01 | Spoofing | Generate artifact from others' convos | High | source_ids ownership validation |
| T-ART-02 | Tampering | Modify artifact content | Med | Immutable after ready; version bump |
| T-ART-03 | Repudiation | — | Low | audit_logs |
| T-ART-04 | Info Disclosure | Share token brute force | Med | 128-bit token; rate limit |
| T-ART-05 | DoS | LLM prompt exhaustion | High | Queue concurrency=1; token budget |
| T-ART-06 | Elevation | Prompt injection to system | High | Sandboxed prompts; no tool execution |

---

## 8. STRIDE Analysis — Knowledge Graph Endpoints

**Surface:** `POST /knowledge/build`, `GET /knowledge/graph`

| Threat | Category | Description | Risk | Mitigation |
|--------|----------|-------------|------|------------|
| T-KG-01 | Spoofing | Build graph from foreign workspace | High | workspace_id authorization |
| T-KG-02 | Tampering | Inject false nodes | Med | User-scoped writes only |
| T-KG-03 | Repudiation | — | Low | Job logs |
| T-KG-04 | Info Disclosure | Graph reveals cross-user entities | Med | Workspace isolation |
| T-KG-05 | DoS | Full rebuild on every click | Med | Debounce; incremental builds |
| T-KG-06 | Elevation | — | Low | — |

---

## 9. STRIDE Analysis — Workspace & Admin

**Surface:** `/workspaces`, `/users`, `/api-keys`

| Threat | Category | Description | Risk | Mitigation |
|--------|----------|-------------|------|------------|
| T-WS-01 | Spoofing | Invite phishing | Med | Signed invite tokens |
| T-WS-02 | Tampering | Escalate to admin role | Critical | Only owner can promote |
| T-WS-03 | Repudiation | Deny role change | Med | audit_logs with before/after |
| T-WS-04 | Info Disclosure | List all users | Med | Admin only endpoint |
| T-WS-05 | DoS | Mass invite emails | Low | No email in Tier 1 |
| T-WS-06 | Elevation | API key scope bypass | High | Scope enforcement per route |

---

## 10. STRIDE Analysis — WebSocket

**Surface:** `WS /jobs/{id}/progress`, `WS /imports/{id}/progress`

| Threat | Category | Description | Risk | Mitigation |
|--------|----------|-------------|------|------------|
| T-WSO-01 | Spoofing | Subscribe to others' jobs | High | JWT + job ownership on connect |
| T-WSO-02 | Tampering | Inject false progress | Low | Server-only publish |
| T-WSO-03 | Repudiation | — | Low | — |
| T-WSO-04 | Info Disclosure | Job payload in progress | Med | Progress detail sanitized |
| T-WSO-05 | DoS | WS connection flood | Med | Connection limit per user |
| T-WSO-06 | Elevation | — | Low | — |

---

## 11. STRIDE Analysis — Infrastructure

| Threat | Category | Description | Risk | Mitigation |
|--------|----------|-------------|------|------------|
| T-INF-01 | Spoofing | Redis unauthenticated | Critical | Redis password required |
| T-INF-02 | Tampering | MinIO bucket public | Critical | Private buckets only |
| T-INF-03 | Repudiation | Audit log deletion | High | Append-only; Tier 3 hash chain |
| T-INF-04 | Info Disclosure | PostgreSQL port exposed | Critical | Internal network only in compose |
| T-INF-05 | DoS | Ollama memory exhaustion | Med | Request queue; model limits |
| T-INF-06 | Elevation | Docker socket mount | Critical | Never mount docker.sock |

---

## 12. Risk Matrix Summary

| Severity | Count | Top Items |
|----------|-------|-----------|
| Critical | 8 | IDOR, zip bomb, Redis/PG exposure, role escalation |
| High | 14 | Rate limits, JWT, share tokens, prompt injection |
| Medium | 12 | Enumeration, search injection, WS limits |
| Low | 6 | Repudiation gaps |

---

## 13. Security Controls Checklist (Stage 2 Implementation)

### Must-Have (Tier 1)
- [ ] JWT RS256 with short access token TTL (15 min) + refresh rotation
- [ ] Argon2id password hashing
- [ ] Rate limiting on auth and import (slowapi + Redis)
- [ ] IDOR prevention on all resource routes
- [ ] Zip bomb detection (max 100:1 compression ratio)
- [ ] CORS restricted to configured origin
- [ ] Security headers via Caddy
- [ ] Secrets via env vars (never committed)
- [ ] AES-256-GCM for provider tokens

### Should-Have (Tier 2)
- [ ] CSRF double-submit cookie on mutating routes
- [ ] Content Security Policy
- [ ] API key scopes
- [ ] 2FA (TOTP)

### Enterprise (Tier 3)
- [ ] Tamper-evident audit log hash chain
- [ ] SAML/OIDC via Keycloak
- [ ] PII redaction pipeline
- [ ] Network policies (K8s)

---

## 14. Attack Trees (Top 3)

### 14.1 Steal All Conversations
```
Goal: Exfiltrate A1
├── Stolen JWT ──▶ Mitigated: short TTL, HTTPS
├── IDOR ──▶ Mitigated: ownership checks
├── SQL injection ──▶ Mitigated: SQLAlchemy parameterized
└── DB port exposed ──▶ Mitigated: internal network
```

### 14.2 Use Victim's Cloud API Keys
```
Goal: Abuse A2
├── Steal C.O.R.T.E.X._MASTER_KEY ──▶ Mitigated: Vault, env isolation
├── SQL dump ──▶ Mitigated: encrypted_token bytes useless without DEK
└── Memory dump ──▶ Mitigated: DEK in session scope only
```

### 14.3 Deny Service
```
Goal: Disrupt availability
├── Import zip bomb ──▶ Mitigated: ratio check
├── Search flood ──▶ Mitigated: rate limit
└── Ollama OOM ──▶ Mitigated: queue concurrency
```

---

## Related Documents

- [Privacy Model](./privacy-model.md)
- [PRD — NFR Security](./PRD.md#63-security--privacy)
- [TDR-005 Caddy Security Headers](./tdr/005-caddy-over-nginx.md)

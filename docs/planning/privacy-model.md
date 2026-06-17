# C.O.R.T.E.X. Privacy Model

**Version:** 1.0  
**Classification:** Internal — Stage 1  
**Principle:** Zero data leakage by default

---

## 1. Privacy Philosophy

C.O.R.T.E.X. is designed for users who treat AI conversations as **sensitive intellectual property**. Privacy is not a feature toggle — it is the default architecture.

| Commitment | Implementation |
|------------|----------------|
| No telemetry | No outbound analytics SDKs; no phone-home |
| No default cloud | Ollama + local embeddings unless user opts in |
| User owns data | Self-hosted PostgreSQL + MinIO |
| Explicit consent | Cloud LLM, API sync, public sharing require affirmative action |
| Minimal collection | Only data required for stated features |

---

## 2. Data Classification

### 2.1 Classification Levels

| Level | Label | Description | Examples |
|-------|-------|-------------|----------|
| L1 | **Public** | Safe for anonymous sharing | Provider names, public docs |
| L2 | **Internal** | User workspace data | Conversation titles, tags, embeddings |
| L3 | **Confidential** | Message content | User prompts, AI responses |
| L4 | **Restricted** | Credentials & keys | Provider API tokens, JWT secrets, DEKs |

### 2.2 Data Inventory

| Data Element | Classification | Storage | Encrypted at Rest | External Transfer |
|--------------|----------------|---------|-------------------|-------------------|
| User email | L3 | PostgreSQL | No (hashed password separate) | Never |
| Password hash | L4 | PostgreSQL | N/A (Argon2id) | Never |
| Conversation content | L3 | PostgreSQL | Optional Tier 3 | Never (default) |
| Message embeddings | L2 | PostgreSQL pgvector | No | Never |
| Provider API keys | L4 | PostgreSQL BYTEA | AES-256-GCM | Only to configured provider |
| Raw import files | L3 | MinIO | SSE-S3 | Never |
| Session tokens | L4 | Redis + PG hash | N/A | Never |
| Audit logs | L3 | PostgreSQL | No | Never |
| Analytics snapshots | L2 | PostgreSQL JSONB | No | Never |

---

## 3. Encryption Strategy

### 3.1 In Transit

| Path | Protocol | Minimum |
|------|----------|---------|
| Browser → Caddy | TLS 1.3 | Required (production) |
| Internal Docker network | HTTP | Acceptable (single-host) |
| C.O.R.T.E.X. → Ollama | HTTP | Localhost only |
| C.O.R.T.E.X. → Cloud LLM | TLS 1.2+ | When opt-in enabled |

### 3.2 At Rest

```
Master Key (C.O.R.T.E.X._MASTER_KEY, env/Vault)
    └── wraps → User DEK (per user, in users.encrypted_dek)
            └── encrypts → provider_accounts.encrypted_token
            └── encrypts → (optional) message.content_encrypted [Tier 3]
```

| Component | Method | Key Management |
|-----------|--------|----------------|
| Provider tokens | AES-256-GCM | User DEK |
| User DEK | AES-256-GCM wrap | Master key |
| Passwords | Argon2id | N/A |
| JWT signing | RS256 | Key pair in env/Vault |
| MinIO objects | SSE-S3 (optional) | MinIO master key |
| PostgreSQL volume | LUKS/disk encryption | Operator responsibility |

### 3.3 Optional Password-Derived Encryption (Tier 3)

Users enabling **"Encrypt with my password"**:
- DEK wrapped with `PBKDF2(password, salt, 600000 iterations)`
- Session-scoped DEK in Redis during active session
- Background jobs deferred or require user unlock

---

## 4. Data Flow Controls

### 4.1 Default (Local-First)

```
User → C.O.R.T.E.X. (self-hosted) → Ollama (local)
         ↓
    PostgreSQL + MinIO
```

**No external network egress** except DNS (optional disable).

### 4.2 Opt-In Cloud LLM

```
User enables in Settings → AI Providers
    → API key encrypted and stored
    → Each LLM call logged in audit_logs
    → User shown token count / cost estimate
```

### 4.3 Opt-In Provider Sync

```
User connects ChatGPT/Claude account
    → OAuth token encrypted
    → Sync pulls only user's conversations
    → Revocation deletes token bytes
```

### 4.4 Public Sharing

```
User generates share_token
    → Read-only view of single conversation/artifact
    → No indexable by search engines (robots noindex)
    → Revocable instantly
```

---

## 5. Retention Policies

### 5.1 Default Retention

| Data | Retention | Deletion |
|------|-----------|----------|
| Conversations | Until user deletes | Soft delete → hard delete after 30 days |
| Messages | Cascade with conversation | Partition drop after hard delete |
| Embeddings | Cascade with entity | Immediate on hard delete |
| Import raw files | 7 days after successful import | MinIO lifecycle rule |
| Sessions | 30 days idle | Auto-revoke |
| Jobs | 90 days | Archive then purge |
| Audit logs | 1 year (configurable) | Enterprise: tamper-evident archive |

### 5.2 User-Initiated Deletion

| Action | Scope | Effect |
|--------|-------|--------|
| Delete conversation | Single | Soft delete; embeddings removed on hard delete |
| Delete account | All user data | CASCADE all tables; MinIO purge job |
| Export then delete | GDPR-style portability | Export job → confirm → account deletion |

### 5.3 Enterprise Retention (Tier 3)

Configurable via workspace settings:
```json
{
  "retention_days": 365,
  "auto_archive_after_days": 90,
  "hard_delete_after_days": 730,
  "audit_log_retention_days": 2555
}
```

---

## 6. Access Control

| Role | Own data | Workspace data | Admin |
|------|----------|----------------|-------|
| user | CRUD | member: read/write per RBAC | — |
| admin | CRUD | admin: all in workspace | user management |
| superadmin | CRUD | all workspaces | system config |
| viewer | read | read only | — |

---

## 7. PII Handling

### 7.1 PII Types Detected (Tier 3 pipeline)

| Type | Detection | Action |
|------|-----------|--------|
| Email | Regex + NER | Redact → `[EMAIL]` |
| Phone | Regex | Redact → `[PHONE]` |
| SSN / national ID | Regex | Redact → `[ID]` |
| Credit card | Luhn + regex | Redact → `[CC]` |
| Person name | spaCy NER | Redact → `[NAME]` (configurable) |

Registry: `pii_redactions` table stores hash of original (not plaintext) for audit.

### 7.2 Right to Erasure

PII redaction is **non-destructive** by default (reversible with key). Hard erasure overwrites content field with null.

---

## 8. Compliance Alignment

| Framework | C.O.R.T.E.X. Alignment |
|-----------|-----------------|
| GDPR | Export, delete, consent, data minimization |
| SOC 2 | Audit logs, access control, encryption (Tier 3) |
| HIPAA | Not certified; operator responsible for PHI |
| ISO 27001 | Self-hosters implement surrounding controls |

**Disclaimer:** C.O.R.T.E.X. provides tooling; compliance is shared responsibility with operator.

---

## 9. Privacy Review Checklist (Stage Gate)

- [x] No telemetry in codebase plan
- [x] Cloud LLM opt-in documented
- [x] Encryption strategy defined
- [x] Retention policies documented
- [x] Data classification complete
- [x] PII pipeline designed (Tier 3)

---

## Related Documents

- [Threat Model](./threat-model.md)
- [Pre-Stage-2 Decisions](./pre-stage2-decisions.md)
- [TDR-004 LiteLLM](./tdr/004-litellm-ai-routing.md)

# Pre-Stage-2 Decision Record

**Status:** Resolved — Stage 1 Gate  
**Date:** 2026-06-16

These questions must be answered before Stage 2 (Implementation) begins. All decisions below are **binding** for initial implementation.

---

## Q1: What export format does each provider currently use?

Full schema documentation: [data-flow/provider-schemas.md](./data-flow/provider-schemas.md)

| Provider | Export Method | Format | Parser ID | Schema Version |
|----------|---------------|--------|-----------|----------------|
| **ChatGPT** | Settings → Data Controls → Export | ZIP containing `conversations.json` | `chatgpt_json` | v1 (OpenAI export as of 2024–2026) |
| **Claude** | claude.ai → Settings → Export Data | ZIP containing `conversations.json` | `claude_json` | v1 (Anthropic export) |
| **Gemini** | Google Takeout (Bard/Gemini activity) or in-app export | JSON (`MyActivity.json` or app-specific) | `gemini_json` | v1 |
| **Perplexity** | Settings → Export (when available) or manual JSON | JSON array of threads | `perplexity_json` | v1 (community-documented) |
| **Grok** | x.ai / X data export | JSON (evolving) | `grok_json` | v1 (best-effort) |
| **Generic** | User-uploaded | JSON array or Markdown chat logs | `generic_json`, `generic_markdown` | v1 |

### Key structural differences

| Provider | Conversation ID field | Message tree | Role names | Timestamps |
|----------|----------------------|--------------|------------|------------|
| ChatGPT | `id` in conversation; messages in `mapping` dict | Tree via `parent`/`children` | `author.role`: user/assistant/system | Unix float `create_time` |
| Claude | `uuid` | Flat `chat_messages[]` | `sender`: human/assistant | ISO 8601 `created_at` |
| Gemini | Varies (Takeout vs app) | Flat or nested | `role` or inferred | ISO or epoch ms |
| Perplexity | `id` or `thread_id` | Flat messages array | `role`: user/assistant | ISO 8601 |
| Grok | `conversation_id` | Flat | `role` | ISO 8601 |

**Implementation note:** Each provider gets a dedicated parser class implementing `ProviderParser` interface with `detect()`, `parse()`, and `schema_version` properties.

---

## Q2: What happens when a provider changes their export format?

### Decision: Versioned parsers with schema negotiation

```
providers table
  └── parser_version: 'v1' | 'v2' | ...

apps/api/app/providers/
  └── chatgpt/
      ├── v1.py          # Current production parser
      ├── v2.py          # Future parser (when format changes)
      └── detector.py    # Auto-detect schema version from file structure
```

### Parser selection algorithm

1. **Detect:** Run lightweight heuristics on uploaded file (top-level keys, required fields).
2. **Match:** Map to `(provider_slug, schema_version)` tuple.
3. **Parse:** Invoke matching parser; emit normalized `NormalizedConversation` / `NormalizedMessage` models.
4. **Fail gracefully:** If no match, return structured error with detected keys for user report.
5. **Store metadata:** Persist `metadata.parser_version` and `metadata.raw_schema_fingerprint` on each import job.

### Schema negotiation rules

| Scenario | Behavior |
|----------|----------|
| Known v1 file | Parse with v1 parser |
| Known v2 file (future) | Parse with v2 parser |
| Unknown structure | Reject with `UNSUPPORTED_SCHEMA`; log fingerprint for developer triage |
| Partial v1 match | Attempt v1; if > 5% message parse failures, abort and report |
| Re-import same external_id | Upsert (idempotent); do not duplicate messages |

### Migration path when provider ships v2

1. Ship v2 parser alongside v1 (no breaking change).
2. Update `detector.py` to recognize v2 signatures first.
3. Add integration tests with fixture files for both versions.
4. Deprecation window: v1 parser maintained for 12 months after v2 detection rate > 95%.

---

## Q3: Which embedding model is default for local-first?

### Decision: `sentence-transformers/all-MiniLM-L6-v2`

| Attribute | Value |
|-----------|-------|
| Model | `all-MiniLM-L6-v2` |
| Dimensions | **384** |
| Max sequence | 256 tokens (chunk longer messages) |
| License | Apache 2.0 |
| Inference | In-process via `sentence-transformers` library |
| Fallback | Ollama `nomic-embed-text` (768 dim) if GPU/RAM constrained config |
| Cloud fallback | OpenAI `text-embedding-3-small` (1536 dim) — **opt-in only** |

### Schema implication

The ERD uses a **flexible embedding storage** approach:

```sql
-- embeddings.embedding stored as vector(384) for default model
-- dimensions column records actual size; index created per dimension bucket
ALTER TABLE embeddings ALTER COLUMN embedding TYPE vector(384);  -- default migration
```

**Rationale:** 384 dimensions reduces storage 4× vs 1536, sufficient for conversation search at personal/team scale. HNSW index on 384-dim vectors is faster for local deployments.

Configuration in `.env`:

```env
C.O.R.T.E.X._EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
C.O.R.T.E.X._EMBEDDING_DIMENSIONS=384
C.O.R.T.E.X._EMBEDDING_CHUNK_SIZE=512
C.O.R.T.E.X._EMBEDDING_CHUNK_OVERLAP=64
```

---

## Q4: How is encryption key managed per user?

### Decision: Layered key hierarchy (not password-derived for server-side bulk encryption)

After security review, **PBKDF2-from-password alone is rejected** for server-side conversation encryption because:

- Password changes would require re-encrypting all user data.
- Server must decrypt for search indexing without user online.
- Password-derived keys cannot support background workers (Celery).

### Adopted model: Envelope encryption with master key + per-user DEK

```
┌─────────────────────────────────────────────────────────┐
│  C.O.R.T.E.X._MASTER_KEY (env / Vault)                         │
│  32-byte AES-256 key, never in database                 │
└───────────────────────┬─────────────────────────────────┘
                        │ wraps
                        ▼
┌─────────────────────────────────────────────────────────┐
│  User DEK (Data Encryption Key) — per user, random      │
│  Stored: users.encrypted_dek + users.dek_iv (BYTEA)     │
│  Algorithm: AES-256-GCM wrap of 32-byte DEK             │
└───────────────────────┬─────────────────────────────────┘
                        │ encrypts
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Sensitive fields:                                      │
│  • provider_accounts.encrypted_token                    │
│  • Optional: message content (Tier 3 feature flag)    │
└─────────────────────────────────────────────────────────┘
```

### Optional user password enhancement (Tier 3)

For users who enable **"Encrypt with my password"**:

- Derive `UserKey = PBKDF2(password, user_salt, 600000, SHA256)` → 32 bytes.
- Store `wrapped_dek = AES-GCM(UserKey, DEK)` instead of master-wrapped DEK.
- On login, unwrap DEK into session-scoped Redis key (TTL = session lifetime).
- Background jobs use session-delegated key or queue until user online.

**Default (Tier 1):** Master key wraps DEK; sufficient for self-hosted trust boundary where operator controls the server.

### Key rotation

| Event | Action |
|-------|--------|
| Master key rotation | Re-wrap all user DEKs (background job) |
| User password change (optional mode) | Re-wrap DEK with new PBKDF2 output |
| Provider token update | Encrypt with user DEK, new IV per write |

### Schema addition (Stage 2 migration)

```sql
ALTER TABLE users ADD COLUMN encrypted_dek BYTEA;
ALTER TABLE users ADD COLUMN dek_iv BYTEA;
ALTER TABLE users ADD COLUMN encryption_mode VARCHAR(32) DEFAULT 'server';  -- 'server' | 'password'
```

---

## Summary Table

| Question | Decision |
|----------|----------|
| Provider formats | Documented per provider; see provider-schemas.md |
| Format changes | Versioned parsers + auto-detection + idempotent upsert |
| Default embedding | `all-MiniLM-L6-v2`, 384 dimensions |
| Encryption keys | Envelope encryption: master key → per-user DEK → field encryption |

**Stage 2 may proceed.**

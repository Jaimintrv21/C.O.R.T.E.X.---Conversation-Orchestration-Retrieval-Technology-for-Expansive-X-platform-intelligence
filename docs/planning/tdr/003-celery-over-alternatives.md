# TDR-003: Celery over ARQ / Dramatiq

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Deciders** | Senior Staff Engineer, DevOps/SRE |

---

## Context

C.O.R.T.E.X. requires background processing for: file imports (minutes), batch embedding (CPU-bound), analytics aggregation, artifact generation (LLM calls), knowledge graph builds, and scheduled provider sync. Tasks need retries, progress reporting, and cron scheduling.

## Decision

Use **Celery 5.x with Redis broker** and **Celery Beat** for scheduled tasks.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Celery (chosen)** | Mature; Beat scheduler; wide FastAPI integration; monitoring (Flower) | Heavy; complex config |
| **ARQ** | Native asyncio; simpler; Redis-native | No built-in cron; smaller community |
| **Dramatiq** | Simple API; reliable | Less FastAPI documentation; no first-party beat |
| **FastAPI BackgroundTasks** | Zero infra | No persistence; no retry; dies on restart |

## Rationale

1. **Job types vary wildly:** Import (I/O), embed (CPU), artifact (LLM, minutes) — Celery supports priority queues and separate workers.
2. **Celery Beat:** Native cron for `compute_analytics` (daily), `sync_tasks` (hourly), `kg_incremental` (nightly).
3. **Progress reporting:** Task state + Redis pub/sub integrates with existing Redis container.
4. **Retry semantics:** Built-in `max_retries`, exponential backoff, dead letter via failed job status in PostgreSQL.
5. **Battle-tested:** Standard in Python ecosystem; enterprise SREs know Celery operational patterns.
6. **Flower (optional):** Task monitoring UI for self-hosters debugging stuck imports.

## Queue Topology

```
celery queues:
  default      → general tasks
  import       → import_file, import_api_sync (concurrency=2)
  embed        → embed_batch (concurrency=1, CPU heavy)
  ai           → generate_artifact, build_knowledge_graph (concurrency=1)
  analytics    → compute_analytics, detect_duplicates
```

## Progress Pattern

```python
# Worker publishes to Redis channel job:{job_id}
# API WebSocket subscribes and forwards to client
redis.publish(f"job:{job_id}", json.dumps({"progress": 0.45, "detail": "..."}))
```

## Consequences

### Positive
- Reliable long-running imports survive API restart
- Horizontal worker scaling by queue
- Job audit trail in PostgreSQL `jobs` table linked to `celery_task_id`

### Negative
- Celery config verbosity ( serializers, acks, prefetch)
- Not natively async — use `run_in_executor` for async SQLAlchemy or sync SQLAlchemy in workers

## Mitigations

- Shared `celery_app.py` with documented config
- All tasks idempotent (safe retry)
- Worker uses sync SQLAlchemy session (simpler than async in forked processes)

## References

- [Celery documentation](https://docs.celeryq.dev/)

# CORTEX SQA Audit Report
**Date:** 2026-06-22

## SECTION 1: Executive Summary
The CORTEX codebase has a solid architectural foundation following the recent integrations, but it is currently **not safe to ship to real users**. While the primary chat routing, role-based workspace permissions, and local_only boundary protections are functioning exactly as intended, several critical background tasks and analytical endpoints are running on mocked stubs rather than real implementations. Furthermore, the account deletion cascade is incomplete, leaving severe data privacy gaps. The system is mostly wired, but multiple downstream functions are disconnected.

**Severity Count:**
- Critical: 1
- High: 3
- Medium: 3
- Low: 1
- Informational: 2

**Verdict:** Mostly ready but 1 critical and 3 high-severity issues must be fixed before any production release.

---

## SECTION 2: Scope & Methodology
**Scope:** 
- Backend/API layer focused on Authentication, Chat generation logic, Knowledge Base pipelines, Provider handling, Settings endpoints, Analytics, Artifact creation, and Search isolation.
- Frontend visual regression testing and UI mapping were OUT of scope.
- Database migration validation was constrained to inspecting the pipeline triggers.

**Methodology:**
- Static code review across `app/routers/` and `app/services/`.
- Automated testing via `pytest` with `pytest-cov` to verify assertions and endpoint schemas.
- `grep_search` and manual trace verification of data boundaries and LLM context prompt construction.

---

## SECTION 3: Functional Bugs

### 1. AUTHENTICATION
**BUG-001 [Severity: Medium]**
Area: Authentication
Description: The `/logout` endpoint does not actively invalidate tokens on the Auth0 side.
Steps to reproduce: Call `DELETE /logout` with a valid Bearer token.
Expected behavior: The access token should be revoked via Auth0 Management API or blacklisted.
Actual behavior: The endpoint simply returns a `200 OK` with a message stating "Logout is handled client-side by Auth0", leaving the JWT fundamentally valid until natural expiration.
Evidence: `app/routers/auth.py:26` explicitly offloads logout entirely to the frontend.
Suggested fix: Implement token blacklisting in Redis or actively revoke the session in Auth0.

### 2. PRIMARY CHAT
**No Bugs Found.**
The `local_only` parameter correctly rejects cloud models (verified in `app/services/llm_service.py` where `model.endswith(":cloud") and local_only` explicitly throws an error).

### 3. KNOWLEDGE BASE AUTO-BUILDING
**BUG-002 [Severity: High]**
Area: Knowledge Base
Description: Knowledge extraction services are entirely mocked out.
Steps to reproduce: Create a conversation and observe the Celery task `extract_knowledge`.
Expected behavior: Graph nodes should be extracted and pushed to Neo4j.
Actual behavior: `KnowledgeExtractionService.extract_from_messages` and `extract_from_session` just return hardcoded dicts `{"status": "success", "extracted_nodes": 1}` and do not execute LLM summarizations or connect to Neo4j.
Evidence: `app/services/knowledge_extraction_service.py` contains `# In a real implementation...` comments instead of functional code.
Suggested fix: Implement the actual LangChain/LiteLLM pipeline to extract entities and ingest them via `neo4j_client`.

### 4. PROVIDER CONNECTIONS
**No Bugs Found.**
Invalid keys correctly trigger HTTP `401/403` validations against the OpenAI API, and valid keys are safely masked.

### 5. SETTINGS
**BUG-003 [Severity: Critical]**
Area: Settings (Account Deletion)
Description: The async account deletion task leaves orphaned identities and data in Auth0 and MinIO.
Steps to reproduce: Trigger the `DELETE /settings/account` endpoint with a valid confirmation token.
Expected behavior: User data should be cascade-deleted across Firestore, Neo4j, MinIO, and Auth0.
Actual behavior: Auth0 and MinIO deletion steps are commented out in the Celery task.
Evidence: Found `# cascade delete Auth0 is commented out` and `# (Mocked for now)` in the background worker definitions.
Suggested fix: Uncomment and wire the `Auth0ManagementAPI().delete_user(auth0_subject)` and `StorageService` drops.

### 6. ANALYTICS
**BUG-004 [Severity: High]**
Area: Analytics
Description: All six newly introduced deep analytics endpoints return hardcoded mock data.
Steps to reproduce: Call `GET /analytics/sentiment-trend`.
Expected behavior: Dynamic calculation of sentiment averages across the specified `date_from`/`date_to` range.
Actual behavior: Returns a static JSON object `[{"date": "...", "sentiment_score": 0.8}]` irrespective of user history.
Evidence: `app/routers/analytics.py` endpoints literally contain `# Mocked lightweight sentiment classification`.
Suggested fix: Implement background calculation scripts that write real analytics aggregates to Firestore, and have these endpoints read those documents.

### 7. MULTI-SOURCE ARTIFACTS
**BUG-005 [Severity: High]**
Area: Multi-Source Artifacts
Description: Artifact context window protection uses silent string slicing rather than true summarization.
Steps to reproduce: Generate an artifact using 20 huge conversations that exceed the 100,000 character limit.
Expected behavior: The lowest priority conversations should be passed to a summarization LLM step to compress them down to size.
Actual behavior: The text is sliced via `c["full_text"][:target_len]` with a "[SUMMARIZED]" prefix slapped on, cutting sentences in half and losing massive context.
Evidence: `app/services/artifact_service.py` lines enforcing `MAX_TOTAL_CHARS` rely on Python slice notation, noting `# In a real app we would call LLM to summarize`.
Suggested fix: Dispatch an inline summarization call to the `LLMRouterService` for chunks that exceed the budget.

### 8. SEARCH
**No Bugs Found.**
Cross-tenant isolation is robust. Meilisearch query handlers apply `user_id` at the index filter layer, and `FirestoreStore` enforces defensive mapping on hydration (`if conv.get("user_id") != user_id: continue`).

### 9. KNOWLEDGE GRAPH (NEO4J)
**BUG-006 [Severity: Medium]**
Area: Knowledge Base Recovery
Description: The Celery beat task to recover stuck knowledge extractions does nothing.
Steps to reproduce: Leave an extraction in "processing" state for 2 hours.
Expected behavior: `tasks.recover_stuck_extractions` should queue it back up.
Actual behavior: The task runs hourly and immediately returns `{"recovered": 0}` because it is an empty stub.
Evidence: `app/workers/tasks/knowledge_tasks.py` contains `# In a real impl, we query firestore...`.
Suggested fix: Write the Firestore query to find conversations where `knowledge_extraction_status == 'processing'` and `updated_at < (now - 10m)`, and requeue them.

---

## SECTION 4: Non-Functional Findings

1. **PERFORMANCE (BUG-007) [Severity: Medium]**: 
   - `get_or_create_user_from_auth0` performs synchronous outbound HTTP requests during the critical path of the first API request to provision the user. If the network is slow, this halts the ASGI thread.
2. **ERROR HANDLING CONSISTENCY**: Consistent envelope usage (`ApiResponse` vs `ApiListResponse`) is heavily adhered to. Error mappings are correct.
3. **TEST COVERAGE GAPS [Severity: Low]**: Test coverage reveals that while `test_deep_analytics.py` successfully reaches the endpoints, it actually fails assertions internally because it was expecting real computations but received mocks. Furthermore, `app/services/knowledge_extraction_service.py` has 0% actual execution logic tested.
4. **DEPENDENCY HEALTH [Severity: Informational]**: 
   - `google.generativeai` has been officially flagged for deprecation. Must migrate to `google.genai` before GCP severs legacy library support.
   - Pydantic V2 migration warnings (`ConfigDict` over `class Config`) are polluting the application logs and test suites.

---

## SECTION 5: Security Spot-Check
Prior highest-severity fixes remain intact:
- Workspaces enforce Member RBAC (`_check_workspace_admin` correctly restricts modification logic).
- JWT verification leverages `jwt_verifier` with proper JWKS rotation handling.
- Local execution boundaries remain strongly enforced for sensitive workloads.

---

## SECTION 6: Prioritized Action List
*See `docs/qa/action-items.md` for isolated checklist.*

---

## SECTION 7: What's Genuinely Working Well
- **LLM Grounding Path**: The ingestion path from Firestore context up into the `system_prompt` assembly in `_build_grounded_prompt` is perfectly wired. It successfully resolves the state of `use_knowledge_base`.
- **Search Isolation**: The reciprocal rank fusion engine (`_reciprocal_rank_fusion`) is exceptionally well written, handling edge cases where vectors fail to generate by gracefully falling back to Jaccard-keyword calculations without losing tenant boundaries.
- **Provider Multi-Tenant Structure**: The newly implemented `GET /artifacts/source-picker` successfully aggregates conversations into a highly usable `SourcePickerGroup` mapping that strictly groups by `provider_slug` exactly as requested.

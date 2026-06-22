# Settings Surface Architecture

This document catalogs the backend endpoints backing the frontend's Settings surface. During the Phase 3 sprint, all settings were audited to ensure they either map to a real functional endpoint or were explicitly removed from the API contract if obsolete/unsupported.

## 1. Profile (`/settings/profile`)
- **Status:** Fully functional.
- **Details:** The `PATCH /settings/profile` endpoint accepts updates to `display_name`, `avatar_url`, and the `preferences` dictionary.
- **Changes made:** Removed the legacy `check_breached_passwords` preference entirely as Auth0 now owns password policies for database connections. The endpoint merges preferences rather than replacing them entirely. The `email` remains read-only as it maps back to the OAuth provider's source of truth.

## 2. Notifications (`/settings/notifications`)
- **Status:** Fully functional.
- **Details:** `GET` and `PATCH /settings/notifications` exist to cleanly separate notification preferences from the general profile update schema.
- **Changes made:** Explicitly dropped support for email delivery toggle states. The contract enforces `_in_app` suffixed toggles (e.g., `job_completion_in_app`) to reflect the current system capability. Email toggles will be re-added when a reliable ESP is integrated.

## 3. Provider Connections (`/provider-accounts`)
- **Status:** Fully functional.
- **Details:** Live re-authentication checks are enforced.
- **Changes made:** Added a periodic Celery Beat task (`revalidate-provider-accounts`) to automatically hit `/revalidate` mechanisms for all active API keys every day at 4 AM UTC. This transitions provider accounts to `needs_reauth = True` autonomously without requiring the user to hit a chat error first.

## 4. Workspace Management (`/workspaces`)
- **Status:** Fully functional with hardened permissions.
- **Details:** Actions like modifying the workspace or adding/removing members now securely evaluate the `workspace_members` collection role.
- **Changes made:** Modified the naive `owner_id` match to a robust `_check_workspace_admin` helper that honors the `"owner"` and `"admin"` roles found in the `workspace_members` subcollection.

## 5. Data & Export (`/settings/export-data`)
- **Status:** Asynchronous Task Built.
- **Details:** Uses a `POST /settings/export-data` endpoint to dispatch the `export_account_data` Celery task. The endpoint creates a `job` record to track progress, keeping the HTTP cycle fast while the backend zips data.

## 6. Account Deletion (`/settings/account`)
- **Status:** Asynchronous Task Built (Two-Step).
- **Details:** Uses `POST /settings/account/deletion-request` to generate a temporary token. The `DELETE /settings/account` endpoint accepts this token to dispatch the `delete_account_data` Celery task.
- **Changes made:** The backend task now systematically cascades deletions via Firestore soft-deletes (`deleted_at`), Neo4j graph drops (`delete_user_graph`), and Auth0 Identity Management API calls, completely removing the user's footprint.

# Provider Connection Honesty

This project supports three different kinds of provider connections, and they are not equivalent.

## 1. Real-time user-owned logging

This is the only fully supported live path today.

- `connection_type = "api_key"` lets users connect their own developer API keys.
- The backend never polls for consumer chat history.
- Instead, user-owned apps, scripts, or a companion SDK can POST API call logs to `/ingest/api-log`.
- The ingest endpoint stores the user’s own logged calls and converts them into canonical conversations immediately.

This is ToS-safe because C.O.R.T.E.X. only receives data the user explicitly sent from their own application flow.

## 2. Browser extension capture

This is user-consented capture from the user’s own browser session.

- The extension sends captured conversation data to `/ingest/extension`.
- The backend treats the payload the same way as file import data: normalize, dedupe, store, and embed.
- The extension token is scoped to ingestion only. It cannot be reused as a general account session.

## 3. File-watch reconciliation

This is bookkeeping, not sync.

- `connection_type = "file_watch"` only means the user has opted into a watched-folder workflow.
- The actual content still arrives through the normal import endpoint.
- A periodic task updates `last_synced_at` so the UI can show recent activity instead of a stale connected flag.

## What we do not support

- Scraping chatgpt.com, claude.ai, gemini.google.com, Perplexity, or Grok consumer history.
- Reverse-engineered private endpoints.
- Any background collection of data that the user did not explicitly route through their own tools or browser session.

If a future provider exposes a documented, ToS-compliant history API, it can be added as a true sync source. Until then, the code should stay explicit about the limits.

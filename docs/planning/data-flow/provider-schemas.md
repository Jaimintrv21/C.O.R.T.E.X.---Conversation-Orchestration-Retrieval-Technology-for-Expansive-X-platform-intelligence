# Provider Export Schemas

**Documented formats for Stage 2 parser implementation**

Last verified: 2026-06 (formats evolve — parsers must version)

---

## ChatGPT (OpenAI) — `chatgpt_json` v1

### Export path
Settings → Data controls → Export data → Email with ZIP link

### File structure
```
export.zip
├── conversations.json      # Primary file
├── chat.html               # Optional rendered view
├── message_feedback.json
└── user.json
```

### conversations.json top-level
```json
[
  {
    "title": "string",
    "create_time": 1700000000.0,
    "update_time": 1700000000.0,
    "mapping": { "...": "MessageNode" },
    "moderation_results": [],
    "current_node": "uuid-string",
    "conversation_id": "uuid-string",
    "id": "uuid-string"
  }
]
```

### MessageNode (in mapping)
```json
{
  "id": "uuid",
  "message": {
    "id": "uuid",
    "author": { "role": "user|assistant|system|tool", "name": null, "metadata": {} },
    "create_time": 1700000000.0,
    "update_time": null,
    "content": { "content_type": "text", "parts": ["string"] },
    "status": "finished_successfully",
    "metadata": {}
  },
  "parent": "uuid|null",
  "children": ["uuid"]
}
```

### Normalization rules
| Source | C.O.R.T.E.X. field |
|--------|-------------|
| `id` or `conversation_id` | `conversations.external_id` |
| `title` | `conversations.title` |
| `create_time` | `conversations.started_at` |
| Walk tree from `current_node` | Ordered `messages[]` |
| `author.role` | `messages.role` (map tool→tool) |
| `content.parts[]` joined | `messages.content` |
| `message.id` | `messages.external_id` |

### Detection heuristics
- Top-level JSON array
- First element has `mapping` dict and `title` string
- Message nodes have `author.role`

---

## Claude (Anthropic) — `claude_json` v1

### Export path
claude.ai → Settings → Export Data → ZIP download

### File structure
```
export.zip
├── conversations.json
└── users.json
```

### conversations.json top-level
```json
[
  {
    "uuid": "string",
    "name": "string",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z",
    "chat_messages": [
      {
        "uuid": "string",
        "text": "string",
        "sender": "human|assistant",
        "created_at": "2024-01-15T10:30:00.000Z",
        "attachments": []
      }
    ]
  }
]
```

### Normalization rules
| Source | C.O.R.T.E.X. field |
|--------|-------------|
| `uuid` | `conversations.external_id` |
| `name` | `conversations.title` |
| `created_at` | `conversations.started_at` |
| `chat_messages[]` ordered | `messages[]` |
| `sender: human` | `role: user` |
| `sender: assistant` | `role: assistant` |
| `text` | `messages.content` |

### Detection heuristics
- Top-level JSON array
- Elements have `uuid`, `name`, `chat_messages` array
- Messages have `sender` field (not `author`)

---

## Google Gemini — `gemini_json` v1

### Export paths (multiple)
1. **Google Takeout** — `My Activity` → JSON
2. **In-app** — varying structure by region/version

### Takeout activity entry (simplified)
```json
{
  "header": "Gemini",
  "title": "Prompt text preview",
  "time": "2024-06-01 12:00:00 UTC",
  "products": ["Gemini"],
  "activityControls": ["Gemini App Activity"],
  "details": [
    { "name": "Prompt", "value": "full prompt text" },
    { "name": "Response", "value": "full response text" }
  ]
}
```

### Normalization rules
- Group Takeout entries by session/time proximity (30 min window) → synthetic conversation
- Each prompt/response pair → user + assistant messages
- `title` from first prompt truncated to 256 chars

### Detection heuristics
- JSON array with `header` containing "Gemini" or "Bard"
- OR object with `conversations` key (app export variant)

**Risk:** Highest format variance — parser v1 covers Takeout; v2 for app-native when detected.

---

## Perplexity — `perplexity_json` v1

### Export path
Settings → Export (availability varies by plan/region)

### Documented community schema
```json
[
  {
    "id": "thread-id",
    "title": "string",
    "created_at": "2024-01-01T00:00:00Z",
    "messages": [
      {
        "role": "user|assistant",
        "content": "string",
        "timestamp": "2024-01-01T00:00:00Z",
        "sources": []
      }
    ]
  }
]
```

### Normalization rules
| Source | C.O.R.T.E.X. field |
|--------|-------------|
| `id` | `external_id` |
| `messages[].sources` | `messages.metadata.sources` |

---

## Grok (x.ai) — `grok_json` v1

### Export path
X data download / x.ai account export (evolving)

### Best-effort schema
```json
{
  "conversations": [
    {
      "conversation_id": "string",
      "title": "string",
      "created_at": "ISO8601",
      "messages": [
        { "role": "user|assistant", "content": "string", "created_at": "ISO8601" }
      ]
    }
  ]
}
```

**Status:** Best-effort v1; monitor community exports for schema updates.

---

## Generic Formats

### generic_json v1
```json
{
  "conversations": [
    {
      "id": "optional",
      "title": "required",
      "messages": [
        { "role": "user|assistant|system", "content": "string", "timestamp": "optional ISO8601" }
      ]
    }
  ]
}
```

### generic_markdown v1
```markdown
# Conversation Title

## User
Message content

## Assistant
Response content
```

Parser splits on `## Role` headers.

---

## Schema Fingerprint Algorithm

Used for unknown format triage:

```python
fingerprint = sha256(json.dumps({
    "top_level_type": "array|object",
    "top_level_keys": sorted(keys)[:20],
    "nested_keys_sample": sample_keys(depth=2),
}).encode()).hexdigest()[:16]
```

Stored in `jobs.result.schema_fingerprint` on parse failure.

---

## Related Documents

- [Import Pipelines](./import-pipelines.md)
- [Pre-Stage-2 Decisions](../pre-stage2-decisions.md)

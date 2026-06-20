/**
 * NEXUS API client — typed fetch wrapper for all backend endpoints.
 * Returns { data, meta, errors } envelope.
 */

const API_BASE = "/api/v1";

export interface ApiError { code: string; message: string; field?: string; }
export interface Meta { request_id?: string; timestamp: string; pagination?: { has_next: boolean; next_cursor?: string; total_count?: number; page_size: number }; }
export interface ApiResponse<T> { data: T | null; meta: Meta; errors: ApiError[] | null; }

async function request<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
  const token = typeof window !== "undefined" ? localStorage.getItem("nexus_token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status === 401) { if (typeof window !== "undefined") window.location.href = "/login"; }
  return res.json();
}

// ── Shared API Models ───────────────────────────────────────────────────

export interface OverviewMetrics {
  total_conversations: number;
  total_messages: number;
  total_tokens: number;
  providers_used: number;
  avg_messages_per_conversation: number;
  active_days: number;
}

export interface TopicCount {
  topic: string;
  count: number;
  percentage: number;
}

export interface TimelinePoint {
  date: string;
  conversations: number;
  messages: number;
  tokens: number;
}

export interface ProviderBreakdown {
  provider: string;
  conversations: number;
  messages: number;
  tokens: number;
  percentage: number;
}

export interface HeatmapCell {
  day: number;
  hour: number;
  count: number;
}

export interface ModelUsage {
  model: string;
  message_count: number;
  token_count: number;
  avg_response_length: number;
}

export interface MessageResponse {
  id: string;
  conversation_id: string;
  external_id: string | null;
  role: string;
  content: string;
  content_type: string;
  model: string | null;
  token_count: number;
  attachments: Record<string, unknown> | null;
  tool_calls: Record<string, unknown> | null;
  parent_id: string | null;
  sequence_num: number;
  created_at: string;
  updated_at: string | null;
}

export interface ConversationResponse {
  id: string;
  user_id: string;
  workspace_id: string | null;
  provider_id: string | null;
  provider_slug: string | null;
  provider_name: string | null;
  external_id: string | null;
  title: string | null;
  summary: string | null;
  status: string;
  import_source: string | null;
  message_count: number;
  token_count: number;
  language: string | null;
  topics: string[] | null;
  tags: string[] | null;
  folder_id: string | null;
  is_pinned: boolean;
  is_shared: boolean;
  quality_score: number | null;
  preview: string | null;
  metadata: Record<string, unknown> | null;
  last_message_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchHit {
  conversation_id: string;
  message_id: string | null;
  title: string | null;
  snippet: string;
  score: number;
  similarity_score: number | null;
  provider_slug: string | null;
  created_at: string | null;
  match_type: "semantic" | "exact" | "both" | null;
  highlights: string[] | null;
}

export interface SearchSuggestion {
  text: string;
  type: string;
  score: number;
}

export interface NodeResponse {
  id: string;
  label: string;
  node_type: string;
  description: string | null;
  occurrence_count: number;
  source_ids: string[] | null;
  created_at: string;
}

export interface EdgeResponse {
  id: string;
  source_id: string;
  target_id: string;
  relationship: string;
  weight: number;
  evidence: Record<string, unknown> | null;
  created_at: string;
}

export interface GraphExport {
  nodes: NodeResponse[];
  edges: EdgeResponse[];
  metadata: Record<string, unknown>;
}

export interface ArtifactResponse {
  id: string;
  user_id: string;
  workspace_id: string | null;
  title: string;
  artifact_type: string;
  status: string;
  source_ids: string[] | null;
  prompt: string | null;
  model_used: string | null;
  content: Record<string, unknown> | null;
  file_size: number | null;
  version: number;
  is_public: boolean;
  error_message: string | null;
  generation_ms: number | null;
  created_at: string;
  updated_at: string;
}

export interface JobResponse {
  id: string;
  user_id: string;
  job_type: string;
  status: string;
  priority: number;
  progress: number;
  progress_detail: string | null;
  error_message: string | null;
  result: Record<string, unknown> | null;
  attempts: number;
  max_attempts: number;
  celery_task_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface WorkspaceResponse {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string | null;
  plan: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// ── API Namespace Exports ───────────────────────────────────────────────

// Auth
export const auth = {
  register: (data: { email: string; username: string; password: string }) => request<unknown>("POST", "/auth/register", data),
  login: (data: { email: string; password: string }) => request<{ access_token: string; refresh_token: string }>("POST", "/auth/login", data),
  refresh: (refresh_token: string) => request<unknown>("POST", "/auth/refresh", { refresh_token }),
  logout: () => request<unknown>("DELETE", "/auth/logout"),
};

// Conversations
export const conversations = {
  list: (cursor?: string, limit = 50) => request<ConversationResponse[]>("GET", `/conversations?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`),
  create: (data: { title?: string; provider_slug?: string; workspace_id?: string; summary?: string; tags?: string[]; topics?: string[]; metadata?: Record<string, unknown> }) => request<ConversationResponse>("POST", "/conversations", data),
  get: (id: string) => request<ConversationResponse>("GET", `/conversations/${id}`),
  update: (id: string, data: Record<string, unknown>) => request<ConversationResponse>("PATCH", `/conversations/${id}`, data),
  delete: (id: string) => request<unknown>("DELETE", `/conversations/${id}`),
  messages: (id: string, cursor?: string) => request<MessageResponse[]>("GET", `/conversations/${id}/messages${cursor ? `?cursor=${cursor}` : ""}`),
  sendMessage: (id: string, data: { content: string; provider_slug?: string; model?: string; local_only?: boolean; use_knowledge?: boolean }) => request<MessageResponse>("POST", `/conversations/${id}/messages`, data),
  compare: (ids: string[]) => request<Record<string, unknown>>("POST", "/conversations/compare", { conversation_ids: ids }),
  duplicates: () => request<unknown>("GET", "/conversations/duplicates"),
};

// Search
export const search = {
  semantic: (query: string, limit = 20) => request<SearchHit[]>("POST", "/search/semantic", { query, limit }),
  fulltext: (query: string, limit = 20) => request<SearchHit[]>("POST", "/search/fulltext", { query, limit }),
  suggestions: (q: string) => request<SearchSuggestion[]>("GET", `/search/suggestions?q=${q}`),
};

// Analytics
export const analytics = {
  overview: () => request<OverviewMetrics>("GET", "/analytics/overview"),
  topics: () => request<TopicCount[]>("GET", "/analytics/topics"),
  timeline: (from?: string, to?: string) => request<TimelinePoint[]>("GET", `/analytics/timeline${from ? `?date_from=${from}` : ""}`),
  providers: () => request<ProviderBreakdown[]>("GET", "/analytics/providers"),
  heatmap: () => request<HeatmapCell[]>("GET", "/analytics/heatmap"),
  models: () => request<ModelUsage[]>("GET", "/analytics/models"),
};

// Knowledge
export const knowledge = {
  nodes: (limit = 200) => request<NodeResponse[]>("GET", `/knowledge/nodes?limit=${limit}`),
  edges: (limit = 500) => request<EdgeResponse[]>("GET", `/knowledge/edges?limit=${limit}`),
  build: (data?: { force_rebuild?: boolean }) => request<unknown>("POST", "/knowledge/build", data),
  export: () => request<GraphExport>("GET", "/knowledge/export"),
};

// Artifacts
export const artifacts = {
  list: () => request<ArtifactResponse[]>("GET", "/artifacts"),
  generate: (data: { title: string; artifact_type: string; source_ids: string[]; prompt?: string }) => request<JobResponse>("POST", "/artifacts/generate", data),
  get: (id: string) => request<ArtifactResponse>("GET", `/artifacts/${id}`),
  download: (id: string) => request<unknown>("GET", `/artifacts/${id}/download`),
  delete: (id: string) => request<unknown>("DELETE", `/artifacts/${id}`),
};

// Jobs
export const jobs = {
  list: () => request<JobResponse[]>("GET", "/jobs"),
  get: (id: string) => request<JobResponse>("GET", `/jobs/${id}`),
  cancel: (id: string) => request<unknown>("DELETE", `/jobs/${id}`),
};

// Workspaces
export const workspaces = {
  list: () => request<WorkspaceResponse[]>("GET", "/workspaces"),
  create: (data: { name: string; slug: string }) => request<WorkspaceResponse>("POST", "/workspaces", data),
  update: (id: string, data: Record<string, unknown>) => request<WorkspaceResponse>("PATCH", `/workspaces/${id}`, data),
  addMember: (id: string, data: { user_id: string; role: string }) => request<unknown>("POST", `/workspaces/${id}/members`, data),
  removeMember: (id: string, userId: string) => request<unknown>("DELETE", `/workspaces/${id}/members/${userId}`),
};

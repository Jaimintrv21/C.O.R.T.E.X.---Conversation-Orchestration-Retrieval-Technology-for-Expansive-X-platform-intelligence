/**
 * NEXUS API client — typed fetch wrapper for all backend endpoints.
 * Returns { data, meta, errors } envelope.
 */

const API_BASE = "/api/v1";

interface ApiError { code: string; message: string; field?: string; }
interface Meta { request_id?: string; timestamp: string; pagination?: { has_next: boolean; next_cursor?: string; total_count?: number; page_size: number }; }
interface ApiResponse<T> { data: T | null; meta: Meta; errors: ApiError[] | null; }

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

// Auth
export const auth = {
  register: (data: { email: string; username: string; password: string }) => request("POST", "/auth/register", data),
  login: (data: { email: string; password: string }) => request<{ access_token: string; refresh_token: string }>("POST", "/auth/login", data),
  refresh: (refresh_token: string) => request("POST", "/auth/refresh", { refresh_token }),
  logout: () => request("DELETE", "/auth/logout"),
};

// Conversations
export const conversations = {
  list: (cursor?: string, limit = 50) => request("GET", `/conversations?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`),
  create: (data: { title?: string; provider_slug?: string; workspace_id?: string; summary?: string; tags?: string[]; topics?: string[]; metadata?: Record<string, unknown> }) => request("POST", "/conversations", data),
  get: (id: string) => request("GET", `/conversations/${id}`),
  update: (id: string, data: Record<string, unknown>) => request("PATCH", `/conversations/${id}`, data),
  delete: (id: string) => request("DELETE", `/conversations/${id}`),
  messages: (id: string, cursor?: string) => request("GET", `/conversations/${id}/messages${cursor ? `?cursor=${cursor}` : ""}`),
  sendMessage: (id: string, data: { content: string; provider_slug?: string; model?: string; local_only?: boolean }) => request("POST", `/conversations/${id}/messages`, data),
  compare: (ids: string[]) => request("POST", "/conversations/compare", { conversation_ids: ids }),
  duplicates: () => request("GET", "/conversations/duplicates"),
};

// Search
export const search = {
  semantic: (query: string, limit = 20) => request("POST", "/search/semantic", { query, limit }),
  fulltext: (query: string, limit = 20) => request("POST", "/search/fulltext", { query, limit }),
  suggestions: (q: string) => request("GET", `/search/suggestions?q=${q}`),
};

// Analytics
export const analytics = {
  overview: () => request("GET", "/analytics/overview"),
  topics: () => request("GET", "/analytics/topics"),
  timeline: (from?: string, to?: string) => request("GET", `/analytics/timeline${from ? `?date_from=${from}` : ""}`),
  providers: () => request("GET", "/analytics/providers"),
  heatmap: () => request("GET", "/analytics/heatmap"),
  models: () => request("GET", "/analytics/models"),
};

// Knowledge
export const knowledge = {
  nodes: (limit = 200) => request("GET", `/knowledge/nodes?limit=${limit}`),
  edges: (limit = 500) => request("GET", `/knowledge/edges?limit=${limit}`),
  build: (data?: { force_rebuild?: boolean }) => request("POST", "/knowledge/build", data),
  export: () => request("GET", "/knowledge/export"),
};

// Artifacts
export const artifacts = {
  list: () => request("GET", "/artifacts"),
  generate: (data: { title: string; artifact_type: string; source_ids: string[]; prompt?: string }) => request("POST", "/artifacts/generate", data),
  get: (id: string) => request("GET", `/artifacts/${id}`),
  download: (id: string) => request("GET", `/artifacts/${id}/download`),
  delete: (id: string) => request("DELETE", `/artifacts/${id}`),
};

// Jobs
export const jobs = {
  list: () => request("GET", "/jobs"),
  get: (id: string) => request("GET", `/jobs/${id}`),
  cancel: (id: string) => request("DELETE", `/jobs/${id}`),
};

// Workspaces
export const workspaces = {
  list: () => request("GET", "/workspaces"),
  create: (data: { name: string; slug: string }) => request("POST", "/workspaces", data),
  update: (id: string, data: Record<string, unknown>) => request("PATCH", `/workspaces/${id}`, data),
  addMember: (id: string, data: { user_id: string; role: string }) => request("POST", `/workspaces/${id}/members`, data),
  removeMember: (id: string, userId: string) => request("DELETE", `/workspaces/${id}/members/${userId}`),
};

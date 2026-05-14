import type {
  AssessmentHistoryItem,
  ProbabilityRequest,
  ProbabilityResponse,
  QueryResponse,
  ReorderItem,
  SuggestRequest,
  SuggestResponse,
  TaskCreate,
  TaskFilter,
  TaskResponse,
  TaskUpdate,
  TokenResponse,
  UserResponse,
} from "./types";

// ============================================================
// Typed API Client — follows nanobot webui/src/lib/api.ts pattern
// ============================================================

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(
  url: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const BASE = ""; // Vite proxy handles /api -> backend

// -- Auth ------------------------------------------------------------------
export async function loginApi(
  email: string,
  password: string,
): Promise<TokenResponse> {
  return request<TokenResponse>(`${BASE}/api/auth/login`, null, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(
  email: string,
  password: string,
  fullName: string,
): Promise<TokenResponse> {
  return request<TokenResponse>(`${BASE}/api/auth/register`, null, {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
}

export async function fetchMe(token: string): Promise<UserResponse> {
  return request<UserResponse>(`${BASE}/api/auth/me`, token);
}

// -- Query (RAG Chat) ------------------------------------------------------
export async function submitQuery(
  token: string,
  query: string,
  topK = 5,
  threshold = 0.75,
): Promise<QueryResponse> {
  return request<QueryResponse>(`${BASE}/api/query`, token, {
    method: "POST",
    body: JSON.stringify({ query, top_k: topK, threshold }),
  });
}

// -- Probability -----------------------------------------------------------
export async function assessProbability(
  token: string,
  body: ProbabilityRequest,
): Promise<ProbabilityResponse> {
  return request<ProbabilityResponse>(`${BASE}/api/probability/assess`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchAssessmentHistory(
  token: string,
): Promise<AssessmentHistoryItem[]> {
  return request<AssessmentHistoryItem[]>(`${BASE}/api/probability/history`, token);
}

// -- Roadmap ---------------------------------------------------------------
export async function listTasks(
  token: string,
  params?: TaskFilter,
): Promise<TaskResponse[]> {
  const searchParams = new URLSearchParams();
  if (params?.month) searchParams.set("month", String(params.month));
  if (params?.category) searchParams.set("category", params.category);
  if (params?.status) searchParams.set("task_status", params.status);

  const qs = searchParams.toString();
  return request<TaskResponse[]>(
    `${BASE}/api/roadmap/tasks${qs ? `?${qs}` : ""}`,
    token,
  );
}

export async function createTask(
  token: string,
  body: TaskCreate,
): Promise<TaskResponse> {
  return request<TaskResponse>(`${BASE}/api/roadmap/tasks`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateTask(
  token: string,
  id: string,
  body: TaskUpdate,
): Promise<TaskResponse> {
  return request<TaskResponse>(`${BASE}/api/roadmap/tasks/${encodeURIComponent(id)}`, token, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteTask(
  token: string,
  id: string,
): Promise<void> {
  return request<void>(`${BASE}/api/roadmap/tasks/${encodeURIComponent(id)}`, token, {
    method: "DELETE",
  });
}

export async function reorderTasks(
  token: string,
  items: ReorderItem[],
): Promise<{ status: string; updated: number }> {
  return request<{ status: string; updated: number }>(`${BASE}/api/roadmap/reorder`, token, {
    method: "PUT",
    body: JSON.stringify(items),
  });
}

export async function suggestTasks(
  token: string,
  body: SuggestRequest,
): Promise<SuggestResponse> {
  return request<SuggestResponse>(`${BASE}/api/roadmap/suggest`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
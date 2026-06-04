import type {
  AssessmentHistoryItem,
  DocumentItem,
  DocumentSearchResult,
  DocumentUploadResponse,
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
  SourceCitation,
  UniversityMeta,
  AdmissionMethod,
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

// ---------------------------------------------------------------------------
// Module-level access token — replaces localStorage for XSS hardening.
// AuthProvider writes to this via setAccessToken() / clearAccessToken().
// ---------------------------------------------------------------------------
let accessToken: string | null = null;

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ---------------------------------------------------------------------------
// Safe JSON parse helper — guards against empty/malformed 200 responses
// ---------------------------------------------------------------------------
async function safeParseJson(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || `Unexpected content-type: ${contentType}`);
  }
  try {
    return await res.json();
  } catch {
    throw new ApiError(res.status, "Invalid JSON response from server");
  }
}

// ---------------------------------------------------------------------------
// Core request helper — uses module-level accessToken if no token passed
// ---------------------------------------------------------------------------
async function request<T>(
  url: string,
  token?: string | null,
  init?: RequestInit,
): Promise<T> {
  const effectiveToken = token ?? accessToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (effectiveToken) headers.Authorization = `Bearer ${effectiveToken}`;

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  if (res.status === 204) return undefined as T;
  return (await safeParseJson(res)) as T;
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

export async function fetchMe(token?: string): Promise<UserResponse> {
  return request<UserResponse>(`${BASE}/api/auth/me`, token);
}

/**
 * Attempt to refresh the access token via an HttpOnly cookie.
 * Falls back to returning null if the endpoint doesn't exist or the cookie is
 * missing/expired.
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const data = (await safeParseJson(res)) as TokenResponse;
    if (data?.access_token) {
      accessToken = data.access_token;
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

// -- Query (RAG Chat) ------------------------------------------------------
export async function submitQuery(
  token: string,
  query: string,
  topK = 5,
  threshold = 0.75,
  signal?: AbortSignal,
): Promise<QueryResponse> {
  return request<QueryResponse>(`${BASE}/api/query`, token, {
    method: "POST",
    body: JSON.stringify({ query, top_k: topK, threshold }),
    signal,
  });
}

// -- Query Streaming (SSE) -------------------------------------------------
export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (citations: SourceCitation[], humanFallback: boolean) => void;
  onError: (err: Error) => void;
}

/**
 * Submits a query to the SSE streaming endpoint and processes tokens
 * as they arrive. Returns an abort function to cancel mid-stream.
 */
export function submitQueryStream(
  token: string,
  query: string,
  topK: number,
  threshold: number,
  callbacks: StreamCallbacks,
): () => void {
  const controller = new AbortController();
  const { onToken, onComplete, onError } = callbacks;

  fetch(`${BASE}/api/query/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, top_k: topK, threshold }),
    signal: controller.signal,
    credentials: "same-origin",
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new ApiError(res.status, `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("ReadableStream not supported");
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6);

          if (payload === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(payload);

            if (parsed.token !== undefined) {
              onToken(parsed.token as string);
            }

            if (parsed.citations && Array.isArray(parsed.citations)) {
              const citations = parsed.citations as SourceCitation[];
              const humanFallback = !!parsed.human_fallback;
              onComplete(citations, humanFallback);
              return;
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      // Stream ended without explicit metadata — complete with empty
      onComplete([], false);
    })
    .catch((err) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      onError(err instanceof Error ? err : new Error(String(err)));
    });

  return () => controller.abort();
}

// -- Probability metadata (dynamic university/method lists) ----------------
export async function fetchUniversities(token: string): Promise<UniversityMeta[]> {
  return request<UniversityMeta[]>(`${BASE}/api/probability/universities`, token);
}

export async function fetchAdmissionMethods(token: string): Promise<AdmissionMethod[]> {
  return request<AdmissionMethod[]>(`${BASE}/api/probability/methods`, token);
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

// -- Documents --------------------------------------------------------------
export async function listDocuments(token: string): Promise<DocumentItem[]> {
  return request<DocumentItem[]>(`${BASE}/api/documents`, token);
}

export async function getDocument(token: string, id: string): Promise<DocumentItem> {
  return request<DocumentItem>(`${BASE}/api/documents/${encodeURIComponent(id)}`, token);
}

export async function uploadDocument(
  token: string,
  file: File,
  title?: string,
  description?: string,
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  if (description) formData.append("description", description);

  const headers: Record<string, string> = {};
  const effectiveToken = token ?? accessToken;
  if (effectiveToken) headers.Authorization = `Bearer ${effectiveToken}`;

  const res = await fetch(`${BASE}/api/documents/upload`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "same-origin",
  });
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  return (await safeParseJson(res)) as DocumentUploadResponse;
}

export async function deleteDocument(token: string, id: string): Promise<void> {
  return request<void>(`${BASE}/api/documents/${encodeURIComponent(id)}`, token, {
    method: "DELETE",
  });
}

export async function searchDocument(
  token: string,
  documentId: string,
  query: string,
  topK = 5,
): Promise<DocumentSearchResult[]> {
  return request<DocumentSearchResult[]>(
    `${BASE}/api/documents/${encodeURIComponent(documentId)}/search`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ query, top_k: topK }),
    },
  );
}

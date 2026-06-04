// ============================================================
// Core API Client — follows nanobot webui pattern (lib/api.ts)
// Typed `request<T>` helper + `ApiError` class
// ============================================================

// -- Auth types -----------------------------------------------------------
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

// -- Chat / Query types ---------------------------------------------------
export interface QueryRequest {
  query: string;
  top_k?: number;
  threshold?: number;
}

export interface SourceCitation {
  doc_id: string;
  component_type: string;
  summary: string;
  image_url: string | null;
  cosine_score: number;
}

export interface QueryResponse {
  answer: string;
  disclaimer: string;
  citations: SourceCitation[];
  human_fallback: boolean;
  fallback_reason: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: SourceCitation[];
  humanFallback?: boolean;
  createdAt: number;
}

// -- Probability types ----------------------------------------------------
export interface ProbabilityRequest {
  score: number;
  university: string;
  major: string;
  admission_method: string;
}

export interface TierResult {
  tier: string;
  emoji: string;
  label: string;
  percentile_rank: number;
}

export interface CompetitiveMapData {
  candidate_score: number;
  cutoff_score: number;
  score_distribution: Record<string, number>;
  tier_boundaries: Record<string, number>;
  historical_years: Array<{ year: number; cutoff_score: number }>;
}

export interface ProbabilityResponse {
  tier: TierResult;
  competitive_map: CompetitiveMapData;
  disclaimer: string;
}

export interface AssessmentHistoryItem {
  id: string;
  university: string;
  major: string;
  score: number;
  tier: string;
  percentile_rank: number;
  created_at: string | null;
}

// -- Probability metadata types --------------------------------------------
export interface UniversityMeta {
  id: string;
  name: string;
  code: string;
}

export interface AdmissionMethod {
  value: string;
  label: string;
  labelKey: string;
}

// -- Roadmap types --------------------------------------------------------
export type TaskStatus = "todo" | "in_progress" | "done";

export type TopicDifficulty = "beginner" | "intermediate" | "advanced";

export interface ResourceLink {
  url: string;
  label: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_month: number | null;
  category: string | null;
  sort_order: number | null;
  created_at: string | null;
  /** Estimated study time in minutes */
  estimated_time?: number | null;
  /** Links to external resources */
  resource_links?: ResourceLink[] | null;
  /** Topic difficulty level */
  difficulty?: TopicDifficulty | null;
  /** Whether the topic has been completed */
  completed?: boolean;
  /** Arbitrary tags beyond category / difficulty */
  tags?: string[] | null;
}

export interface TaskCreate {
  title: string;
  description?: string;
  status?: TaskStatus;
  due_month?: number;
  category?: string;
  sort_order?: number;
  estimated_time?: number | null;
  resource_links?: ResourceLink[] | null;
  difficulty?: TopicDifficulty | null;
  completed?: boolean;
  tags?: string[] | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  due_month?: number;
  category?: string;
  sort_order?: number;
  estimated_time?: number | null;
  resource_links?: ResourceLink[] | null;
  difficulty?: TopicDifficulty | null;
  completed?: boolean;
  tags?: string[] | null;
}

export interface TaskFilter {
  month?: number;
  category?: string;
  status?: TaskStatus;
}

export interface ReorderItem {
  task_id: string;
  sort_order: number;
}

export interface SuggestRequest {
  grade?: string;
  target_universities?: string[];
  current_month?: number;
}

export interface SuggestResponse {
  suggestions: Array<{ title: string; description: string; category: string; due_month: number }>;
}

// -- Document types ---------------------------------------------------------
export type DocumentStatus = "processing" | "ready" | "error";
export type DocumentType = "pdf" | "image" | "text";

export interface DocumentItem {
  id: string;
  title: string;
  description?: string;
  type: DocumentType;
  status: DocumentStatus;
  pageCount?: number;
  fileSize: number;
  uploadedAt: string;
}

export interface DocumentUploadResponse {
  id: string;
  status: DocumentStatus;
}

export interface DocumentSearchResult {
  doc_id: string;
  chunk_text: string;
  relevance_score: number;
}

// -- View routing ----------------------------------------------------------
export type AppView = "chat" | "probability" | "roadmap" | "documents" | "settings";

// -- Boot state machine ----------------------------------------------------
export type BootState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "auth"; mode: "login" | "register"; failed?: boolean }
  | { status: "ready"; user: UserResponse; token: string };
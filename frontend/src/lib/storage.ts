/**
 * Quota-aware sessionStorage helpers.
 *
 * Guards against silent QuotaExceededError failures by:
 * - Checking estimated payload size before writing
 * - Catching QuotaExceededError and returning `{ ok: false }`
 * - Providing a safe default for oversized data
 */

const MAX_SAFE_SIZE_BYTES = 1_800_000; // ~1.8MB — leaves headroom below typical 5MB limit

export interface StorageResult {
  ok: boolean;
  error?: string;
}

/** Estimate the byte size of a JSON string. */
function estimateSize(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return Infinity;
  }
}

/**
 * Safely writes a value to sessionStorage.
 * Returns `{ ok: true }` on success, or `{ ok: false, error }` on failure.
 */
export function safeSetSession(key: string, value: unknown): StorageResult {
  try {
    const size = estimateSize(value);
    if (size > MAX_SAFE_SIZE_BYTES) {
      return { ok: false, error: "Data exceeds safe storage size" };
    }
    sessionStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      return { ok: false, error: "Storage quota exceeded" };
    }
    return { ok: false, error: "Storage write failed" };
  }
}

/**
 * Safely reads and parses a value from sessionStorage.
 * Returns the parsed value or `null` if the key doesn't exist or parsing fails.
 */
export function safeGetSession<T = unknown>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Removes a key from sessionStorage (always succeeds).
 */
export function safeRemoveSession(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

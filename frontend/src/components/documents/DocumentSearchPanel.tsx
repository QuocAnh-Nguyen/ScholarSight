import { useCallback, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2, FileText, Zap, Clock, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { searchDocument } from "@/lib/api";
import { safeSetSession, safeGetSession } from "@/lib/storage";
import type { DocumentSearchResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Enhanced DocumentSearchPanel adapted from FastGPT's dataset/detail/Test.
//
// Adds:
//   - Search history (last 5 queries saved in sessionStorage)
//   - Quota-aware storage: warns user if history can't be saved
//   - Result count badge
//   - Match term highlighting in chunk text
//   - History chips for quick re-search
//
// FastGPT source: FastGPT-reference/pageComponents/dataset/detail/Test/index.tsx
// ---------------------------------------------------------------------------

const HISTORY_KEY = "scholarsight.searchHistory";
const MAX_HISTORY = 5;

function loadHistory(): string[] {
  return safeGetSession<string[]>(HISTORY_KEY) ?? [];
}

function saveHistory(queries: string[]): boolean {
  const result = safeSetSession(HISTORY_KEY, queries);
  return result.ok;
}

interface DocumentSearchPanelProps {
  documentId: string;
}

export function DocumentSearchPanel({ documentId }: DocumentSearchPanelProps) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocumentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const addToHistory = useCallback((q: string) => {
    setHistory((prev) => {
      const next = [q, ...prev.filter((h) => h !== q)].slice(0, MAX_HISTORY);
      const saved = saveHistory(next);
      if (!saved) {
        // Storage quota exceeded — trim further and retry
        const trimmed = next.slice(0, 3);
        const retry = saveHistory(trimmed);
        if (!retry) {
          setStorageWarning("Search history storage is full. Some entries have been cleared.");
        }
        return trimmed;
      }
      setStorageWarning(null);
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((q: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h !== q);
      saveHistory(next);
      setStorageWarning(null);
      return next;
    });
  }, []);

  const handleSearch = useCallback(
    async (searchQuery?: string) => {
      const q = (searchQuery ?? query).trim();
      if (!token || !q) return;

      setLoading(true);
      setError(null);
      setHasSearched(true);
      addToHistory(q);

      try {
        const data = await searchDocument(token, documentId, q);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [token, documentId, query, addToHistory],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  // -- Highlight matching terms in chunk text --------------------------------
  const highlightMatch = useCallback((text: string) => {
    const terms = query
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    if (terms.length === 0) return text;

    const pattern = new RegExp(`(${terms.join("|")})`, "gi");
    const parts = text.split(pattern);

    return parts.map((part, i) =>
      pattern.test(part) && parts[i - 1] !== undefined ? (
        <mark
          key={i}
          className="rounded-sm bg-primary/15 px-0.5 font-medium text-foreground"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }, [query]);

  const uniqueHistory = useMemo(() => history, [history]);

  return (
    <div className="flex h-full flex-col">
      {/* Search input */}
      <div className="shrink-0 space-y-3 p-4">
        <label className="relative block">
          <span className="sr-only">{t("documents.detail.search")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("documents.searchPlaceholder") ?? "Search within document..."}
            className={[
              "h-9 w-full rounded-md border border-border bg-transparent pl-9 pr-12",
              "text-sm outline-none",
              "placeholder:text-muted-foreground/60",
              "focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
            ].join(" ")}
          />
          <Button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            size="sm"
            className="absolute right-1 top-1/2 h-7 -translate-y-1/2 gap-1 rounded-md px-2.5"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Zap className="h-3 w-3" />
            )}
            {t("roadmap.create")}
          </Button>
        </label>

        {/* Storage warning */}
        {storageWarning && (
          <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="flex-1">{storageWarning}</span>
            <button
              onClick={() => setStorageWarning(null)}
              className="shrink-0 rounded-full p-0.5 hover:bg-amber-200 dark:hover:bg-amber-800"
              aria-label="Dismiss"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        {/* Search history chips */}
        {uniqueHistory.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Clock className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            {uniqueHistory.map((h) => (
              <button
                key={h}
                onClick={() => {
                  setQuery(h);
                  handleSearch(h);
                }}
                className={[
                  "group inline-flex items-center gap-1 rounded-full border border-border/60",
                  "bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground",
                  "transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
                ].join(" ")}
              >
                <span className="max-w-[140px] truncate">{h}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromHistory(h);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      removeFromHistory(h);
                    }
                  }}
                  className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-border/50 group-hover:opacity-100"
                  title={t("documents.delete")}
                >
                  <X className="h-2.5 w-2.5" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Empty — never searched */}
        {!loading && !hasSearched && !error && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Search className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {t("documents.searchHint") ?? "Enter a query to search within this document"}
            </p>
          </div>
        )}

        {/* Empty — searched, no results */}
        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {t("documents.noSearchResults") ?? "No matching sections found"}
            </p>
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && (
          <>
            <div className="mb-3 flex items-center gap-1.5">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                {results.length} {results.length === 1 ? "result" : "results"} found
              </span>
            </div>

            <ul className="space-y-3">
              {results.map((item, i) => (
                <li
                  key={`${item.doc_id}-${i}`}
                  className="rounded-lg border bg-card p-3 transition-colors hover:border-primary/20"
                >
                  <p className="text-sm leading-relaxed text-foreground">
                    {query.trim() ? highlightMatch(item.chunk_text) : item.chunk_text}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(item.relevance_score * 100, 100)}%`,
                        }}
                      />
                    </span>
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                      {(item.relevance_score * 100).toFixed(0)}% match
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default DocumentSearchPanel;

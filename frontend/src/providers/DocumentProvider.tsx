import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { listDocuments, deleteDocument as deleteDocumentApi } from "@/lib/api";
import type { DocumentItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Adapted from FastGPT's dataset/list/context.tsx provider pattern.
//
// FastGPT source: FastGPT-reference/pageComponents/dataset/list/context.tsx
//
// FIX 3A: Split the context into two providers by update frequency.
//   - DocumentContext:  documents, CRUD ops, loading/error (rarely changes)
//   - DocumentSearchContext: searchKey + filteredDocuments (changes per keystroke)
// This prevents search input keystrokes from triggering re-renders of every
// component that only needs document data (e.g. upload button, delete modals).
// ---------------------------------------------------------------------------

// -- Stable context (rare updates) ------------------------------------------

export interface DocumentContextValue {
  /** All documents for the current user. */
  documents: DocumentItem[];
  /** Whether documents are being fetched. */
  isLoading: boolean;
  /** Error message if the last fetch failed. */
  error: string | null;
  /** Fetch documents from the API. Returns the fetched list. */
  loadDocuments: () => Promise<DocumentItem[]>;
  /** Delete a document by ID, then refresh the list. */
  deleteDocument: (id: string) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextValue>({
  documents: [],
  isLoading: false,
  error: null,
  loadDocuments: () => Promise.resolve([]),
  deleteDocument: () => Promise.resolve(),
});

DocumentContext.displayName = "DocumentContext";

// -- High-frequency search context ------------------------------------------

export interface DocumentSearchContextValue {
  /** Current search input value. */
  searchKey: string;
  setSearchKey: React.Dispatch<React.SetStateAction<string>>;
  /** Documents filtered by searchKey (case-insensitive title/description match). */
  filteredDocuments: DocumentItem[];
}

const DocumentSearchContext = createContext<DocumentSearchContextValue>({
  searchKey: "",
  setSearchKey: () => {},
  filteredDocuments: [],
});

DocumentSearchContext.displayName = "DocumentSearchContext";

// -- Provider ---------------------------------------------------------------

/**
 * Context provider for document collection state.
 *
 * Wraps children with document CRUD operations, loading state, and
 * client-side search filtering.  Requires that `<AuthProvider>` is
 * already mounted higher in the tree.
 *
 * Fix 3A: The search bar state (`searchKey` / `filteredDocuments`) lives in
 * `DocumentSearchProvider` so keystrokes only re-render the search input
 * and the document list — not components that only consume `documents`,
 * `isLoading`, or CRUD operations.
 */
export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKey, setSearchKey] = useState("");

  const loadDocuments = useCallback(async (): Promise<DocumentItem[]> => {
    if (!token) {
      setDocuments([]);
      return [];
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await listDocuments(token);
      setDocuments(list);
      return list;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load documents";
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const deleteDocument = useCallback(
    async (id: string) => {
      if (!token) return;
      await deleteDocumentApi(token, id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    },
    [token],
  );

  // Stable context value — searchKey is NOT a dependency.
  const docValue = useMemo<DocumentContextValue>(
    () => ({
      documents,
      isLoading,
      error,
      loadDocuments,
      deleteDocument,
    }),
    [documents, isLoading, error, loadDocuments, deleteDocument],
  );

  // High-frequency search context — only consumers of filteredDocuments
  // re-render on keystrokes.
  const filteredDocuments = useMemo(() => {
    if (!searchKey.trim()) return documents;
    const lower = searchKey.toLowerCase();
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(lower) ||
        (d.description ?? "").toLowerCase().includes(lower),
    );
  }, [documents, searchKey]);

  const searchValue = useMemo<DocumentSearchContextValue>(
    () => ({
      searchKey,
      setSearchKey,
      filteredDocuments,
    }),
    [searchKey, filteredDocuments],
  );

  return (
    <DocumentContext.Provider value={docValue}>
      <DocumentSearchContext.Provider value={searchValue}>
        {children}
      </DocumentSearchContext.Provider>
    </DocumentContext.Provider>
  );
}

// -- Hooks ------------------------------------------------------------------

/** Access the document context. Must be used within a `<DocumentProvider>`. */
export function useDocuments(): DocumentContextValue {
  const ctx = useContext(DocumentContext);
  if (!ctx) {
    throw new Error("useDocuments must be used within a DocumentProvider");
  }
  return ctx;
}

/** Access the document search context (searchKey + filteredDocuments). */
export function useDocumentSearch(): DocumentSearchContextValue {
  const ctx = useContext(DocumentSearchContext);
  if (!ctx) {
    throw new Error("useDocumentSearch must be used within a DocumentProvider");
  }
  return ctx;
}

export default DocumentProvider;

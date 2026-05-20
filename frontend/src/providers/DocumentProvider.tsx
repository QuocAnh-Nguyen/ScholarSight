import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { listDocuments, deleteDocument as deleteDocumentApi } from "@/lib/api";
import type { DocumentItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Adapted from FastGPT's dataset/list/context.tsx provider pattern.
//
// FastGPT source: FastGPT-reference/pageComponents/dataset/list/context.tsx
// ---------------------------------------------------------------------------

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
  /** Filter documents by title (client-side). */
  searchKey: string;
  setSearchKey: React.Dispatch<React.SetStateAction<string>>;
  /** Documents filtered by searchKey (case-insensitive title match). */
  filteredDocuments: DocumentItem[];
}

const DocumentContext = createContext<DocumentContextValue>({
  documents: [],
  isLoading: false,
  error: null,
  loadDocuments: () => Promise.resolve([]),
  deleteDocument: () => Promise.resolve(),
  searchKey: "",
  setSearchKey: () => {},
  filteredDocuments: [],
});

DocumentContext.displayName = "DocumentContext";

/**
 * Context provider for document collection state.
 *
 * Wraps children with document CRUD operations, loading state, and
 * client-side search filtering.  Requires that `<AuthProvider>` is
 * already mounted higher in the tree.
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

  const filteredDocuments = useMemo(() => {
    if (!searchKey.trim()) return documents;
    const lower = searchKey.toLowerCase();
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(lower) ||
        (d.description ?? "").toLowerCase().includes(lower),
    );
  }, [documents, searchKey]);

  const value = useMemo<DocumentContextValue>(
    () => ({
      documents,
      isLoading,
      error,
      loadDocuments,
      deleteDocument,
      searchKey,
      setSearchKey,
      filteredDocuments,
    }),
    [documents, isLoading, error, loadDocuments, deleteDocument, searchKey, filteredDocuments],
  );

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}

/** Access the document context. Must be used within a `<DocumentProvider>`. */
export function useDocuments(): DocumentContextValue {
  const ctx = useContext(DocumentContext);
  if (!ctx) {
    throw new Error("useDocuments must be used within a DocumentProvider");
  }
  return ctx;
}

export default DocumentProvider;
// ---------------------------------------------------------------------------
// Convenience re-export — the authoritative hooks live in DocumentProvider.
// This file exists so consumers can import from hooks/ without coupling to
// the provider implementation path.
//
// FIX 3A: Also exports useDocumentSearch for the split-context pattern.
// ---------------------------------------------------------------------------

export { useDocuments, useDocumentSearch } from "@/providers/DocumentProvider";

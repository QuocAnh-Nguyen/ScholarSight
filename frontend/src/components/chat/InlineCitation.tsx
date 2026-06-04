import { ExternalLink } from "lucide-react";

interface InlineCitationProps {
  docId: string;
  /** Called when the user clicks the inline citation badge */
  onClick: (docId: string) => void;
}

/**
 * Renders an inline clickable badge for citation references within
 * markdown text. Replaces the raw `[Tài liệu: uuid]` pattern.
 *
 * Shows a compact document icon + truncated UUID. On click, dispatches
 * the docId to the parent, which looks up the full SourceCitation and
 * opens the CitationSidePanel.
 */
export function InlineCitation({ docId, onClick }: InlineCitationProps) {
  const shortId = docId.length > 8 ? docId.slice(0, 8) + "..." : docId;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(docId);
      }}
      className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-px text-[11px] font-medium text-primary align-baseline transition-colors hover:bg-primary/20 hover:text-primary/90 focus:outline-none focus:ring-1 focus:ring-primary/40"
      title={`Source: ${docId}`}
      aria-label={`View source citation: ${docId}`}
    >
      <ExternalLink className="h-2.5 w-2.5" />
      <span className="font-mono">{shortId}</span>
    </button>
  );
}

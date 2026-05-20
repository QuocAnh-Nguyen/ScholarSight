import { useTranslation } from "react-i18next";
import { X, FileText, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SourceCitation } from "@/lib/types";

// ---------------------------------------------------------------------------
// Adapted from FastGPT's chat/index.tsx quote panel pattern.
//
// Renders a slide-in side panel that shows source citation details alongside
// the chat (desktop) or as a bottom sheet overlay (mobile).  This is UX
// improvement over the previous CitationModal that obscured the conversation.
//
// FastGPT source: FastGPT-reference/pages/chat/index.tsx (ChatQuoteList pattern)
// ---------------------------------------------------------------------------

interface CitationSidePanelProps {
  citation: SourceCitation | null;
  onClose: () => void;
}

export function CitationSidePanel({ citation, onClose }: CitationSidePanelProps) {
  const { t } = useTranslation();

  if (!citation) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden border-l bg-card/60">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="flex-1 truncate text-sm font-semibold text-foreground">
          {t("citation.panelTitle")}
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin space-y-4">
        {/* Document ID + type */}
        <div className="rounded-lg border bg-muted/20 px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-mono">{citation.doc_id}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5 shrink-0" />
            <span>{citation.component_type}</span>
          </div>
        </div>

        {/* Relevance score */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("citation.relevance")}</span>
            <span className="font-medium text-foreground">
              {Math.round(citation.cosine_score * 100)}% match
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(citation.cosine_score * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Summary / extracted text */}
        <div>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("chat.sourceLabel")}
          </h4>
          <p className="text-sm leading-relaxed text-foreground">{citation.summary}</p>
        </div>

        {/* Image preview */}
        {citation.image_url && (
          <div>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Preview
            </h4>
            <img
              src={citation.image_url}
              alt="Source preview"
              className="w-full rounded-lg border"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default CitationSidePanel;
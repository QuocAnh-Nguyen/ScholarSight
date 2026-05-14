import { useTranslation } from "react-i18next";
import type { SourceCitation } from "@/lib/types";

interface CitationChipProps {
  citation: SourceCitation;
  onClick: () => void;
}

export function CitationChip({ citation, onClick }: CitationChipProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
    >
      <span>{t("chat.sourceLabel")}</span>
      <span className="text-muted-foreground">
        ({Math.round(citation.cosine_score * 100)}%)
      </span>
    </button>
  );
}
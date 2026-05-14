import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SourceCitation } from "@/lib/types";

interface CitationModalProps {
  citation: SourceCitation | null;
  onClose: () => void;
}

export function CitationModal({ citation, onClose }: CitationModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!citation} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("chat.sourceLabel")}</DialogTitle>
        </DialogHeader>
        {citation && (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">ID:</span> {citation.doc_id}
              {" • "}
              <span className="font-medium">Type:</span> {citation.component_type}
              {" • "}
              <span className="font-medium">
                {t("chat.sourceScore", { score: Math.round(citation.cosine_score * 100) })}
              </span>
            </div>
            <p className="text-sm text-foreground">{citation.summary}</p>
            {citation.image_url && (
              <img
                src={citation.image_url}
                alt="Source"
                className="w-full rounded-lg border"
              />
            )}
            <Button variant="outline" onClick={onClose} className="mt-2">
              {t("common.close")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
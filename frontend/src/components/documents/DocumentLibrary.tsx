import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDocuments, useDocumentSearch } from "@/providers/DocumentProvider";
import { DocumentCard } from "./DocumentCard";
import { UploadDocumentModal } from "./UploadDocumentModal";

// ---------------------------------------------------------------------------
// Adapted from FastGPT's dataset/list/List.tsx grid + empty-state pattern.
//
// Renders:
//   - Search/filter bar at top
//   - Responsive card grid: 1 col / 2 cols / 3 cols / 4 cols
//   - Empty state with call-to-action when no documents exist
//   - Loading spinner overlay when fetching
//   - Upload modal triggered by "Upload Document" button
//   - Delete confirmation dialog
//
// FastGPT source: FastGPT-reference/pageComponents/dataset/list/List.tsx
//
// FIX 3A: Uses useDocuments (stable) + useDocumentSearch (high-freq) to
// avoid re-rendering non-search components on every keystroke.
// ---------------------------------------------------------------------------

interface DocumentLibraryProps {
  onViewDocument?: (id: string) => void;
}

export function DocumentLibrary({ onViewDocument }: DocumentLibraryProps) {
  const { t } = useTranslation();
  const {
    documents,
    isLoading,
    loadDocuments,
    deleteDocument,
  } = useDocuments();

  const { searchKey, setSearchKey, filteredDocuments } = useDocumentSearch();

  const [uploadOpen, setUploadOpen] = useState(false);

  // -- Delete confirmation --------------------------------------------------
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const docToDelete = documents.find((d) => d.id === deleteId);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteId);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }, [deleteId, deleteDocument]);

  // -- View handler ---------------------------------------------------------
  const handleView = useCallback(
    (id: string) => {
      onViewDocument?.(id);
    },
    [onViewDocument],
  );

  // -- Rename handler (placeholder — can add a rename modal later) ----------
  const handleRename = useCallback((_id: string) => {
    // Placeholder
  }, []);

  // -- Initial load ---------------------------------------------------------
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const displayDocs = filteredDocuments.length > 0 || searchKey ? filteredDocuments : documents;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar: search + upload */}
      <div className="flex shrink-0 items-center gap-3 border-b px-6 py-3">
        {/* Search input — adapted from FastGPT dataset search */}
        <label className="relative flex-1 max-w-sm">
          <span className="sr-only">{t("documents.search")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            placeholder={t("documents.search")}
            className={[
              "h-9 w-full rounded-full border border-border bg-muted/40 pl-9 pr-3",
              "text-sm text-foreground outline-none",
              "placeholder:text-muted-foreground/60",
              "transition-colors hover:bg-muted/60",
              "focus:border-primary/40 focus:bg-muted/60 focus:ring-1 focus:ring-primary/20",
            ].join(" ")}
          />
        </label>

        <Button
          onClick={() => setUploadOpen(true)}
          size="sm"
          className="ml-auto gap-2 rounded-full px-4 text-sm"
        >
          <Upload className="h-4 w-4" />
          {t("documents.upload")}
        </Button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
        {/* Loading overlay */}
        {isLoading && documents.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
              <span className="text-sm">{t("common.loading")}</span>
            </div>
          </div>
        )}

        {/* Empty state — adapted from FastGPT EmptyTip */}
        {!isLoading && displayDocs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 pt-[20vh]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30">
              <Plus className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">{t("documents.noDocuments")}</p>
            <Button
              onClick={() => setUploadOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
            >
              <Upload className="h-3.5 w-3.5" />
              {t("documents.upload")}
            </Button>
          </div>
        )}

        {/* Card grid */}
        {displayDocs.length > 0 && (
          <div
            className="grid gap-5"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            }}
          >
            {displayDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={handleView}
                onRename={handleRename}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      <UploadDocumentModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={() => {
          loadDocuments();
        }}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("documents.deleteConfirm")}</DialogTitle>
            {docToDelete && (
              <DialogDescription>
                <span className="font-medium text-foreground">&ldquo;{docToDelete.title}&rdquo;</span>
                {" — "}
                {t("documents.deleteWarning")}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  {t("common.delete")}...
                </>
              ) : (
                t("common.delete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DocumentLibrary;

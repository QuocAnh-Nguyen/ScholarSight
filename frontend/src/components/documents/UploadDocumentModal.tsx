import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileText, Image, File, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/providers/AuthProvider";
import { uploadDocument } from "@/lib/api";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Adapted from FastGPT's dataset/list/CreateModal.tsx.
//
// Provides a simple file-upload dialog with:
//   - Drag-and-drop zone + click-to-browse
//   - File type / size validation
//   - Optional title override and description textarea
//   - Upload progress indicator
//   - Wired to backend ``uploadDocument`` API
//
// FastGPT source: FastGPT-reference/pageComponents/dataset/list/CreateModal.tsx
// ---------------------------------------------------------------------------

const ACCEPTED_TYPES = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg,.jpeg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "text/plain": ".txt",
};

const ACCEPT_STRING = Object.values(ACCEPTED_TYPES).join(",");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}

export function UploadDocumentModal({ open, onOpenChange, onUploaded }: UploadDocumentModalProps) {
  const { t } = useTranslation();
  const { token } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // -- Derived ------------------------------------------------------------------
  const TypeIcon = (() => {
    if (!file) return File;
    if (file.type.startsWith("image/")) return Image;
    if (file.type === "application/pdf") return FileText;
    if (file.type === "text/plain") return FileText;
    return File;
  })();

  // -- Handlers ----------------------------------------------------------------
  const reset = useCallback(() => {
    setFile(null);
    setTitle("");
    setDescription("");
    setError(null);
    setDragging(false);
  }, []);

  const validateFile = useCallback((f: File): string | null => {
    if (!Object.keys(ACCEPTED_TYPES).includes(f.type)) {
      return t("documents.invalidType") ?? "Unsupported file type";
    }
    if (f.size > MAX_FILE_SIZE) {
      return t("documents.fileTooLarge") ?? "File exceeds 50 MB limit";
    }
    return null;
  }, [t]);

  const handleFileSelected = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        setError(err);
        return;
      }
      setFile(f);
      setError(null);
      // Auto-fill title from filename (minus extension)
      if (!title) {
        const dotIndex = f.name.lastIndexOf(".");
        const nameWithoutExt = dotIndex > 0 ? f.name.slice(0, dotIndex) : f.name;
        setTitle(nameWithoutExt);
      }
    },
    [validateFile, title],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFileSelected(dropped);
    },
    [handleFileSelected],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleBrowse = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelected(selected);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file || !token) return;
    setUploading(true);
    setError(null);
    try {
      await uploadDocument(token, file, title.trim() || undefined, description.trim() || undefined);
      reset();
      onOpenChange(false);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // -- Render ------------------------------------------------------------------
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) reset();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            {t("documents.upload")}
          </DialogTitle>
          <DialogDescription>{t("documents.uploadDesc")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Dropzone or file preview */}
          {!file ? (
            <div
              role="button"
              tabIndex={0}
              onClick={handleBrowse}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleBrowse();
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
                dragging
                  ? "border-primary/60 bg-primary/5"
                  : "border-border hover:border-primary/30 hover:bg-muted/30",
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("documents.dropOrClick") ?? "Drag & drop or click to browse"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t("documents.acceptedTypes")}</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_STRING}
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          ) : (
            /* File preview */
            <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted/60">
                <TypeIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleRemoveFile}
                disabled={uploading}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Optional title override */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("documents.titleLabel") ?? "Title (optional)"}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={file?.name ?? (t("documents.titlePlaceholder") ?? "Document title")}
              disabled={uploading}
              maxLength={120}
            />
          </div>

          {/* Optional description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("documents.descriptionLabel") ?? "Description (optional)"}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                t("documents.descriptionPlaceholder") ??
                "Brief description of this document..."
              }
              disabled={uploading}
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive animate-in fade-in-0 slide-in-from-top-1">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("documents.uploading")}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {t("documents.upload")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UploadDocumentModal;
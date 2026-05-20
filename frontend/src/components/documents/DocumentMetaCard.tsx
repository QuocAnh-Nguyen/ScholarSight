import { useTranslation } from "react-i18next";
import {
  FileText,
  Image,
  File,
  Calendar,
  HardDrive,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { DocumentItem } from "@/lib/types";
import { fmtDateTime } from "@/lib/format";

// ---------------------------------------------------------------------------
// Adapted from FastGPT's dataset/detail Info sidebar (right panel).
//
// Displays document metadata:
//   - Type icon + title
//   - Processing status with icon
//   - Page count (if applicable)
//   - File size
//   - Upload date
//
// FastGPT source: FastGPT-reference/pages/dataset/detail/index.tsx slider
// ---------------------------------------------------------------------------

const TYPE_ICON_MAP = {
  pdf: FileText,
  image: Image,
  text: File,
} as const;

interface DocumentMetaCardProps {
  document: DocumentItem;
}

export function DocumentMetaCard({ document }: DocumentMetaCardProps) {
  const { t } = useTranslation();
  const Icon = TYPE_ICON_MAP[document.type] ?? File;

  const statusConfig = {
    processing: {
      icon: Loader2,
      className: "text-primary",
      animateClass: "animate-spin",
      labelKey: "documents.processing",
    },
    ready: {
      icon: CheckCircle2,
      className: "text-emerald-500",
      animateClass: "",
      labelKey: "documents.ready",
    },
    error: {
      icon: AlertTriangle,
      className: "text-destructive",
      animateClass: "",
      labelKey: "documents.error",
    },
  } as const;

  const status = statusConfig[document.status];
  const StatusIcon = status.icon;

  return (
    <div className="flex h-full flex-col p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted/50">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {document.title}
          </h3>
          <p className="text-xs text-muted-foreground">{t("documents.detail.metadata")}</p>
        </div>
      </div>

      {/* Metadata fields */}
      <div className="mt-6 space-y-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          <StatusIcon
            className={`h-4 w-4 shrink-0 ${status.className} ${status.animateClass}`}
          />
          <span className="text-xs text-muted-foreground">{t("documents.detail.status")}</span>
          <span className="ml-auto text-xs font-medium text-foreground">
            {t(status.labelKey)}
          </span>
        </div>

        {/* Type */}
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("citation.documentType")}</span>
          <span className="ml-auto rounded bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {document.type}
          </span>
        </div>

        {/* Page count */}
        {document.pageCount != null && (
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t("documents.detail.pages")}</span>
            <span className="ml-auto text-xs font-medium text-foreground">
              {document.pageCount}
            </span>
          </div>
        )}

        {/* File size */}
        <div className="flex items-center gap-3">
          <HardDrive className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("documents.detail.fileSize")}</span>
          <span className="ml-auto text-xs font-medium text-foreground">
            {(() => {
              const bytes = document.fileSize;
              if (bytes < 1024) return `${bytes} B`;
              if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
              return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            })()}
          </span>
        </div>

        {/* Upload date */}
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("documents.detail.uploadedAt")}</span>
          <span className="ml-auto text-xs font-medium text-foreground">
            {fmtDateTime(document.uploadedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default DocumentMetaCard;
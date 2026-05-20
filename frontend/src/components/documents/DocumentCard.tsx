import { useTranslation } from "react-i18next";
import {
  FileText,
  Image,
  File,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import type { DocumentItem, DocumentType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Adapted from FastGPT's dataset/list/List.tsx card pattern.
//   - Avatar-like type icon + title + description
//   - Type tag (PDF / Image / Text) in the top-right
//   - Hover: border highlight + reveal context menu
//   - Status indicator (processing spinner / ready checkmark / error alert)
//
// FastGPT source: FastGPT-reference/pageComponents/dataset/list/List.tsx
// ---------------------------------------------------------------------------

const TYPE_ICON_MAP: Record<DocumentType, typeof FileText> = {
  pdf: FileText,
  image: Image,
  text: File,
};

const TYPE_LABEL_KEY: Record<DocumentType, string> = {
  pdf: "documents.type.pdf",
  image: "documents.type.image",
  text: "documents.type.text",
};

interface DocumentCardProps {
  document: DocumentItem;
  onView: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DocumentCard({ document, onView, onRename, onDelete }: DocumentCardProps) {
  const { t } = useTranslation();
  const Icon = TYPE_ICON_MAP[document.type] ?? File;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onView(document.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onView(document.id);
      }}
      className={cn(
        "group relative flex h-full cursor-pointer flex-col rounded-lg border-2 border-border bg-card p-5 shadow-sm transition-all",
        "hover:border-primary/30 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {/* Top row: type icon + type badge */}
      <div className="flex w-full items-start justify-between">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/70">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>

        <span
          className={cn(
            "shrink-0 rounded-l-md border border-border/60 px-2 py-0.5 text-[11px] font-medium",
            "bg-muted/40 text-muted-foreground",
          )}
          style={{ marginRight: -20, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        >
          {t(TYPE_LABEL_KEY[document.type])}
        </span>
      </div>

      {/* Title */}
      <h3 className="mt-3 truncate text-sm font-semibold text-foreground">
        {document.title}
      </h3>

      {/* Description / abstract preview — 3-line clamp */}
      <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-3 whitespace-pre-wrap">
        {document.description || (
          <span className="italic opacity-60">
            {t("documents.noDescription") ?? "No description"}
          </span>
        )}
      </p>

      {/* Bottom row: status + context menu */}
      <div className="mt-4 flex h-6 items-center justify-between">
        {/* Status indicator */}
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {document.status === "processing" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span>{t("documents.processing")}</span>
            </>
          )}
          {document.status === "ready" && (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>{t("documents.ready")}</span>
            </>
          )}
          {document.status === "error" && (
            <>
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span>{t("documents.error")}</span>
            </>
          )}
        </span>

        {/* Context menu — revealed on hover */}
        <span className="hidden group-hover:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground/60 hover:text-sidebar-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onView(document.id);
                }}
              >
                <Eye className="mr-2 h-3.5 w-3.5" />
                {t("documents.view")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(document.id);
                }}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                {t("documents.rename")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(document.id);
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                {t("documents.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>

        {/* Time indicator — hidden on hover */}
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60 group-hover:hidden">
          <Clock className="h-3 w-3" />
          {relativeTime(new Date(document.uploadedAt).getTime())}
        </span>
      </div>
    </div>
  );
}

export default DocumentCard;
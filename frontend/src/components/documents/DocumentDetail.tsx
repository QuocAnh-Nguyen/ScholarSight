import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileText, Search, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { getDocument } from "@/lib/api";
import { MarkdownText } from "@/components/chat/MarkdownText";
import { DocumentMetaCard } from "./DocumentMetaCard";
import { DocumentSearchPanel } from "./DocumentSearchPanel";
import { cn } from "@/lib/utils";
import type { DocumentItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Adapted from FastGPT's dataset/detail/index.tsx split-panel layout.
//
// Provides:
//   - Left panel: Tab navigation (Content | Search | Q&A) + content area
//   - Right sidebar: Document metadata card (fixed width on desktop)
//   - Back button to return to document library
//   - Mobile: single-column stacked layout with tabs at top
//
// FastGPT source: FastGPT-reference/pages/dataset/detail/index.tsx
// ---------------------------------------------------------------------------

type DetailTab = "content" | "search" | "qa";

const TABS: { id: DetailTab; icon: typeof FileText; labelKey: string }[] = [
  { id: "content", icon: FileText, labelKey: "documents.detail.content" },
  { id: "search", icon: Search, labelKey: "documents.detail.search" },
  { id: "qa", icon: MessageSquare, labelKey: "documents.detail.qa" },
];

interface DocumentDetailProps {
  documentId: string;
  onBack: () => void;
}

export function DocumentDetail({ documentId, onBack }: DocumentDetailProps) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("content");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDocument(token, documentId)
      .then((doc) => {
        if (!cancelled) setDocument(doc);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load document");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, documentId]);

  const title = useMemo(() => document?.title ?? t("documents.title"), [document, t]);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar: back button + title */}
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
      </div>

      {/* Loading / Error states */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            <span className="text-sm">{t("common.loading")}</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-4 text-center">
            <p className="text-sm font-medium text-destructive">{t("common.error")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onBack}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {t("common.back")}
            </Button>
          </div>
        </div>
      )}

      {document && !loading && !error && (
        <>
          {/* Desktop: side-by-side layout */}
          <div className="hidden flex-1 overflow-hidden md:flex">
            {/* Left: tabs + content */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Tab bar */}
              <nav className="flex shrink-0 border-b">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                        "border-b-2 -mb-px",
                        activeTab === tab.id
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {t(tab.labelKey)}
                    </button>
                  );
                })}
              </nav>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {activeTab === "content" && (
                  <div className="p-6">
                    {document.description ? (
                      <MarkdownText content={document.description} />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                        <FileText className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">
                          {t("documents.noContent") ?? "No extracted content available yet."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "search" && (
                  <DocumentSearchPanel documentId={document.id} />
                )}
                {activeTab === "qa" && (
                  <div className="flex items-center justify-center p-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {t("documents.qaComingSoon") ?? "Q&A for this document — coming soon"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar: metadata */}
            <div className="flex w-64 shrink-0 flex-col border-l bg-card/50">
              <DocumentMetaCard document={document} />
            </div>
          </div>

          {/* Mobile: stacked single-column */}
          <div className="flex flex-1 flex-col overflow-hidden md:hidden">
            {/* Tab bar */}
            <nav className="flex shrink-0 border-b">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
                      "border-b-2 -mb-px",
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </nav>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {activeTab === "content" && (
                <div className="p-4">
                  {document.description ? (
                    <MarkdownText content={document.description} />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {t("documents.noContent") ?? "No extracted content available yet."}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "search" && <DocumentSearchPanel documentId={document.id} />}
              {activeTab === "qa" && (
                <div className="flex items-center justify-center p-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {t("documents.qaComingSoon") ?? "Q&A for this document — coming soon"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata at bottom on mobile */}
            <div className="shrink-0 border-t bg-card/50">
              <DocumentMetaCard document={document} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DocumentDetail;
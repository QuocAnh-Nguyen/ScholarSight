import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Pin, Pencil, Trash2, MessageSquare, PinOff } from "lucide-react";
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

export interface SessionItem {
  id: string;
  title: string;
  customTitle?: string;
  pinned?: boolean;
  updatedAt: number;
  isGenerating?: boolean;
  hasUnread?: boolean;
}

interface SessionListProps {
  sessions: SessionItem[];
  activeId: string | null;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Reading session history list adapted from FastGPT's ChatSliderList.
 *
 * Displays a scrollable list of past sessions with:
 * - Active highlight and hover reveal pattern
 * - Time indicator replaced by menu on hover (or generating indicator)
 * - Unread dot for sessions with new responses
 * - Pin/Rename/Delete via dropdown menu
 *
 * FastGPT source: FastGPT-reference/pageComponents/chat/slider/ChatSliderList.tsx
 */
export function SessionList({
  sessions,
  activeId,
  collapsed,
  onSelect,
  onPin,
  onRename,
  onDelete,
}: SessionListProps) {
  const { t } = useTranslation();

  const displaySessions = useMemo(() => {
    // Sort: pinned first, then by updatedAt descending
    return [...sessions].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [sessions]);

  // Don't render list in collapsed mode
  if (collapsed) return null;

  if (sessions.length === 0) {
    return (
      <div className="flex-1 px-4 py-8 text-center text-xs text-muted-foreground">
        {t("sidebar.noSessions")}
      </div>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 scrollbar-thin" aria-label={t("sidebar.recentSessions")}>
      {/* Section label */}
      <div className="mb-1 mt-2 px-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {t("sidebar.recentSessions")}
        </span>
      </div>

      {displaySessions.map((item, i) => {
        const isActive = item.id === activeId;
        const displayTitle = item.customTitle || item.title;

        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(item.id);
            }}
            className={cn(
              "group relative flex h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm select-none transition-colors",
              item.pinned && "bg-emerald-50/60 dark:bg-emerald-950/20",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              i !== displaySessions.length - 1 && "mb-1",
            )}
          >
            {/* Icon */}
            <MessageSquare
              className={cn(
                "h-4 w-4 shrink-0",
                isActive ? "text-primary" : "text-muted-foreground/60",
              )}
            />

            {/* Title */}
            <span className="flex-1 truncate text-[13px]">{displayTitle}</span>

            {/* Right side: indicators revealed on hover */}
            <span className="flex shrink-0 items-center gap-1.5">
              {/* Unread dot */}
              {item.hasUnread && !item.isGenerating && (
                <span
                  className={cn(
                    "h-2 w-2 rounded-full bg-primary",
                    "group-hover:hidden",
                  )}
                />
              )}

              {/* Generating indicator or time */}
              <span
                className={cn(
                  "text-[11px] font-normal whitespace-nowrap",
                  item.isGenerating
                    ? "text-primary" // always visible when generating
                    : cn(
                        "text-muted-foreground/60",
                        "group-hover:hidden", // hidden on hover to reveal menu
                      ),
                )}
              >
                {item.isGenerating
                  ? t("session.generating")
                  : relativeTime(item.updatedAt)}
              </span>

              {/* More menu — revealed on hover */}
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
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onPin(item.id, !item.pinned);
                      }}
                    >
                      {item.pinned ? (
                        <PinOff className="mr-2 h-3.5 w-3.5" />
                      ) : (
                        <Pin className="mr-2 h-3.5 w-3.5" />
                      )}
                      {item.pinned ? t("sidebar.unpinSession") : t("sidebar.pinSession")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onRename(item.id);
                      }}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      {t("sidebar.renameSession")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      {t("sidebar.deleteSession")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </span>
          </div>
        );
      })}
    </nav>
  );
}
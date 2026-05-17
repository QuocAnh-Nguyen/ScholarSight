import { useTranslation } from "react-i18next";
import { Search, SquarePen, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppView } from "@/lib/types";
import { SidebarNav } from "./SidebarNav";
import { SessionList, type SessionItem } from "./SessionList";
import { SidebarUserMenu } from "./SidebarUserMenu";

export type { SessionItem } from "./SessionList";

interface SidebarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onLogout: () => void;
  onCollapse?: () => void;
  collapsed?: boolean;
  /** Session history — when provided, renders the session list between nav and user menu */
  sessions?: SessionItem[];
  activeSessionId?: string | null;
  onSelectSession?: (id: string) => void;
  onPinSession?: (id: string, pinned: boolean) => void;
  onRenameSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onNewSession?: () => void;
  /** Search input for filtering sessions */
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  /** User info for the user menu */
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  onOpenSettings?: () => void;
}

/**
 * Enhanced Sidebar adapted from FastGPT's ChatSlider + webui Sidebar.
 *
 * Composes:
 * - Brand header with logo, app name, and collapse toggle
 * - New Session button (when sessions are enabled)
 * - Session search input (when sessions are enabled)
 * - View navigation (SidebarNav) — Chat / Probability / Roadmap / Settings
 * - Session history list (SessionList) — with pin/rename/delete menus
 * - User avatar + dropdown menu (SidebarUserMenu) — settings + logout
 *
 * FastGPT sources:
 * - FastGPT-reference/pageComponents/chat/slider/index.tsx (ChatSlider)
 * - FastGPT-reference/components/Layout/navbar.tsx (Navbar)
 * - FastGPT-reference/pageComponents/chat/slider/ChatSliderList.tsx (ChatSliderList)
 */
export function Sidebar({
  activeView,
  onSelectView,
  onLogout,
  onCollapse,
  collapsed = false,
  sessions,
  activeSessionId,
  onSelectSession,
  onPinSession,
  onRenameSession,
  onDeleteSession,
  onNewSession,
  searchQuery = "",
  onSearchChange,
  userName,
  userEmail,
  avatarUrl,
  onOpenSettings,
}: SidebarProps) {
  const { t } = useTranslation();
  const hasSessions = sessions !== undefined;

  const handleSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      onSelectView("settings");
    }
  };

  const handleToggleCollapse = () => {
    onCollapse?.();
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Brand header */}
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center h-14" : "h-14 gap-3",
        )}
      >
        {collapsed ? (
          <GraduationCap className="h-6 w-6 text-primary" />
        ) : (
          <>
            <GraduationCap className="h-6 w-6 shrink-0 text-primary" />
            <span className="font-semibold text-sm text-sidebar-foreground truncate">
              {t("app.brand")}
            </span>
            {onCollapse && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-7 w-7 shrink-0"
                onClick={handleToggleCollapse}
              >
                {/* Chevron left handled by SidebarNav now */}
                <span className="sr-only">{t("sidebar.collapse")}</span>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                >
                  <path
                    d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            )}
          </>
        )}
      </div>

      {/* New Session + Search (only in expanded mode, when sessions are enabled) */}
      {hasSessions && !collapsed && (
        <div className="space-y-1.5 px-2 pb-2 pt-3">
          {/* Search */}
          <label className="relative block">
            <span className="sr-only">{t("sidebar.searchSessions")}</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60"
              aria-hidden
            />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={t("sidebar.searchSessions")}
              aria-label={t("sidebar.searchSessions")}
              className={cn(
                "h-8 w-full rounded-full border border-transparent bg-sidebar-accent/45",
                "pl-8 pr-3 text-[12.5px] text-sidebar-foreground outline-none",
                "placeholder:text-muted-foreground/65",
                "transition-colors hover:bg-sidebar-accent/65",
                "focus:border-sidebar-border/80 focus:bg-sidebar-accent/70",
                "focus:ring-1 focus:ring-sidebar-border/70",
              )}
            />
          </label>

          {/* New Session button */}
          <Button
            onClick={onNewSession}
            className="h-8 w-full justify-start gap-2 rounded-full px-3 text-[12.5px] font-medium"
            variant="ghost"
          >
            <SquarePen className="h-3.5 w-3.5" />
            {t("sidebar.newSession")}
          </Button>
        </div>
      )}

      {/* View navigation */}
      <div className={cn("py-3", hasSessions && !collapsed && "pt-1")}>
        <SidebarNav
          activeView={activeView}
          onSelectView={onSelectView}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Session history list */}
      {hasSessions && sessions && sessions.length > 0 && onSelectSession && onPinSession && onRenameSession && onDeleteSession && (
        <SessionList
          sessions={sessions}
          activeId={activeSessionId ?? null}
          collapsed={collapsed}
          onSelect={onSelectSession}
          onPin={onPinSession}
          onRename={onRenameSession}
          onDelete={onDeleteSession}
        />
      )}

      {/* Spacer pushes user menu to bottom */}
      {!hasSessions && <div className="flex-1" />}

      {/* User menu */}
      <SidebarUserMenu
        userName={userName}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        collapsed={collapsed}
        onSettings={handleSettings}
        onLogout={onLogout}
      />
    </div>
  );
}
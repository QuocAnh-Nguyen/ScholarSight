import { useTranslation } from "react-i18next";
import { MessageSquare, BarChart3, Kanban, Settings, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppView } from "@/lib/types";

interface SidebarNavProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: AppView;
  icon: typeof MessageSquare;
  activeIcon?: typeof MessageSquare;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "chat", icon: MessageSquare, labelKey: "nav.chat" },
  { id: "probability", icon: BarChart3, labelKey: "nav.probability" },
  { id: "roadmap", icon: Kanban, labelKey: "nav.roadmap" },
  { id: "settings", icon: Settings, labelKey: "nav.settings" },
];

/**
 * View navigation section adapted from FastGPT's NavigationSection /
 * ActionButton pattern in ChatSlider.
 *
 * In collapsed mode shows icon-only buttons with tooltips.
 * In expanded mode shows icon + text labels with active highlight.
 *
 * FastGPT source: FastGPT-reference/pageComponents/chat/slider/index.tsx (lines 210-251, 253-353)
 */
export function SidebarNav({ activeView, onSelectView, collapsed, onToggleCollapse }: SidebarNavProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1 px-3">
      {/* Collapse toggle — always visible */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-5 w-5 shrink-0" />
        ) : (
          <PanelLeftClose className="h-5 w-5 shrink-0" />
        )}
        {!collapsed && <span className="truncate">{t("sidebar.collapse")}</span>}
      </button>

      {/* View navigation items */}
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;

        return collapsed ? (
          /* Collapsed: icon-only button */
          <div key={item.id} className="flex justify-center">
            <button
              onClick={() => onSelectView(item.id)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
              )}
              title={t(item.labelKey)}
              aria-label={t(item.labelKey)}
            >
              <Icon className="h-5 w-5" />
            </button>
          </div>
        ) : (
          /* Expanded: icon + text */
          <button
            key={item.id}
            onClick={() => onSelectView(item.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{t(item.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
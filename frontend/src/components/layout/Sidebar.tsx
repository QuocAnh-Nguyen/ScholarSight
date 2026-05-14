import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare, BarChart3, Kanban, Settings, GraduationCap, ChevronLeft } from "lucide-react";
import type { AppView } from "@/lib/types";

interface SidebarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onLogout: () => void;
  onCollapse?: () => void;
  collapsed?: boolean;
}

const NAV_ITEMS: Array<{ id: AppView; icon: typeof MessageSquare; labelKey: string }> = [
  { id: "chat", icon: MessageSquare, labelKey: "nav.chat" },
  { id: "probability", icon: BarChart3, labelKey: "nav.probability" },
  { id: "roadmap", icon: Kanban, labelKey: "nav.roadmap" },
  { id: "settings", icon: Settings, labelKey: "nav.settings" },
];

export function Sidebar({ activeView, onSelectView, onLogout, onCollapse }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Brand header */}
      <div className="flex h-14 items-center gap-3 px-4 border-b border-sidebar-border">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="font-semibold text-sm text-sidebar-foreground">
          {t("app.brand")}
        </span>
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7"
            onClick={onCollapse}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
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
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout footer */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"
          size="sm"
          onClick={onLogout}
        >
          {t("settings.account.logout")}
        </Button>
      </div>
    </div>
  );
}
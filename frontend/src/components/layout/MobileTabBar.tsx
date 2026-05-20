import { useTranslation } from "react-i18next";
import { MessageSquare, FileStack, BarChart3, Kanban } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppView } from "@/lib/types";

// ---------------------------------------------------------------------------
// MobileTabBar adapted from FastGPT's navbarPhone.tsx.
//
// Fixed bottom tab bar visible only on mobile (hidden at lg breakpoint).
// Replaces the hamburger-triggered slide-out Sheet sidebar for faster
// navigation on small screens.
//
// FastGPT source: FastGPT-reference/components/Layout/navbarPhone.tsx
// ---------------------------------------------------------------------------

interface TabItem {
  id: AppView;
  icon: typeof MessageSquare;
  labelKey: string;
}

const TABS: TabItem[] = [
  { id: "chat", icon: MessageSquare, labelKey: "mobileNav.chat" },
  { id: "documents", icon: FileStack, labelKey: "mobileNav.documents" },
  { id: "probability", icon: BarChart3, labelKey: "mobileNav.probability" },
  { id: "roadmap", icon: Kanban, labelKey: "mobileNav.roadmap" },
];

interface MobileTabBarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
}

export function MobileTabBar({ activeView, onSelectView }: MobileTabBarProps) {
  const { t } = useTranslation();

  return (
    <nav
      className={[
        "fixed bottom-0 left-0 right-0 z-30 lg:hidden",
        "flex items-center justify-around",
        "h-[52px] border-t bg-background/95 backdrop-blur-sm",
        "safe-area-inset-bottom",
      ].join(" ")}
      role="navigation"
      aria-label={t("sidebar.collapse")}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectView(tab.id)}
            className={cn(
              "relative flex h-full flex-1 cursor-pointer select-none flex-col items-center justify-center gap-0.5 rounded-md text-center transition-colors",
              "active:scale-95",
              isActive
                ? "text-primary"
                : "text-muted-foreground/60 hover:text-muted-foreground",
            )}
            aria-label={t(tab.labelKey)}
            aria-current={isActive ? "page" : undefined}
          >
            {/* Active indicator — top edge bar */}
            {isActive && (
              <span className="absolute top-0 left-1/2 h-[2.5px] w-8 -translate-x-1/2 rounded-b-full bg-primary" />
            )}

            <Icon
              className={cn(
                "h-5 w-5 transition-transform",
                isActive && "scale-110",
              )}
              strokeWidth={isActive ? 2.5 : 2}
            />

            <span
              className={cn(
                "text-[11px] font-medium leading-none",
                isActive && "font-semibold",
              )}
              style={{ transform: "scale(0.9)" }}
            >
              {t(tab.labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default MobileTabBar;
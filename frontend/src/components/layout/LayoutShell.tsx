import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileTabBar } from "./MobileTabBar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { AppView } from "@/lib/types";

const SIDEBAR_STORAGE_KEY = "scholarsight.sidebar";
const SIDEBAR_WIDTH = 272;
const SIDEBAR_COLLAPSED_WIDTH = 56;

function readSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

/** Map URL path segments to AppView for active tab highlighting. */
function pathToView(pathname: string): AppView {
  if (pathname.startsWith("/documents")) return "documents";
  if (pathname.startsWith("/probability")) return "probability";
  if (pathname.startsWith("/roadmap")) return "roadmap";
  if (pathname.startsWith("/settings")) return "settings";
  return "chat";
}

export function LayoutShell({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(readSidebarOpen);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const activeView = pathToView(location.pathname);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, desktopSidebarOpen ? "1" : "0");
    } catch {
      // ignore
    }
  }, [desktopSidebarOpen]);

  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  const toggleSidebar = useCallback(() => {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      setDesktopSidebarOpen((v) => !v);
    } else {
      setMobileSidebarOpen((v) => !v);
    }
  }, []);

  // Listen for sidebar toggle requests from child components (e.g., ChatShell hamburger)
  useEffect(() => {
    const handler = () => toggleSidebar();
    window.addEventListener("scholarsight:toggle-sidebar", handler);
    return () => window.removeEventListener("scholarsight:toggle-sidebar", handler);
  }, [toggleSidebar]);

  const handleSelectView = useCallback(
    (v: AppView) => {
      const paths: Record<AppView, string> = {
        chat: "/chat",
        documents: "/documents",
        probability: "/probability",
        roadmap: "/roadmap",
        settings: "/settings",
      };
      navigate(paths[v]);
      closeMobileSidebar();
    },
    [navigate, closeMobileSidebar],
  );

  const sidebarProps = {
    activeView,
    onSelectView: handleSelectView,
    onLogout,
    collapsed: !desktopSidebarOpen,
    onCollapse: toggleSidebar,
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "relative z-20 hidden shrink-0 lg:block",
          "transition-[width] duration-300 ease-out",
          desktopSidebarOpen ? "" : "overflow-hidden",
        )}
        style={{ width: desktopSidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 h-full bg-sidebar shadow-inner-right overflow-hidden",
            "transition-transform duration-300 ease-out",
            desktopSidebarOpen ? "translate-x-0" : "-translate-x-0",
          )}
          style={{ width: SIDEBAR_WIDTH }}
        >
          <Sidebar {...sidebarProps} />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileSidebarOpen} onOpenChange={(open) => setMobileSidebarOpen(open)}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="p-0 lg:hidden"
          style={{ width: SIDEBAR_WIDTH, maxWidth: SIDEBAR_WIDTH }}
        >
          <Sidebar {...sidebarProps} collapsed={false} onCollapse={closeMobileSidebar} />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col lg:pb-0 pb-[52px]">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <MobileTabBar activeView={activeView} onSelectView={handleSelectView} />
    </div>
  );
}

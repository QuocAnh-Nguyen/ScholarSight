import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatShell } from "@/components/chat/ChatShell";
import { LandingPage } from "@/components/landing/LandingPage";
import { ProbabilityShell } from "@/components/probability/ProbabilityShell";
import { RoadmapShell } from "@/components/roadmap/RoadmapShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import type { AppView } from "@/lib/types";

const SIDEBAR_STORAGE_KEY = "scholarsight.sidebar";
const SIDEBAR_WIDTH = 272;

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

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

/** Boot state machine: loading → auth (login/register) → ready (shell). */
function AppShell() {
  const { t } = useTranslation();
  const { token, isLoading, login, register, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [view, setView] = useState<AppView>("chat");
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(readSidebarOpen);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Persist sidebar state
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

  const handleLogin = useCallback(async (email: string, password: string) => {
    setSubmitting(true);
    setAuthFailed(false);
    try {
      await login(email, password);
    } catch {
      setAuthFailed(true);
    } finally {
      setSubmitting(false);
    }
  }, [login]);

  const handleRegister = useCallback(async (email: string, password: string, fullName: string) => {
    setSubmitting(true);
    setAuthFailed(false);
    try {
      await register(email, password, fullName);
    } catch {
      setAuthFailed(true);
    } finally {
      setSubmitting(false);
    }
  }, [register]);

  const handleLogout = useCallback(() => {
    logout();
    setView("chat");
  }, [logout]);

  const handleSelectView = useCallback((v: AppView) => {
    setView(v);
    closeMobileSidebar();
  }, [closeMobileSidebar]);

  // Loading state — only for initial bootstrap, not during auth form submission
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-in fade-in-0 duration-300">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground/60" />
            </span>
            {t("app.loading.connecting")}
          </div>
        </div>
      </div>
    );
  }

  // Auth gate: show landing page with embedded auth card if not authenticated
  if (!token) {
    return (
      <LandingPage
        onLogin={handleLogin}
        onRegister={handleRegister}
        authFailed={authFailed}
        submitting={submitting}
      />
    );
  }

  // Ready state: full shell with sidebar + feature views
  document.title = t("app.documentTitle.base");

  const sidebarProps = {
    activeView: view,
    onSelectView: handleSelectView,
    onLogout: handleLogout,
    collapsed: !desktopSidebarOpen,
    onCollapse: toggleSidebar,
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "relative z-20 hidden shrink-0 overflow-hidden lg:block",
          "transition-[width] duration-300 ease-out",
        )}
        style={{ width: desktopSidebarOpen ? SIDEBAR_WIDTH : 0 }}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 h-full overflow-hidden bg-sidebar shadow-inner-right",
            "transition-transform duration-300 ease-out",
            desktopSidebarOpen ? "translate-x-0" : "-translate-x-full",
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
      <main className="relative flex h-full min-w-0 flex-1 flex-col">
        {view === "chat" && (
          <ChatShell
            onToggleSidebar={toggleSidebar}
            hideSidebarToggleOnDesktop={desktopSidebarOpen}
            theme={theme}
            onToggleTheme={toggle}
          />
        )}
        {view === "probability" && <ProbabilityShell />}
        {view === "roadmap" && <RoadmapShell />}
        {view === "settings" && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {t("settings.sidebar.title")} — Coming in next phase
          </div>
        )}
      </main>
    </div>
  );
}
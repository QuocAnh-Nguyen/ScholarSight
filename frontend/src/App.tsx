import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { LandingPageRoute } from "@/pages/LandingPageRoute";
import { ChatPage } from "@/pages/ChatPage";
import { DocumentsPage } from "@/pages/DocumentsPage";
import { ProbabilityPage } from "@/pages/ProbabilityPage";
import { RoadmapPage } from "@/pages/RoadmapPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { DocumentProvider } from "@/providers/DocumentProvider";
import { useCallback } from "react";

function AuthenticatedLayout() {
  const { logout } = useAuth();

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <DocumentProvider>
      <AuthGuard>
        <LayoutShell onLogout={handleLogout} />
      </AuthGuard>
    </DocumentProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/" element={<LandingPageRoute />} />

          {/* Authenticated routes */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/probability" element={<ProbabilityPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all: redirect to / */}
          <Route path="*" element={<LandingPageRoute />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

import { LandingPage } from "@/components/landing/LandingPage";
import { useAuth } from "@/providers/AuthProvider";
import { Navigate } from "react-router-dom";
import { useCallback, useState } from "react";

export function LandingPageRoute() {
  const { token, isLoading, login, register } = useAuth();
  const [authFailed, setAuthFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      setSubmitting(true);
      setAuthFailed(false);
      try {
        await login(email, password);
      } catch {
        setAuthFailed(true);
      } finally {
        setSubmitting(false);
      }
    },
    [login],
  );

  const handleRegister = useCallback(
    async (email: string, password: string, fullName: string) => {
      setSubmitting(true);
      setAuthFailed(false);
      try {
        await register(email, password, fullName);
      } catch {
        setAuthFailed(true);
      } finally {
        setSubmitting(false);
      }
    },
    [register],
  );

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-in fade-in-0 duration-300">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground/60" />
            </span>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (token) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <LandingPage
      onLogin={handleLogin}
      onRegister={handleRegister}
      authFailed={authFailed}
      submitting={submitting}
    />
  );
}

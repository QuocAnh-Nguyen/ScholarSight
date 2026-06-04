import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";
import {
  fetchMe,
  setAccessToken,
  clearAccessToken,
  getAccessToken,
  refreshAccessToken,
} from "@/lib/api";
import type { UserResponse } from "@/lib/types";

interface AuthContextValue {
  token: string | null;
  user: UserResponse | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// localStorage fallback — used only when the refresh endpoint is unavailable.
// Once the backend supports HttpOnly cookies + /api/auth/refresh, this
// becomes a secondary recovery path.
// ---------------------------------------------------------------------------
const TOKEN_KEY = "scholarsight.token";

function loadTokenFallback(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveTokenFallback(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function clearTokenFallback(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getAccessToken);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async (authToken: string) => {
    try {
      const me = await fetchMe(authToken);
      setUser(me);
    } catch {
      clearAccessToken();
      clearTokenFallback();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Bootstrap: try HttpOnly cookie refresh first, fall back to localStorage
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // 1. Try refreshing via HttpOnly cookie (defense-in-depth)
      const refreshed = await refreshAccessToken();
      if (!cancelled && refreshed) {
        setToken(refreshed);
        await fetchUser(refreshed);
        return;
      }

      // 2. Fall back to localStorage
      const stored = loadTokenFallback();
      if (!cancelled && stored) {
        setAccessToken(stored);
        setToken(stored);
        await fetchUser(stored);
        return;
      }

      // 3. Not authenticated
      if (!cancelled) {
        setIsLoading(false);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { loginApi } = await import("@/lib/api");
    const resp = await loginApi(email, password);
    setAccessToken(resp.access_token);
    saveTokenFallback(resp.access_token);
    setToken(resp.access_token);
    await fetchUser(resp.access_token);
  }, [fetchUser]);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const { registerApi } = await import("@/lib/api");
    const resp = await registerApi(email, password, fullName);
    setAccessToken(resp.access_token);
    saveTokenFallback(resp.access_token);
    setToken(resp.access_token);
    await fetchUser(resp.access_token);
  }, [fetchUser]);

  const logout = useCallback(() => {
    clearAccessToken();
    clearTokenFallback();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { TOKEN_KEY };

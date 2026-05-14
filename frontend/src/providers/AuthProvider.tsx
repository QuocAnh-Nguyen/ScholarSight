import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";
import { fetchMe } from "@/lib/api";
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

const TOKEN_KEY = "scholarsight.token";

function loadToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(loadToken);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async (authToken: string) => {
    try {
      const me = await fetchMe(authToken);
      setUser(me);
    } catch {
      clearToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = loadToken();
    if (stored) {
      setToken(stored);
      fetchUser(stored);
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { loginApi } = await import("@/lib/api");
    const resp = await loginApi(email, password);
    saveToken(resp.access_token);
    setToken(resp.access_token);
    await fetchUser(resp.access_token);
  }, [fetchUser]);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const { registerApi } = await import("@/lib/api");
    const resp = await registerApi(email, password, fullName);
    saveToken(resp.access_token);
    setToken(resp.access_token);
    await fetchUser(resp.access_token);
  }, [fetchUser]);

  const logout = useCallback(() => {
    clearToken();
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
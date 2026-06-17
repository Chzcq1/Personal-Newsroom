import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getOrCreateProfile } from "@/lib/userIdentity";

const TOKEN_KEY = "ai-newsroom:auth-token";
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  provider: "anonymous" | "email" | "google";
  role: "user" | "admin";
  tier: "free" | "founding_member" | "premium_future";
  foundingMember: boolean;
  anonymousProfileId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  profileId: string;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });
  const anonymousProfile = getOrCreateProfile();

  const setToken = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    setState({ user, token, loading: false });
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, loading: false });
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Token invalid");
        const data = await r.json() as { user: AuthUser };
        setState({ user: data.user, token: stored, loading: false });
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      const e = await r.json() as { error: string };
      throw new Error(e.error ?? "Login failed");
    }
    const data = await r.json() as { token: string; user: AuthUser };
    setToken(data.token, data.user);
  }, [setToken]);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const r = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        displayName,
        anonymousProfileId: anonymousProfile.profileId,
      }),
    });
    if (!r.ok) {
      const e = await r.json() as { error: string };
      throw new Error(e.error ?? "Registration failed");
    }
    const data = await r.json() as { token: string; user: AuthUser };
    setToken(data.token, data.user);
  }, [setToken, anonymousProfile.profileId]);

  const loginWithGoogle = useCallback(() => {
    window.location.href = `${BASE}/api/auth/google`;
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await fetch(`${BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearAuth();
  }, [clearAuth]);

  const profileId = state.user?.anonymousProfileId ?? anonymousProfile.profileId;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        loginWithGoogle,
        logout,
        profileId,
        isAdmin: state.user?.role === "admin",
        isAuthenticated: !!state.user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

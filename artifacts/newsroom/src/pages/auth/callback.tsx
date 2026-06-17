import { useEffect } from "react";
import { useLocation } from "wouter";

const TOKEN_KEY = "ai-newsroom:auth-token";

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      setLocation("/profile");
    } else {
      setLocation(`/auth/login?error=${error ?? "unknown"}`);
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin mx-auto" />
        <p className="text-white/40 text-sm">Signing you in…</p>
      </div>
    </div>
  );
}

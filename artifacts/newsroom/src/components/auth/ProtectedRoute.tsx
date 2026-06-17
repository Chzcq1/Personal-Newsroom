import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  role?: "user" | "admin";
  redirectTo?: string;
}

export function ProtectedRoute({ children, role = "user", redirectTo = "/auth/login" }: ProtectedRouteProps): ReactNode {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Redirect to={redirectTo} />;
  if (role === "admin" && user.role !== "admin") return <Redirect to="/" />;

  return children;
}

export function AdminRoute({ children }: { children: ReactNode }): ReactNode {
  return (
    <ProtectedRoute role="admin" redirectTo="/">
      {children}
    </ProtectedRoute>
  );
}

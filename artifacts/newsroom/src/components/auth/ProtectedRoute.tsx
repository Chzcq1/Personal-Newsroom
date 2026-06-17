/**
 * ProtectedRoute — Sprint 21 Placeholder
 *
 * Sprint 20: Passthrough. All routes are accessible.
 * Sprint 21: Check AuthContext session before rendering.
 *
 * Usage (Sprint 21):
 *   <ProtectedRoute>
 *     <MySecurePage />
 *   </ProtectedRoute>
 *
 *   <ProtectedRoute role="admin">
 *     <AdminPage />
 *   </ProtectedRoute>
 */

import type { ReactNode } from "react";
// Sprint 21: import { useAuth } from "@/contexts/AuthContext";
// Sprint 21: import { Redirect } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Required role. Default: "user" (any authenticated user) */
  role?: "user" | "admin";
  /** Where to redirect if not authenticated. Default: "/auth/login" */
  redirectTo?: string;
}

export function ProtectedRoute({ children }: ProtectedRouteProps): ReactNode {
  // Sprint 21 TODO:
  // const { user, loading } = useAuth();
  // if (loading) return <LoadingSpinner />;
  // if (!user) return <Redirect to={redirectTo ?? "/auth/login"} />;
  // if (role === "admin" && user.role !== "admin") return <Redirect to="/" />;

  // Sprint 20: passthrough — anonymous identity is sufficient
  return children;
}

/**
 * AdminRoute — convenience wrapper for admin-only routes.
 * Sprint 21: Will redirect non-admin users to /.
 */
export function AdminRoute({ children }: { children: ReactNode }): ReactNode {
  return <ProtectedRoute role="admin">{children}</ProtectedRoute>;
}

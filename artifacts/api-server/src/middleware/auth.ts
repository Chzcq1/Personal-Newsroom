/**
 * auth.ts — Authentication Middleware Placeholder
 *
 * Sprint 20: Structural placeholder only.
 * Sprint 21: Replace with real JWT/session verification.
 *
 * Architecture contract (for Sprint 21):
 * ─────────────────────────────────────
 * - All protected routes call requireAuth() before route handler
 * - requireAuth reads JWT from Authorization header or httpOnly cookie
 * - On success: attaches req.user (AuthUser) and calls next()
 * - On failure: 401 with { error: "Unauthorized" }
 *
 * requireAdmin() additionally checks req.user.role === "admin"
 * On failure: 403 with { error: "Forbidden" }
 *
 * Entitlement check (Sprint 22+):
 * - requireEntitlement("pro") checks subscription tier
 * - On failure: 402 with { error: "Subscription required" }
 */

import type { Request, Response, NextFunction } from "express";

// ─────────────────────────────────────────────────────────────
// Types (contract for Sprint 21)
// ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  profileId: string;
  email?: string;
  role: "user" | "admin";
  tier: "free" | "pro" | "enterprise";
  sessionId: string;
}

// Extend Express Request to carry auth context
declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

// ─────────────────────────────────────────────────────────────
// Middleware stubs (Sprint 21: replace with real logic)
// ─────────────────────────────────────────────────────────────

/**
 * requireAuth — protect a route behind authentication.
 *
 * Sprint 20: PASSTHROUGH (no auth yet — anonymous identity only).
 * Sprint 21: Verify JWT, attach req.user, call next() or 401.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // SPRINT 21 TODO: implement real JWT verification
  // const token = req.cookies?.session ?? req.headers.authorization?.replace("Bearer ", "");
  // if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  // try {
  //   const payload = verifyJwt(token);
  //   req.user = payload;
  //   next();
  // } catch {
  //   res.status(401).json({ error: "Unauthorized" });
  // }

  // Sprint 20 passthrough — anonymous identity is sufficient
  next();
}

/**
 * requireAdmin — protect a route behind admin role check.
 *
 * Sprint 20: PASSTHROUGH (admin routes are trust-based for now).
 * Sprint 21: Check req.user.role === "admin" after requireAuth.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  // SPRINT 21 TODO: check req.user?.role === "admin"
  // if (!req.user || req.user.role !== "admin") {
  //   res.status(403).json({ error: "Forbidden" });
  //   return;
  // }

  // Sprint 20 passthrough
  next();
}

/**
 * requireEntitlement — protect a route behind subscription tier.
 *
 * Sprint 22+ TODO: implement subscription check.
 */
export function requireEntitlement(tier: "pro" | "enterprise") {
  return function (_req: Request, _res: Response, next: NextFunction): void {
    // SPRINT 22 TODO: check req.user?.tier >= tier
    // For now: passthrough
    void tier;
    next();
  };
}

/**
 * optionalAuth — attach user context if token present, but don't block.
 * Useful for routes that serve both authenticated and anonymous users.
 *
 * Sprint 20: No-op.
 * Sprint 21: Parse token if present, attach req.user, always call next().
 */
export function optionalAuth(_req: Request, _res: Response, next: NextFunction): void {
  // SPRINT 21 TODO: parse token if present
  next();
}

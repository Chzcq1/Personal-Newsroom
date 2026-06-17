import type { Request, Response, NextFunction } from "express";
import { verifyJwt, type JwtPayload } from "../services/auth/authService.js";
import { touchSession } from "../repositories/userRepository.js";

export interface AuthUser {
  userId: string;
  profileId: string;
  email: string | null;
  role: "user" | "admin";
  tier: "free" | "founding_member" | "premium_future";
  sessionId: string;
}

// Typed request that carries an authenticated user — use instead of module augmentation
// (tsconfig "types":["node"] prevents express-serve-static-core from being augmented directly)
export type AuthedRequest = Request & { user: AuthUser };

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const cookie = (req.cookies as Record<string, string> | undefined)?.["auth_token"];
  return cookie ?? null;
}

function payloadToAuthUser(payload: JwtPayload): AuthUser {
  return {
    userId: payload.userId,
    profileId: payload.profileId,
    email: payload.email,
    role: payload.role,
    tier: payload.tier,
    sessionId: payload.sessionId,
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = verifyJwt(token);
    (req as AuthedRequest).user = payloadToAuthUser(payload);
    void touchSession(payload.sessionId);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized — token invalid or expired" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = verifyJwt(token);
    if (payload.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    (req as AuthedRequest).user = payloadToAuthUser(payload);
    void touchSession(payload.sessionId);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized — token invalid or expired" });
  }
}

export function requireEntitlement(tier: "pro" | "enterprise") {
  return function (_req: Request, _res: Response, next: NextFunction): void {
    void tier;
    next();
  };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyJwt(token);
      (req as AuthedRequest).user = payloadToAuthUser(payload);
      void touchSession(payload.sessionId);
    } catch {
      // Token present but invalid — proceed as anonymous
    }
  }
  next();
}

/** Helper — read auth user after requireAuth middleware. Throws if not present. */
export function getAuthUser(req: Request): AuthUser {
  const user = (req as AuthedRequest).user;
  if (!user) throw new Error("requireAuth middleware must run first");
  return user;
}

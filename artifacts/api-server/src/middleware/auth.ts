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

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

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
    req.user = payloadToAuthUser(payload);
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
    req.user = payloadToAuthUser(payload);
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
      req.user = payloadToAuthUser(payload);
      void touchSession(payload.sessionId);
    } catch {
      // Token present but invalid — proceed as anonymous
    }
  }
  next();
}

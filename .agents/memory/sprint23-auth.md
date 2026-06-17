---
name: Sprint 23 Authentication
description: Real auth implementation — email/password, Google OAuth, JWT sessions, anonymous migration, TypeScript patterns used.
---

## AuthedRequest type pattern (CRITICAL)

tsconfig `"types": ["node"]` prevents `express-serve-static-core` from resolving in module augmentation:

```
// BROKEN — do not use
declare module "express-serve-static-core" { interface Request { user?: AuthUser; } }

// CORRECT — use intersection type + cast + helper
export type AuthedRequest = Request & { user: AuthUser };
export function getAuthUser(req: Request): AuthUser { ... }

// In middleware:
(req as AuthedRequest).user = payloadToAuthUser(payload);

// In routes:
const userId = getAuthUser(req).userId;
```

**Why:** The pnpm virtual store has `@types/express-serve-static-core` but the tsconfig types restriction prevents TypeScript from resolving it as an augmentable module. Cast + helper is safe and explicit.

## Key files

- `artifacts/api-server/src/middleware/auth.ts` — AuthedRequest, requireAuth, requireAdmin, optionalAuth, getAuthUser
- `artifacts/api-server/src/services/auth/authService.ts` — bcryptjs + jsonwebtoken + Google OAuth manual flow
- `artifacts/api-server/src/repositories/userRepository.ts` — getUserByEmail, createUser, createSession, touchSession, deactivateSession
- `artifacts/api-server/src/routes/auth.ts` — 8 endpoints under /api/auth/*
- `artifacts/newsroom/src/contexts/AuthContext.tsx` — AuthProvider + useAuth()
- `lib/db/src/schema/users.ts` + `userSessions.ts` — 2 new DB tables

## Config

- `JWT_SECRET` — Replit secret (30-day HS256 tokens)
- `ADMIN_EMAILS` — comma-separated list, grants role=admin on register/login
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — optional; Google OAuth returns configured:false if absent
- `FRONTEND_URL` — used for Google OAuth callback redirect

## Anonymous migration

JWT payload always carries `profileId` = the anonymous profile UUID (from localStorage `ai-newsroom:profile-id`). All data routes (interests, watchlist, saved briefings) key on profileId and remain unchanged after account creation. Migration links the existing user_profiles row to the new users row.

## Pre-existing TS errors (not Sprint 23)

These 8 errors existed before Sprint 23 — do not attempt to fix them as auth work:
- adminNarratives.ts(144): TS7030 not all code paths return a value
- debug.ts(74,77): TS2322 string | null not assignable
- proactiveIntelligence.ts(140): TS7030 not all code paths return a value
- deliveryEngine.ts(110,111): TS2339 signalScore not on RssArticle
- retryWorker.ts(32): TS2339 sendTelegramMessages not found

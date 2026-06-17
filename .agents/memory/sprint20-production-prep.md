---
name: Sprint 20 Production Preparation
description: vite.config.ts PORT default fix, dead file deletion, auth foundations, /admin/system + /admin/health pages
---

## Critical Fix: vite.config.ts must NOT hard-throw on missing PORT/BASE_PATH

`artifacts/newsroom/vite.config.ts` previously threw an error if `PORT` or `BASE_PATH` env vars were not set. The `artifacts/newsroom: web` Replit-managed workflow does NOT inject these, so the workflow always failed.

**Fix applied:** Replace hard-throw with safe defaults:
```ts
const rawPort = process.env.PORT ?? "23519";
const basePath = process.env.BASE_PATH ?? "/";
```

**Why:** The `web` (custom) workflow uses `PORT=23519 BASE_PATH=/ ...` but the `artifacts/newsroom: web` (Replit-managed) workflow uses the bare pnpm command. Safe defaults let both work.

**How to apply:** If the web workflow fails with "PORT environment variable is required", check vite.config.ts for hard-throws and add defaults.

## Rule: Delete dead page files when de-routing in App.tsx

Sprint 19 removed routes from App.tsx but left 17 page files on disk, imported as "legacy redirects". This caused build failures in Sprint 20 when imports of deleted components remained.

**Pattern:** When removing a route, ALWAYS either delete the page file OR keep it imported. Never import and then delete without updating App.tsx.

**Sprint 20 fix:** Replaced 7 dead legacy page imports with wouter `<Redirect>` components. No imports needed — just route handlers returning `<Redirect to="/new-path" />`.

## Auth Middleware Contract (Sprint 21 prep)

File: `artifacts/api-server/src/middleware/auth.ts`

Exports: `requireAuth`, `requireAdmin`, `requireEntitlement(tier)`, `optionalAuth`

All are passthrough in Sprint 20. Sprint 21 replaces with real JWT verification.

`AuthUser` interface: `{ id, profileId, email?, role: "user"|"admin", tier: "free"|"pro"|"enterprise", sessionId }`

## ProtectedRoute Contract (Sprint 21 prep)

File: `artifacts/newsroom/src/components/auth/ProtectedRoute.tsx`

Exports: `ProtectedRoute`, `AdminRoute`

Both are passthrough in Sprint 20. Sprint 21 adds `useAuth()` hook from `AuthContext`.

## New Admin Pages (Sprint 20)

- `/admin/system` — ops dashboard with 6 collapsible sections; polls `/api/health`; 30s auto-refresh
- `/admin/health` — real-time health monitor; polls `/api/health`; 15s auto-refresh; live/pause toggle

## Deployment Makefile

`deployment/Makefile` added at workspace root. Common commands:
- `make dev` — start API server
- `make start-web` — start frontend
- `make push-schema` — push DB schema
- `make docker-up` — start all via Docker Compose
- `make deploy-railway` / `make deploy-fly` — deployment guides

## Route count after Sprint 20: ~23 route entries, 12 functional destinations

(The budget rule says ≤20 FUNCTIONAL routes; legacy redirects are not counted.)

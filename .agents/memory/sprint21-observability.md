---
name: Sprint 21 Observability
description: Double-prefix route bug pattern, new observability routes, and analytics DB tables added in Sprint 21
---

# Sprint 21 — Observability & Business Intelligence

## Critical Pattern: Double /api/ Prefix Bug

**Rule:** Route handlers declared inside a router that is `app.use("/api", router)` must NOT include `/api/` in their path strings.

**Why:** Express strips the mount prefix before passing to sub-routers. A route declared as `/api/economics/summary` inside a router mounted at `/api` is served at `/api/api/economics/summary` — a 404 from any normal frontend call.

**Correct pattern:**
```ts
// Router mounted: app.use("/api", router)
// Inside route file:
router.get("/economics/summary", ...)  // served at /api/economics/summary ✓
router.get("/api/economics/summary", ...)  // served at /api/api/economics/summary ✗
```

**Files fixed in Sprint 21:**
- `economics.ts`, `identity.ts`, `adminNarratives.ts`, `knowledgeCompound.ts`, `proactiveIntelligence.ts`, `waitlist.ts`

**How to detect:** `grep -rn 'router\.(get|post|put|delete|patch)("/api/' artifacts/api-server/src/routes/`

## Wildcard Route Ordering

**Rule:** Specific routes must be declared BEFORE wildcard routes in the same file.

```ts
// WRONG — /identity/profiles is matched as :id="profiles"
router.get("/identity/:id", ...)
router.get("/identity/profiles", ...)

// CORRECT
router.get("/identity/profiles", ...)  // specific first
router.get("/identity/:id", ...)       // wildcard after
```

**Applied in:** `identity.ts` — `/identity/profiles` moved before `/identity/:id`.

## Route Naming Conflicts

If two routers declare the same path, the one registered FIRST in `index.ts` wins. When adding new routes that may conflict with old ones, either rename the old route or ensure registration order. Example: old `analytics.ts` `/admin/analytics` was renamed to `/admin/analytics/delivery-quality` to avoid conflict with new `adminAnalytics.ts`.

## New Tables (Sprint 21)

- `analytics_events` — event stream (`id`, `profileId`, `sessionId`, `eventType`, `properties` jsonb, `url`, `referrer`, `userAgent`, `createdAt`)
- `token_usage_daily` — daily token aggregation per feature/topic

## New Observability Endpoints

All served at `/api/*`:
- `POST /events/track` + `POST /events/batch` — event ingestion
- `GET /admin/events/recent` + `GET /admin/events/stats` — event queries
- `GET /admin/analytics` — business snapshot (DAU/WAU/MAU, delivery, events)
- `GET /admin/analytics/usage` — 14-day daily chart
- `GET /admin/analytics/features` — feature popularity
- `GET /admin/analytics/funnel` — conversion funnel
- `GET /admin/analytics/alerts` — system health alerts
- `GET /identity/profiles` — all anonymous profiles (admin)

## Frontend

- `useAnalytics` hook + `trackEvent` standalone in `hooks/useAnalytics.ts`
- Batched with 300ms debounce, keepalive fetch, silently swallows errors
- Pages: `/admin/command-center` + `/admin/users`

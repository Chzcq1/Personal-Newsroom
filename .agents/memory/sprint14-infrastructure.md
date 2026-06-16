---
name: Sprint 14 Persistent Infrastructure
description: DB schema (11 tables), storage abstraction, workers, startup recovery, identity API, economics API, onboarding, deployment configs — and critical gotchas for future sprints.
---

# Sprint 14 — Persistent Infrastructure & Identity Foundation

## What shipped

- **11 Drizzle tables** in `lib/db/src/schema/`: userProfiles, userPreferences, savedBriefings, feedbackEvents, deliveryHistory, deliveryQueue, narrativeThreads, entityMemoryEntries, analyticsSnapshots, workerCheckpoints, systemConfig
- **IRepository abstraction** (`services/storage/`): `memoryAdapter` (in-process Map) + `pgAdapter` (Drizzle). Server auto-detects based on `DATABASE_URL` presence.
- **5 repositories** in `artifacts/api-server/src/repositories/`
- **3 background workers**: retry (60 s), narrative (30 min), analytics (15 min); started by `workerRegistry` on boot
- **Startup recovery** (`services/infra/startupRecovery.ts`): DB health check + stale queue recovery on every boot
- **Identity API** (`routes/identity.ts`): 7 endpoints for profile sync, onboarding, feedback, briefing persistence
- **Economics API** (`routes/economics.ts`): token budget + cost summary
- **Frontend**: `/onboarding` (4-step founding-member flow), `/admin/economics` (cost visibility)
- **Deployment files**: `deployment/Dockerfile`, `docker-compose.yml`, `.env.example`, `railway.toml`, `render.yaml`, `fly.toml`
- **longTermMemory.ts** `getMigrationStatus()` updated to Phase 2 (PostgreSQL active)

## Critical gotchas

### No zod in @workspace/api-server
`zod` is NOT installed in `@workspace/api-server`. esbuild bundles everything and fails on `import { z } from "zod"` or `"zod/v4"` because neither resolves. All route validation must use manual type-guard style (see `routes/identity.ts` for the pattern). To add zod: add it to `artifacts/api-server/package.json` dependencies first.

**Why:** `@workspace/api-server` was designed to avoid adding the zod runtime to the server bundle. `@workspace/api-zod` holds shared Zod schemas for the OpenAPI spec layer only.

### topics?.map is not a function
Pre-existing bug on home.tsx: React Query may return a stale non-array cache hit (object) instead of `Topic[]`. Fixed with `Array.isArray(topicsRaw)` defensive guard. Always guard `useGetTopics()` return with `Array.isArray`.

### Startup log confirms persistence mode
When `DATABASE_URL` is set and DB is reachable, the server logs:
```
[StartupRecovery] Full persistence mode — all services operational
```
If DB is down, it degrades silently to memory mode — no crash.

### Worker health is logged, not surfaced in UI
Workers log `[Worker] Started` on boot with interval. No admin page for worker heartbeats yet (workerCheckpoints table is written but not displayed).

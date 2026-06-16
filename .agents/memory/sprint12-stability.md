---
name: Sprint 12 Delivery Stability
description: New backend services, workflow commands, and key architecture decisions from Sprint 12 Delivery Stability sprint.
---

## New Services (Sprint 12)

All in `artifacts/api-server/src/services/delivery/` and `artifacts/api-server/src/services/ai/`:

- `articleCompressionV2.ts` — sentence-level compression, `compressArticleBatch()`
- `sourceReliability.ts` — per-source 3-tier scoring, `recordFeedFetchResult()`, `recordArticleQuality()`
- `deliveryRecovery.ts` — heartbeat + digest persistence + retry queue; `recordHeartbeat()`, `persistDigestBeforeSend()`, `getRecoverySnapshot()`
- `tokenEconomy.ts` — narrative deduplication, priority budgets, cost tracking; `deduplicateNarratives()`, `allocatePriorityBudget()`, `recordTokenUsage()`, `getTokenStats()`
- `persistentMemoryPrep.ts` — in-memory stores with Drizzle-ready interfaces; `buildPersonalizationContext()`, `getMigrationReadiness()`

## Workflow Commands

After dependencies are missing (fresh environment), run `pnpm install` first, then configure workflows via `configureWorkflow()` with explicit env vars:

```
API Server: PORT=8080 pnpm --filter @workspace/api-server run dev
web:        PORT=23519 BASE_PATH=/ pnpm --filter @workspace/newsroom run dev
```

**Why:** Both api-server and newsroom require PORT (and newsroom requires BASE_PATH) as environment variables at startup. Without them, the process throws and workflow fails. These vars must be inline in the workflow command — they're not in `.env` by default.

## New Routes

- `POST /api/delivery/preview/send` — test send a real briefing to Telegram
- `GET /api/delivery/recovery` — heartbeat + retry queue + missed windows snapshot
- `GET /api/admin/delivery` — analytics V2 with token stats + recovery snapshot

## New Frontend

- `/admin/delivery` — Delivery Analytics V2 page (`artifacts/newsroom/src/pages/admin/delivery.tsx`)
- `/settings/delivery/debug` — "Send Test Briefing" card with 4 buttons (morning/evening/executive/intelligence)
- `/admin/analytics` now has "V2" link in header → `/admin/delivery`

## Persist-Before-Send Pattern

Digest stored as `pending` before channel.send(). On success → `delivered`; on failure → `failed` + queued for retry (3 attempts, delays: 1m → 5m → 15m). Retry worker is queued but not yet active.

## Token Economy Budgets

DEFAULT: 18k chars total | EXECUTIVE: 8k | INTELLIGENCE: 22k
Priority tiers: critical(800) > high(600) > medium(350) > low(150) chars per article.

## Key Decisions

- `summarizeExecutive()` exists in `summaryService.ts` at line 137 — takes `(articles, topicLabels)`.
- `briefingFormatter.ts` was fully rewritten with 4 formatters; Bloomberg/FT aesthetic; Thai reading time ~440 chars/min.
- Persistent memory stores use `InMemoryStore<T>` interface matching future Drizzle ORM — migration is a swap of backing implementation only.

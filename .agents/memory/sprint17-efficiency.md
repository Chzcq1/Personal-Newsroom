---
name: Sprint 17 Efficiency Infrastructure
description: Token economy optimization, AI cost control, source expansion (Reddit/Twitter), intelligence caching, runtime independence, and signal ingestion architecture.
---

## Key Architecture Decisions

**Degradation beats all other signals**: In both `compressionEngine.ts` (profile selection) and `aiPipeline.ts` (tier gating), degradation level is checked first. Token pressure, signal mode are secondary.

**`getPipelineStats()` returns `tokenPressure` not `pressureLevel`**: The pipeline stats shape uses `tokenPressure`; the token governor state uses `pressureLevel`. Don't confuse them in frontend typings.

**Source adapters must be registered in `index.ts`**: `getAllSourceAdapters()` returns nothing unless adapters are registered via `registerSourceAdapter()`. Registration happens in `artifacts/api-server/src/index.ts` after server starts.

**Twitter adapter is always disabled unless `TWITTER_BEARER_TOKEN` is set**: `twitterAdapter.isEnabled === false` by default. Registering it conditionally is handled in index.ts.

## New Services

| Service | Location | Key Export |
|---------|----------|------------|
| AI Pipeline | `services/intelligence/aiPipeline.ts` | `getPipelineStats()` → `{ degradationLevel, tokenPressure, signalMode, premiumThreshold }` |
| Degradation Engine | `services/intelligence/degradationEngine.ts` | `getDegradationSnapshot()`, `setManualOverride()`, `clearManualOverride()`, `DEGRADATION_CONFIGS` |
| Token Governor | `services/intelligence/tokenGovernor.ts` | `getTokenGovernorState()` → `{ pressureLevel, budgetFraction, ... }` |
| Intelligence Cache | `services/cache/intelligenceCache.ts` | `cacheIntelligence()`, `getCachedIntelligence()`, `getIntelligenceCacheStats()`, `getCacheEntries()` |
| Source Adapter | `services/sources/sourceAdapter.ts` | `ISourceAdapter`, `registerSourceAdapter()`, `getAllSourceAdapters()`, `fetchFromAllSources()` |
| Reddit Adapter | `services/sources/redditSourceAdapter.ts` | `redditAdapter` singleton, 10 subreddits, public JSON API |
| Twitter Adapter | `services/sources/twitterSignalAdapter.ts` | `twitterAdapter` singleton, disabled unless env var set |
| Compression Engine | `services/delivery/compressionEngine.ts` | `selectCompressionProfile()`, `compressToProfile()`, `analyzeCompression()` |
| Runtime Separation | `services/runtime/runtimeSeparation.ts` | `getRuntimeStats()`, `getMigrationPlan()`, `recordRuntimePing()` |
| User Session | `services/auth/userSession.ts` | `getOrCreateSession()`, `checkEntitlement()`, `TIER_ENTITLEMENTS` |

## New Routes (all registered via `routes/efficiencyAdmin.ts`)

- `GET /api/admin/degradation` — snapshot + allLevels
- `POST /api/admin/degradation` — set level 0-4 (`{ level, reason }`)
- `DELETE /api/admin/degradation` — clear manual override
- `GET /api/admin/token-governor` — budget snapshot
- `GET /api/admin/intelligence-cache` — stats + entries
- `GET /api/admin/sources` — adapter health (runs live health() calls)
- `GET /api/admin/runtime` — stats + full migration plan
- `GET /api/admin/pipeline` — pipeline stats + session counts

## New Frontend

- `/admin/efficiency` — efficiency control dashboard (degradation, token governor, cache, sources, runtime panels)
- System intelligence page now has "Efficiency →" link in header

## P0 Runtime Risks (documented, not yet fixed)

Two services break on Replit sleep:
1. **Delivery Scheduler** — in-memory setTimeout; migration target: Upstash QStash
2. **Narrative Memory** — in-memory ring buffer; migration target: PostgreSQL 30-min checkpoint worker

## Why

Sprint 17 goal: INFOX must be able to reduce AI cost automatically when budgets spike, ingest signals from sources beyond RSS, avoid re-paying for the same intelligence, and be ready for always-on infrastructure migration.

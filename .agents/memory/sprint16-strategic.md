---
name: Sprint 16 Strategic Intelligence
description: Signal Mode, Priority Hierarchy, Confidence Scoring, Strategic Context, Action Insight, BriefingFormatterV3, System Intelligence dashboard
---

## Key Rule
Routes in Express sub-routers must NOT include `/api` prefix. The main app mounts at `app.use("/api", router)` — sub-routes use `/signal-mode` not `/api/signal-mode`.

**Why:** The app.ts mounts the main router at `/api`, so all child route paths are already scoped. Double-prefixing causes silent 404s with no build error.

**How to apply:** Every new route file — verify the path does NOT start with `/api`. Use just `router.get("/your-path", ...)`.

## Services Added

- `signalModeEngine.ts` — 3 modes (safe/balanced/raw); `getSignalMode()`, `setSignalMode()`, `getSignalModeConfig()`, `getAllSignalModes()`
- `priorityHierarchy.ts` — 5 tiers: critical/major/emerging/contextual/noise; uses `NarrativeCluster.sourceCount` not `articleCount`, `NarrativeCluster.articles.length` for momentum
- `confidenceScoring.ts` — 0–100 score + 5 signal classes; `SIGNAL_CLASS_CONFIGS` has `id` field
- `strategicContext.ts` — personalised "why this matters" explanation
- `actionInsight.ts` — strategic implications + watch entities + urgency (watch/prepare/act)
- `briefingFormatterV3.ts` — 6-section premium structure

## Routes Added

- `GET/POST /api/signal-mode` — mode read/write
- `GET /api/signal-mode/configs` — all mode definitions
- `GET /api/admin/system-intelligence` — full intelligence observability snapshot

## Frontend Added

- `/settings/signal-mode` — 3 mode cards with risk/speed indicators
- `/admin/system-intelligence` — narratives, entities, delivery stats, token economy, adaptation
- `lib/signalMode.ts` — localStorage key `ai-newsroom:signal-mode`

## NarrativeCluster Fields (gotcha)
- Use `cluster.sourceCount` (not `articleCount`)
- Use `cluster.articles.length` for article count
- Use `cluster.avgCombinedScore` (not `score`)
- Use `cluster.canonicalHeadline` for NarrativeThread headline (not `headline`)
- Use `cluster.totalMentions` for NarrativeThread mentions (not `mentions`)

## EntityMemoryEntry Fields
- `mentionsLast24h` (not `mentions24h`)
- `mentionsLast7d` (not `mentions7d`)

## DeliveryStats Fields
- `totalDeliveries`, `successfulDeliveries`, `failedDeliveries` (not `total`, `successful`, `failed`)

## NarrativeMemoryStats Fields
- `total`, `active`, `emerging`, `peaking`, `declining`, `resolved` (not `totalThreads`, etc.)

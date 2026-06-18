---
name: Sprint 28 Governance & Realignment
description: Product governance framework, trend aggregation layer, social adapters, feed momentum UI added in Sprint 28
---

## What was done

Sprint 28 stopped feature chaos and realigned INFOX as a trend intelligence platform.

## Governance Docs (read before coding)

- `docs/WEB_TEAM.md` — team roles and workflow protocol (Product/UX/FeedIntelligence/Backend/QA/Release)
- `docs/PRODUCT_BRIEF.md` — product identity, target users, data sources, feed ranking priority, anti-patterns
- `docs/QUALITY_GATE.md` — QA checklist; defines "architecture-ready" exception for connectors without API keys

**Rule: Read all 3 governance docs before starting any new sprint.**

## New Service Layers

### Trend Aggregation (`services/trendAggregation/`)
- `trendNormalizer.ts` — RawSignal → TrendEntity with platform-scaled engagement normalization
- `trendMomentum.ts` — velocity engine, acceleration, MomentumLabel, Thai trend hooks
- `trendScoring.ts` — 5-signal composite scorer (momentum 35%, virality 25%, user-match 20%, recency 12%, source 8%)
- `trendCluster.ts` — Jaccard + title-word-overlap clustering
- `trendTopicExtractor.ts` — keyword-based topic/entity extraction, getAdjacentInterests()

### Social Adapters (`services/socialAdapters/`)
Active (no key needed):
- `redditAdapter.ts` — Reddit public JSON API
- `googleTrendsAdapter.ts` — Google Trends RSS (TH + US)
- `githubTrendingAdapter.ts` — GitHub trending proxy + Atom fallback

Architecture-ready (env var activates):
- `youtubeAdapter.ts` — needs `YOUTUBE_API_KEY`
- `twitterAdapter.ts` — needs `TWITTER_BEARER_TOKEN`
- `tiktokAdapter.ts` — needs TikTok Research API business approval
- `instagramAdapter.ts`, `facebookAdapter.ts` — needs Graph API tokens

## Feed UI Momentum (Sprint 28)

In `my-feed.tsx`:
- `deriveMomentum(signalScore, recencyLabel)` → exploding/rising/stable/fading
- FeedCard shows momentum badge + Thai hook phrase for exploding/rising only (not stable/fading)
- "Why this matters" renamed to "Why you see this"
- Dead admin debug links removed from user feed footer

## Routing Fixes

- `/settings/interests` → `/profile` in: my-feed.tsx (2 places), settings/index.tsx
- Admin link removed from settings footer
- App.tsx already had the `/settings/interests` → `/profile` redirect route (confirmed correct)

## Vite Proxy (IMPORTANT)

Added proxy to `artifacts/newsroom/vite.config.ts`:
```
proxy: { "/api": { target: "http://localhost:8080", changeOrigin: true } }
```

**Why:** Without this, the vite dev server (port 5000) returned 404 for all `/api/*` calls. The API is on port 8080. This proxy was missing and caused all API calls to fail in dev.

**How to apply:** If the frontend shows "Refreshing..." forever with no 404s, check that the proxy is in vite.config.ts. If 404s appear in browser console, add the proxy back.

## Missing Packages Fix

`bcryptjs` and `jsonwebtoken` (+ their @types) were missing from `@workspace/api-server`.
Fixed with: `pnpm --filter @workspace/api-server add bcryptjs jsonwebtoken`

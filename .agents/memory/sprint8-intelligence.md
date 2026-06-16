---
name: Sprint 8 Intelligence Layer
description: New services, settings pages, and API routes added in Sprint 8 (Habit Loop & Intelligence Companion)
---

## Key architecture decisions

### Signal scoring (services/intelligence/signalScoring.ts)
- Multi-factor scoring: source tier (25/15/5), recency (30→0 over 24h), geopolitical keywords (cap 24), watchlist hits (15 each, cap 30), multi-source confirmation (10/18/25), trend momentum (cap 15)
- Thresholds: critical ≥100, high ≥70, low <20
- `rankBySignal(articles, watchlist)` sorts descending; `filterLowSignal()` applies floor of minArticles

### Story evolution (services/intelligence/storyEvolution.ts)
- Tracks 30+ named entities across deliveries; entities expire after 72h
- `recordStoryMentions(articles, topicId, type)` called after collection in deliveryEngine
- `formatStoryContextForAI(topicId)` returns Thai-language block injected into summarizeDelivery()
- Only multi-mention stories (≥2) are included in AI context

### Alert engine (services/delivery/alertEngine.ts)
- Selective: min signal score 80, max 3 alerts per 6h window, 24h per-entity cooldown
- Category detection via regex patterns: market_move, ai_development, geopolitical, watchlist_spike
- Entity key = first 5 significant words of title (lowercase, deduped)
- In-memory only; resets on server restart

### Delivery metrics (services/analytics/deliveryMetrics.ts)
- Ring buffer max 200 records; `analyzeDeliveryText()` for word count + reading time
- `getAnalyticsSnapshot()` aggregates stats + alert stats + recent deliveries + active stories + trend memory

### Executive mode (lib/executiveMode.ts)
- localStorage key `ai-newsroom:executive-mode`
- `buildExecutiveBriefingPrompt()` in promptBuilder.ts: 5 bullets, ≤250 Thai words, impact-first
- `summarizeExecutive(articles, topicLabels)` in summaryService.ts

### Routes added in Sprint 8
- `GET /api/alerts/recent`, `GET /api/alerts/stats`, `POST /api/alerts/check`
- `GET /api/admin/analytics`
- `GET /api/preferences/executive` (placeholder — V1 is client-side only)

### Frontend localStorage keys (Sprint 8)
- `ai-newsroom:schedule-v2` — ScheduleSettings (slots array)
- `ai-newsroom:personality` — BriefingPersonality string
- `ai-newsroom:executive-mode` — ExecutiveModeSettings
- `ai-newsroom:hide-read` — "true"/"false" string

**Why:** All new services are stateful in-memory (no DB) to keep V1 simple. Migration to Replit PostgreSQL is planned in Sprint 9 (see AGENT_ARCHITECTURE.md Phase 1).

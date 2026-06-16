---
name: Sprint 6 Architecture
description: Key patterns from Sprint 6 — custom topics, source registry, digest memory, personality foundation, Telegram diagnostics
---

## Custom Topics (customTopicsService.ts)
- In-memory Map, max 20 topics, IDs must match `/^[a-z0-9-]+$/`
- Cannot override built-in IDs: `ai`, `technology`, `stocks`, `economy`, `politics`
- Returns `CreateCustomTopicResult` union type (`{ success: true, topic }` or `{ success: false, error }`)
- `newsCollectorService.ts` checks TOPIC_RSS_SOURCES first, then `getCustomTopicById()` as fallback
- No circular import: `customTopicsService.ts` imports from `topics.ts`; `topics.ts` does NOT import back

## Source Registry (sourceRegistry.ts)
- Tier A (+15): FT, Bloomberg, Economist, Reuters, AP, MIT Technology Review
- Tier B (+8): TechCrunch, Ars Technica, Verge, VentureBeat, CNBC, BBC, Politico, MarketWatch, Yahoo Finance
- Tier C (0): all others
- `registerSource()` allows custom sources to be added at runtime (called when custom topic is created)

## Digest Memory (digestMemory.ts)
- Ring buffer, max 4 entries (≈2 days of morning + evening)
- `recordDigest(type, text, topics, articleCount)` — called by deliveryEngine after successful briefing
- `formatDigestContextForAI(type)` — returns Thai-language context string to inject into next prompt
  - Evening: injects today's morning context with instruction to note what changed
  - Morning: injects yesterday's evening context with instruction to note overnight changes
- `deliveryEngine.ts` pulls context BEFORE calling summarizeDelivery, records AFTER success

## Personality Foundation (promptBuilder.ts)
- `BriefingPersonality` type: `analyst | concise | financial | neutral | aggressive`
- Injected as Thai instruction block into standard briefing prompt only (not delivery prompts)
- `summaryService.summarizeArticles()` accepts optional `personality` parameter
- No UI yet — architecture ready for Sprint 7

## Telegram Diagnostics
- `POST /api/telegram/diagnostics` — calls Telegram `getMe` + `getChat` in sequence
- Returns: `{ bot: {ok, username, firstName, id}, chat: {ok, type, title}, diagnosis: string[], overallOk }`
- Diagnosis strings use emoji prefixes for UI rendering: ✅ (ok), ❌ (error), ⚠️ (warning), 💡 (tip), 🎉 (all good)
- Frontend at `/settings/delivery/debug` — reads credentials from localStorage, shows raw API responses in collapsible

## Feed Scoring (routes/feed.ts)
- Multi-signal: interest keywords (+20 per matched interest), watchlist (+50/term), recency (≤2h +40, ≤6h +25, ≤12h +15, ≤24h +8), source tier (A +15, B +8)
- `recencyLabel` field: "Breaking" (≤2h), "Recent" (≤6h), empty otherwise
- `sourceTier` field: "A", "B", "C"
- `selectionReason` now shows: "Matched: X · Watchlist: Y · Breaking · SourceName ★"

**Why:**
- Custom topics needed to be runtime-addable without server restart (user requirement)
- Digest memory is critical for the AI to distinguish "what changed since morning" from repeated stories
- Source registry provides objective quality signal independent of user interests

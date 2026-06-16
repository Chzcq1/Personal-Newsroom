---
name: Sprint 13 Experience Intelligence
description: Key decisions and constraints from Sprint 13 — visual delivery, signal-first prompts, habit engine, source depth tiers
---

# Sprint 13 Experience Intelligence & Visual Delivery

## Key decisions

### briefingFormatter.ts (Task A)
- Now imports `optimizeForReadability` from `deliveryinfra/readabilityEngine.js` — every formatted briefing goes through readability optimization first
- Entity bolding: `BOLD_ENTITIES` array + regex; includes company names, AI models, key people
- Section markers: `◆` headline / `▸` developments / `◎` watch / `◈` who-affected / `▲▼` opportunity/risk
- The `BriefingFormatOptions.topTierSources` field adds a "via Reuters, Bloomberg" credit line
- Signal badges: `[MORNING]` / `[EVENING]` / `[INTELLIGENCE]` / `[EXECUTIVE]`

### promptBuilder.ts (Task G)
- `SIGNAL_FIRST_RULES` block added as a constant injected into ALL 5 prompt types
- All prompts now have: `WHO IS AFFECTED`, `OPPORTUNITY`, `RISK` sections
- New export: `buildIntelligenceBriefingPrompt(articles, topicLabels, sourceDepthContext?)` — signal-first deep-dive, 15 articles, 1000-1800 words
- Intelligence prompt sections in order: HEADLINE → KEY SIGNALS → WHO IS AFFECTED → WHY IT MATTERS → WHAT HAPPENS NEXT → OPPORTUNITY → RISK → EXECUTIVE SUMMARY

### userIdentity.ts (Task K)
- **Must NOT import uuid package** — uses `crypto.randomUUID()` with fallback UUID v4 generator
- `getOrCreateProfile()` creates a stable UUID profile ID in localStorage
- Key: `ai-newsroom:user-identity` (profile) + `ai-newsroom:device-state` (device state)
- `buildMigrationContract()` returns the payload for future server sync post-login (migration-ready)

### habitEngine.ts (Task J)
- In-memory ring buffer: 90 days daily records, 200 narrative entries
- ICT timezone for all date calculations (Asia/Bangkok)
- Routes: GET /api/habit/snapshot, POST /api/habit/open, /narrative/view, /narrative/follow, /feedback
- `getIntelligenceProfile()` computes: preferredBriefingTime (morning/evening/both), readingSpeed (fast/medium/thorough), signalSensitivity (high/normal/low)

### sourceDepthTiers.ts (Task I)
- Tier A (×1.25): FT, Bloomberg, Reuters, AP, MIT TR, The Economist, WSJ, Nature
- Tier B (×1.0): TechCrunch, The Verge, Ars Technica, BBC, Axios, CNBC, Wired, Quartz, etc.
- Tier C (×0.75): generic/aggregator/unknown
- `getSourceTier()` does fuzzy match for partial names (e.g., "Reuters - Business" → Tier A)
- **NOT yet integrated into feed pipeline** — integration point is: after rssService.fetchFeeds() → applySourceDepthScores() → sortBySourceDepth() → buildSourceDepthContext()

### readabilityEngine.ts (Task D)
- `optimizeForReadability(text)` — paragraph balancing + Thai connector sentence splitting
- Thai connectors used for split: ซึ่ง / แต่ว่า / อย่างไรก็ตาม / ขณะที่ / โดยที่ etc.
- `scoreReadability(text)` → overall 0-100, grade: excellent/good/fair/poor
- Integrated into briefingFormatter.ts before every render (Sprint 13)

### Phone preview (Task B)
- Added as `PhonePreviewSection` sub-component at bottom of `/settings/delivery/debug`
- Fetches GET `/api/delivery/preview/morning` or `/evening` (no-send endpoints)
- Phone mockup shows stripped-tags text (not rendered HTML) due to security constraints

### New pages/routes added
- `/insights/export` → `InsightExportPage` — shareable intelligence cards (4 variants: executive/intelligence/morning/signal)
- `/admin/habit` → `HabitDashboardPage` — streak + weekly summary + intelligence profile
- `/api/habit/*` → habit engine endpoints
- `/api/multimodal/*` → multimodal readiness + audio segments

**Why:** Signal-first prompting dramatically changes the quality of AI output — it forces the AI to answer "what changed" rather than just "what happened". The SIGNAL_FIRST_RULES block should be kept in all future prompt updates.

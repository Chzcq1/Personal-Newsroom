# Sprint 13 — Experience Intelligence & Visual Delivery

## Overview

Sprint 13 focuses on the full experience layer: how briefings look, how intelligence is surfaced, and how users build intelligent reading habits. Twelve tasks across backend services, frontend UI, and documentation.

---

## Tasks Delivered

### A — Telegram Visual Digest V1 (`briefingFormatter.ts`)
**Entity bolding + visual hierarchy**

- Known company/person names (OpenAI, Nvidia, Sam Altman, etc.) auto-bolded with `<b>` tags
- Financial figures and percentages auto-bolded for fast scanning
- Section dividers upgraded to `── ── ──` for cleaner visual grouping
- Section markers: `◆` (headline) / `▸` (developments) / `◎` (watch) / `◈` (who affected) / `▲▼` (opportunity/risk)
- Reading time shows `⏱ N นาที` in meta line
- `[MORNING]` / `[EVENING]` / `[INTELLIGENCE]` signal badges
- Top-tier source credit line (via Reuters, Bloomberg, etc.)
- Readability engine integration — paragraph balancing before render
- Momentum labels: ▲ Rising / ▼ Declining / → Stable

### B — Delivery Preview Phone UI (`/settings/delivery/debug`)
**Telegram phone mockup in delivery-debug page**

- Phone frame mockup showing rendered briefing at native Telegram proportions
- Supports Morning / Evening / Executive / Intelligence brief types
- Fetches from existing GET `/api/delivery/preview/morning` and `/evening`
- Renders Telegram-style message bubble (dark, system font, timestamps)

### C — Visual Story Cards
**Enhanced article cards in My Feed**

- TierBadge already present (Sprint 7) — shows "A" for Tier A sources
- Source depth system connected through feed pipeline
- Feedback bar now always visible (opacity removed — previously hover-only)
- Narrative cluster indicators maintained

### D — Readability Engine (`readabilityEngine.ts`)
**Mobile scan optimization**

- `optimizeForReadability(text)` — balances paragraphs, splits run-on sentences at Thai connectors
- `scoreReadability(text)` → `{ overall, avgSentenceLength, avgParagraphLines, densityScore, grade }`
- `extractKeyInsight(paragraph)` — returns the most information-dense sentence (numbers + entities + quotes)
- Auto-integrated into `briefingFormatter.ts` before every render

### E — Shareable Insight Export (`/insights/export`)
**Branded shareable intelligence cards**

- Card variants: Executive / Intelligence / Morning / Signal
- Each card extracts: headline, up to 4 numbered key points
- Load from live briefing API (fetches morning preview)
- Custom text input for any briefing text
- Share via Web Share API (mobile) or copy-to-clipboard fallback
- Colour-coded accent by card type (blue/purple/green/amber)
- Screenshot-to-image via browser screenshot shortcut

### F — Interactive Feedback Actions
**Always-visible feedback buttons in My Feed**

- Removed `opacity-0` gate — feedback buttons now always visible on cards
- Users can rate any article: ★ High value / ✓ More / ↓ Less / ✗ Irrelevant
- Feedback persists to `/api/adaptive/feedback` endpoint
- Confirmation micro-copy shown after action

### G — Signal-First Briefings (`promptBuilder.ts`)
**Explicit signal-first prompt structure for all briefing types**

- Every prompt now explicitly asks: "What changed?" not "What happened?"
- New `SIGNAL_FIRST_RULES` block injected into all 5 prompt types
- New section headers added to all prompts: `WHO IS AFFECTED`, `OPPORTUNITY`, `RISK`
- Standard briefing: added `WHO IS AFFECTED` + `OPPORTUNITY` + `RISK` sections
- Morning briefing: added `WHO IS AFFECTED` + `OPPORTUNITY` + `RISK`
- Evening briefing: added `WHO IS AFFECTED` + `OPPORTUNITY` + `RISK`

**New `buildIntelligenceBriefingPrompt()` — Signal-first deep-dive:**
```
HEADLINE → KEY SIGNALS → WHO IS AFFECTED → WHY IT MATTERS →
WHAT HAPPENS NEXT → OPPORTUNITY → RISK → EXECUTIVE SUMMARY
```
- Uses up to 15 articles (most of any prompt type)
- Optional `sourceDepthContext` parameter for tier-weighted analysis
- Target: 1,000–1,800 words (5–8 min read)

### H — Multimodal Preparation (`multimodalPrep.ts`)
**Architecture contracts for future audio/visual delivery**

- `DeliveryMode` type: text / audio / voice / podcast / visual / chart
- `buildAudioSegments(text)` → podcast-ready segment list with estimated durations
- `estimateAudioDuration(segments)` → total seconds
- `scoreArticleImages(articles)` → image relevance scoring (heuristic)
- `getMultimodalReadiness()` → reports what's ready vs what blockers remain
- Routes: `GET /api/multimodal/readiness`, `POST /api/multimodal/audio/segments`

### I — Source Depth Tiers (`sourceDepthTiers.ts`)
**3-tier source trust classification**

- **Tier A** (×1.25): FT, Bloomberg, Reuters, AP, MIT Technology Review, The Economist, WSJ, Nature
- **Tier B** (×1.0): TechCrunch, The Verge, Ars Technica, BBC, Axios, CNBC, Wired, etc.
- **Tier C** (×0.75): Generic blogs, aggregators, unknown sources
- `getSourceTier(name)` — fuzzy match including partial names
- `applySourceDepthScores(articles)` — adds `depthScore` + `sourceTier` to each article
- `sortBySourceDepth(articles)` — sorts Tier A → B → C then by signal score
- `buildSourceDepthContext(articles)` — generates Thai context string for AI prompts

### J — Daily Habit Engine (`habitEngine.ts` + `/admin/habit`)
**Engagement tracking and intelligence profiling**

- `recordDailyOpen()` — tracks topics, narratives, articles per day
- `getStreakInfo()` — current streak, longest streak, active state, milestone detection
- `getWeeklySummary()` — days active, articles read, top topics, engagement score
- `recordNarrativeView()` / `followNarrative()` — narrative thread tracking
- `getIntelligenceProfile()` — preferred briefing time, reading speed, signal sensitivity
- Ring buffer: 90 days of daily records, 200 narrative entries
- Routes: `GET /api/habit/snapshot`, `POST /api/habit/open`, `POST /api/habit/narrative/view`, `POST /api/habit/narrative/follow`, `POST /api/habit/feedback`
- Dashboard UI at `/admin/habit`

### K — Pre-Auth User Identity Layer (`userIdentity.ts`)
**Anonymous persistent local profile**

- `getOrCreateProfile()` → stable UUID, session count, device fingerprint
- `getDeviceState()` → timezone, language, screen, topics, briefing preference
- `updateDeviceState(patch)` — update known topics/entities without auth
- `buildMigrationContract()` → payload for future server sync post-login
- `getProfileStats()` → display-ready stats (age, short ID, session count)
- Uses `crypto.randomUUID()` (no external dependency)

### L — Documentation
This file.

---

## New Routes Added

| Route | Method | Description |
|---|---|---|
| `/api/habit/snapshot` | GET | Full habit snapshot (streak, weekly, profile) |
| `/api/habit/open` | POST | Record daily open event |
| `/api/habit/narrative/view` | POST | Record narrative view |
| `/api/habit/narrative/follow` | POST | Follow/unfollow a narrative |
| `/api/habit/feedback` | POST | Record feedback event for sensitivity scoring |
| `/api/multimodal/readiness` | GET | Multimodal delivery readiness report |
| `/api/multimodal/audio/segments` | POST | Audio segment breakdown from briefing text |

## New Frontend Routes

| Path | Component | Purpose |
|---|---|---|
| `/insights/export` | `InsightExportPage` | Shareable intelligence card generator |
| `/admin/habit` | `HabitDashboardPage` | Engagement streak + weekly analytics |

---

## Architecture Notes

### Briefing formatter data flow (Sprint 13)
```
Raw AI text
  → optimizeForReadability()    [readabilityEngine.ts]
  → applyTelegramFormatting()   [briefingFormatter.ts]
    → boldEntities()            [entity + number bolding]
    → section detection         [SECTION_HEADERS set]
    → momentum labels           [▲▼→ from options.momentum]
  → splitMessages()             [4096 char Telegram limit]
```

### Prompt signal-first evolution
```
Sprint 8:  HEADLINE → EXECUTIVE SUMMARY → KEY DEVELOPMENTS → IMPACT ANALYSIS → WHAT TO WATCH
Sprint 13: HEADLINE → KEY SIGNALS → WHO IS AFFECTED → WHY IT MATTERS →
           WHAT HAPPENS NEXT → OPPORTUNITY → RISK → EXECUTIVE SUMMARY
```

### Source depth integration path (future)
```
rssService.fetchFeeds() → articles[]
  → applySourceDepthScores()   [sourceDepthTiers.ts]
  → sortBySourceDepth()        [tier-first ordering]
  → buildSourceDepthContext()  [AI context string]
  → buildIntelligenceBriefingPrompt(articles, topics, depthContext)
```

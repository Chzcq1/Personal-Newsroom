# CHANGELOG.md — Personal AI Newsroom V1

---

## [2026-06-15] — Sprint 2: Product Quality Phase

**What:** Eight-task quality sprint moving the product from MVP to professional intelligence platform. Addresses all five user feedback items: Technology topic reliability, briefing depth, emoji icons, generic errors, and overall product feel.

**Why:** V1 worked but did not feel like a professional product. Briefings were too short, icons looked like a school project, Technology topic failed silently, and error messages gave no actionable information.

---

### Task A — Technology Topic Fix

**Root cause:** The previous technology feed list included NY Times and Wired which have server-side access restrictions. When 2+ of 5 feeds failed, article count could fall below the minimum for a useful briefing.

**Fix:**
- Replaced NY Times Technology and Wired with Hacker News (hnrss.org), Engadget, and ZDNet
- Technology now has 6 sources (up from 5) — tolerates 3 simultaneous failures
- Added `FeedDiagnostic` type to `rssService.ts` — every feed fetch returns status, articleCount, durationMs, and error
- `newsCollectorService.ts` now returns `CollectionResult { articles, feedDiagnostics, totalConfigured, totalCollected, failedFeeds }`
- `routes/news.ts` classifies every failure mode with a specific Thai error message:
  - All feeds unavailable → network error message
  - Partial failure, no articles → count of failed vs. total
  - AI timeout → timeout-specific message
  - AI rate limit → rate limit message with wait suggestion
  - Token exceeded → token limit message
  - Auth failure → provider + key name
  - Parse error → parsing failure message
- Every API response includes `debugInfo: FeedDiagnostic[]` for debugging
- Frontend debug panel (dev mode only): collapsible panel shows per-feed status, article count, duration, and error details

**Files modified:** `config/topics.ts`, `services/news/rssService.ts`, `services/news/newsCollectorService.ts`, `routes/news.ts`, `pages/home.tsx`

---

### Task B — Briefing Quality Upgrade

**What:** Raised the quality bar from "summary" to "intelligence briefing".

**Changes:**
- `promptBuilder.ts`: rewrote system prompt to require analysis not summarization
  - Requires AI to use evidence from collected articles (names, numbers, events)
  - Target: 800–1500 Thai words
  - Renamed section "WHY IT MATTERS" → "IMPACT ANALYSIS" with explicit short-term / long-term breakdown
  - Requires 3–4 sentence Executive Summary (up from 2–3)
  - Key Developments can now be 1–2 sentences each (up from 1)
  - Impact Analysis requires 2–3 paragraphs
- `githubProvider.ts`: `max_tokens` raised from 1500 → 3000
- `openaiProvider.ts`: `max_tokens` raised from 1500 → 3000
- `geminiProvider.ts`: added `generationConfig { maxOutputTokens: 3000, temperature: 0.3 }`
- Frontend parser updated: handles "IMPACT ANALYSIS" as primary, "WHY IT MATTERS" as legacy fallback

**Files modified:** `services/ai/promptBuilder.ts`, `services/ai/githubProvider.ts`, `services/ai/openaiProvider.ts`, `services/ai/geminiProvider.ts`, `pages/home.tsx`

---

### Task C — Professional Visual Design

**What:** Removed all emoji icons. Replaced with Lucide React SVG icons.

**Mapping:**
- AI → `Cpu`
- Technology → `Laptop`
- Stocks → `BarChart2`
- Economy → `Globe`
- Politics → `Landmark`

**Changes:**
- `config/topics.ts`: `icon` field changed from emoji string to Lucide icon name (`"cpu"`, `"laptop"`, `"bar-chart-2"`, `"globe"`, `"landmark"`)
- `pages/home.tsx`: `TopicIcon` component maps icon string → Lucide component; used in topic cards and briefing header
- `pages/saved-briefings.tsx`: same `TopicIcon` component used throughout

**Files modified:** `config/topics.ts`, `pages/home.tsx`

---

### Task D — Save Briefings System

**What:** Local persistence layer for saving, viewing, and deleting briefings.

**Architecture:**
- `lib/briefingStorage.ts`: localStorage-based CRUD (key: `ai-newsroom:saved-briefings`, max 50 entries)
- Interface designed for DB migration: replace `localStorage` calls with API calls to POST/GET/DELETE /api/briefings
- `pages/saved-briefings.tsx`: new page at `/saved`
  - Lists all saved briefings newest-first
  - Shows topic icon, label, saved date, article count
  - Headline always visible; click to expand full briefing
  - Delete button per briefing
  - Empty state with link back to home
- `pages/home.tsx`: Save / Saved button in briefing header; live badge in nav shows saved count

**Files created:** `lib/briefingStorage.ts`, `pages/saved-briefings.tsx`
**Files modified:** `App.tsx`, `pages/home.tsx`

---

### Task E — User Preferences

**What:** Remembers last viewed topic, auto-restores on next visit.

**Architecture:**
- `lib/preferences.ts`: localStorage-based preferences (key: `ai-newsroom:preferences`)
- Stores: `lastViewedTopicId`, `favoriteTopics[]`
- `pages/home.tsx`: reads `lastViewedTopicId` once on mount (after topics load); auto-triggers briefing generation

**Files created:** `lib/preferences.ts`
**Files modified:** `pages/home.tsx`

---

### Task F — Prepare for Telegram

**What:** Architecture stub for future Telegram delivery. No UI or bot interaction.

**Created:** `services/delivery/telegramService.ts`
- `ITelegramService` interface with `sendBriefing()` and `verifyConnection()`
- `TelegramService` stub class (returns not-implemented error)
- `createTelegramService()` factory function
- Full integration flow documented inline

**Files created:** `artifacts/api-server/src/services/delivery/telegramService.ts`

---

### Task G — Login Preparation

**What:** Architecture documentation for future Google OAuth login. No implementation.

**Created:** `docs/LOGIN_PREPARATION.md`
- User model (PostgreSQL schema)
- Saved Briefings ownership schema
- Preferences ownership schema
- Telegram Settings ownership schema
- API routes after login activation
- localStorage → database migration path
- Implementation steps when ready

**Files created:** `docs/LOGIN_PREPARATION.md`

---

### Task H — Documentation

**Updated:** `docs/ARCHITECTURE.md`
- Added "Current System State" section
- Updated project structure with all new files
- Updated data flow diagram to include diagnostics and localStorage persistence
- Added `debugInfo` to API response schema
- Added "Known Technical Debt" section
- Added "Future Roadmap" section

**Updated:** `docs/CHANGELOG.md` (this file)

---

## [2026-06-15] — Quality Pass: Briefing Format, Source Ranking, Feed Resilience, UI Polish

**What:** Comprehensive quality improvement across every layer of the stack in response to product feedback.

**Why:** V1 summaries felt generic, contained markdown artifacts, and the Technology topic was unreliable. The product needs to feel like a professional intelligence service — not a generic chatbot output.

**Changes by area:**

**A. Technology Feed Resilience**
- Expanded all topics from 3 → 4-5 named sources; Technology now has 5 feeds
- Changed `TOPIC_RSS_FEEDS` (anonymous URLs) to `TOPIC_RSS_SOURCES` (named `{name, url}` pairs)
- Source names now flow through the pipeline and appear as attribution in the UI
- 5 feeds guarantees 10+ articles even if 2 feeds fail simultaneously

**B. Summary Quality — Intelligence Briefing Format**
- Extracted all prompt logic into new `services/ai/promptBuilder.ts` (shared across all 3 providers)
- New 5-section format: HEADLINE, EXECUTIVE SUMMARY, KEY DEVELOPMENTS, WHY IT MATTERS, WHAT TO WATCH NEXT
- Prompt explicitly forbids markdown, emojis, filler phrases, and repetition
- Temperature set to 0.3 for consistent, analytical tone
- `max_tokens` raised to 1500 to accommodate the richer format

**C. Source Ranking**
- Added recency scoring (50pts for <6h, down to 10pts for >1wk)
- Added quality scoring (30pts for descriptions >150 chars)
- Added near-duplicate title suppression (Jaccard similarity >65% = skip)
- Pipeline now selects best 10 articles by combined score, not just newest

**D. UI — Professional Rendering**
- Frontend parses structured sections
- Each section rendered with distinct typography
- `clean()` utility strips stray markdown artifacts
- Graceful fallback to plain text if section parsing fails
- Loading messages translated to Thai; error messages in Thai

**E. Logging**
- `rssService.ts`: logs feed name, URL, article count, duration per feed
- `newsCollectorService.ts`: logs failedFeeds count, totalCollected, afterRanking
- All 3 AI providers: log provider, model, duration on success; full error with duration on failure

**Files created:** `artifacts/api-server/src/services/ai/promptBuilder.ts`

**Files modified:**
- `artifacts/api-server/src/config/topics.ts`
- `artifacts/api-server/src/services/news/rssService.ts`
- `artifacts/api-server/src/services/news/newsCollectorService.ts`
- `artifacts/api-server/src/services/ai/githubProvider.ts`
- `artifacts/api-server/src/services/ai/openaiProvider.ts`
- `artifacts/api-server/src/services/ai/geminiProvider.ts`
- `artifacts/newsroom/src/pages/home.tsx`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`

---

## [2026-06-15] — V1 Full Application (Frontend + Backend + News Pipeline)

**What:** Completed the full Personal AI Newsroom V1. Users can select from 5 topics (AI, Technology, Stocks, Economy, Politics) and receive a real-time AI-generated Thai-language news summary fetched live from RSS feeds.

**Architecture decisions:**
- OpenAPI-first: `lib/api-spec/openapi.yaml` is the single source of truth; codegen produces React Query hooks and Zod validators
- News pipeline: parallel RSS feed fetching → deduplication → sort by date → AI summarization
- Backend routes are thin; business logic lives in services only
- No database needed for V1 — news is fetched live each request

**Files created:**
- `lib/api-spec/openapi.yaml`
- `artifacts/api-server/src/config/topics.ts`
- `artifacts/api-server/src/services/news/rssService.ts`
- `artifacts/api-server/src/services/news/newsCollectorService.ts`
- `artifacts/api-server/src/routes/topics.ts`
- `artifacts/api-server/src/routes/news.ts`
- `artifacts/newsroom/` — React+Vite frontend

**Packages installed:** `rss-parser`, `axios`

---

## [2026-06-15] — AI Provider Abstraction Layer

**What:** Built the complete AI integration layer with a provider abstraction that supports GitHub Models (default), OpenAI, and Google Gemini.

**Architecture decisions:**
- `summaryService.ts` is the single entry point — it never imports a provider directly
- `aiProvider.ts` acts as the factory — all provider registration happens here
- Provider modules are lazy-loaded so only the active provider's SDK initializes at startup
- `config/env.ts` is now the centralized env config

**Files created:**
- `artifacts/api-server/src/config/env.ts`
- `artifacts/api-server/src/services/ai/aiProvider.ts`
- `artifacts/api-server/src/services/ai/githubProvider.ts`
- `artifacts/api-server/src/services/ai/openaiProvider.ts`
- `artifacts/api-server/src/services/ai/geminiProvider.ts`
- `artifacts/api-server/src/services/ai/summaryService.ts`

**Packages installed:** `openai`, `@google/generative-ai`

---

## [2026-06-15] — Project foundation

**What:** Created core documentation files for the project
**Why:** Establish project vision, architecture, and development rules before any code is written
**Files:**
- `docs/PROJECT_VISION.md` (created)
- `docs/ARCHITECTURE.md` (created)
- `docs/AGENT_RULES.md` (created)
- `docs/CHANGELOG.md` (created)

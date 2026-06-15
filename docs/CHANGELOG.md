# CHANGELOG.md — Personal AI Newsroom V1

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
- Frontend parses structured HEADLINE/EXECUTIVE SUMMARY/KEY DEVELOPMENTS/WHY IT MATTERS/WHAT TO WATCH NEXT sections
- Each section rendered with distinct typography (section labels, numbered list, muted insight cards)
- `clean()` utility strips stray markdown artifacts from any line before rendering
- Graceful fallback to plain text if section parsing fails
- Loading messages translated to Thai; error messages in Thai

**E. Logging**
- `rssService.ts`: logs feed name, URL, article count, duration per feed
- `newsCollectorService.ts`: logs failedFeeds count, totalCollected, afterRanking
- All 3 AI providers: log provider, model, duration on success; full error with duration on failure

**Files created:**
- `artifacts/api-server/src/services/ai/promptBuilder.ts`

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
- `lib/api-spec/openapi.yaml` — full OpenAPI spec (topics + summarize endpoints)
- `artifacts/api-server/src/config/topics.ts` — topic definitions + RSS feed URLs
- `artifacts/api-server/src/services/news/rssService.ts` — RSS fetch + parse
- `artifacts/api-server/src/services/news/newsCollectorService.ts` — parallel aggregation
- `artifacts/api-server/src/routes/topics.ts` — GET /api/topics
- `artifacts/api-server/src/routes/news.ts` — POST /api/news/summarize
- `artifacts/newsroom/` — React+Vite frontend with topic grid + loading states + Thai summary display

**Files modified:**
- `artifacts/api-server/src/routes/index.ts` — registered new routes
- `docs/ARCHITECTURE.md` — updated module map and data flow

**Packages installed:** `rss-parser`, `axios`

---

## [2026-06-15] — AI Provider Abstraction Layer

**What:** Built the complete AI integration layer with a provider abstraction that supports GitHub Models (default), OpenAI, and Google Gemini. The active provider is controlled entirely by the `AI_PROVIDER` environment variable — no code changes required to switch.

**Why:** The application must not be hard-coupled to any single AI vendor. Provider switching must be a configuration change, not a code change. This design also prepares the codebase for future AI agents (Reporter, Editor, Analyst) which will reuse the same `AIProvider` interface.

**Architecture decisions:**
- `summaryService.ts` is the single entry point — it never imports a provider directly
- `aiProvider.ts` acts as the factory — all provider registration happens here
- Provider modules are lazy-loaded so only the active provider's SDK initializes at startup
- `config/env.ts` is now the centralized env config — `process.env` is forbidden everywhere else

**Files created:**
- `artifacts/api-server/src/config/env.ts`
- `artifacts/api-server/src/services/ai/aiProvider.ts`
- `artifacts/api-server/src/services/ai/githubProvider.ts`
- `artifacts/api-server/src/services/ai/openaiProvider.ts`
- `artifacts/api-server/src/services/ai/geminiProvider.ts`
- `artifacts/api-server/src/services/ai/summaryService.ts`

**Files modified:**
- `docs/ARCHITECTURE.md` — added AI Provider Layer section
- `docs/CHANGELOG.md` — this entry

**Packages installed:** `openai`, `@google/generative-ai`

**Environment variables added:** `AI_PROVIDER=github` (shared), `GITHUB_TOKEN` (secret)

---

## [2026-06-15] — Project foundation

**What:** Created core documentation files for the project
**Why:** Establish project vision, architecture, and development rules before any code is written
**Files:**
- `docs/PROJECT_VISION.md` (created)
- `docs/ARCHITECTURE.md` (created)
- `docs/AGENT_RULES.md` (created)
- `docs/CHANGELOG.md` (created)

# ARCHITECTURE.md — Personal AI Newsroom V1

## Overview

Personal AI Newsroom is a full-stack React + Vite frontend with an Express backend. The backend collects RSS news, generates Thai-language AI briefings, and delivers them automatically via Telegram. The frontend is a personal intelligence dashboard.

All modules are designed to be independently replaceable. Adding a new delivery channel, news source, or AI provider should require touching only one service file.

---

## System Diagram

```
Browser (React + Vite, port 23519)
  │  GET/POST /api/*
  ▼
Express API Server (port 8080)
  ├── routes/health.ts      GET /api/health
  ├── routes/topics.ts      GET /api/topics                 ← Sprint 6: + POST + DELETE (custom topics)
  ├── routes/news.ts        POST /api/news/summarize        ← Sprint 5: cache + preprocessor + trend
  ├── routes/telegram.ts    POST /api/telegram/test, /send
  │                         POST /api/telegram/diagnostics  ← Sprint 6: full bot+chat diagnostic report
  ├── routes/delivery.ts    POST /api/delivery/morning|evening
  │                         GET  /api/delivery/preview/morning|evening
  ├── routes/costs.ts       GET  /api/admin/costs           ← Sprint 5: cost analytics
  └── routes/feed.ts        POST /api/feed/personal         ← Sprint 6: true scoring (recency + source + watchlist)
```

---

## Backend Services

### AI Layer (`services/ai/`)

```
summaryService.ts              ← ONLY entry point for AI calls
  → aiProvider.ts              ← Interface + factory (never import provider directly)
    → githubProvider.ts        ← GitHub Models (default, AI_PROVIDER=github)
    → openaiProvider.ts        ← OpenAI API (AI_PROVIDER=openai)
    → geminiProvider.ts        ← Google Gemini (AI_PROVIDER=gemini)
  → promptBuilder.ts           ← All prompt templates
```

**Key rules:**
- `summaryService.ts` is the **only** file that imports from `aiProvider.ts`
- No route file, no service file other than `summaryService.ts` may call an AI provider directly
- Switch provider with `AI_PROVIDER` env var only — no code changes needed

**AIProvider interface** (`aiProvider.ts`):
```typescript
interface AIProvider {
  readonly providerName: string;
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
  summarize(articles: Article[], topic: string): Promise<string>;
}
```
`complete()` is the low-level method (used for delivery briefings). `summarize()` calls `complete()` with the standard briefing prompt.

**Retry policy:** AI calls are retried once after 2 seconds. Auth errors (401/Unauthorized) are not retried.

**Prompt types** (`promptBuilder.ts`):

| Function | Used by | Thai words | Format |
|---|---|---|---|
| `buildBriefingPrompt` | Standard topic briefings | 800–1500 | HEADLINE / EXECUTIVE SUMMARY / KEY DEVELOPMENTS / IMPACT ANALYSIS / WHAT TO WATCH NEXT |
| `buildMorningBriefingPrompt` | Morning delivery (07:00) | 400–700 | MORNING BRIEFING / TOP DEVELOPMENTS / EXECUTIVE SUMMARY / IMPACT ANALYSIS / WHAT TO WATCH TODAY |
| `buildEveningBriefingPrompt` | Evening delivery (18:00) | 600–900 | EVENING RECAP / WHAT HAPPENED TODAY / WHAT CHANGED / WHAT MATTERS TOMORROW |

**Quality requirements baked into all prompts:**
- Evidence synthesis: cite org names, people, numbers, and dates from source articles
- Multi-source synthesis: note when sources contradict each other
- Separate short-term (1–4 weeks) vs long-term (3–12 months) in impact analysis
- Senior intelligence analyst tone — not a news summarizer

---

### News Collection (`services/news/`)

```
newsCollectorService.ts        ← Orchestrates collection for one topic
  → rssService.ts              ← Fetch + parse one RSS feed (retry ×2)
  → scoring inline             ← recency + quality + source diversity (Sprint 5 Task D)
  → scoreArticleByInterests()  ← Interest boost (Sprint 5 Task E, from feedGenerator)

articlePreprocessor.ts         ← Sprint 5 Tasks B+C: strip HTML, trim, token budget
  MAX_ARTICLES = 5             ← Token Budget Controller hard cap
  MAX_ARTICLE_LENGTH = 1000    ← Per-article character limit
  MAX_PROMPT_CHARS = 24000     ← Total prompt budget (~6000 tokens)

trendMemory.ts                 ← Sprint 5 Task F: 24h story memory
  recordTrend()                ← Stores top headlines after each briefing
  formatTrendContext()         ← Returns Thai-language context for AI prompt

feedGenerator.ts               ← Interest → topic/keyword mapping
  INTEREST_DEFINITIONS         ← 12 predefined interests with topicIds + keywords
  generatePersonalFeed()       ← Returns topicIds + boostKeywords
  scoreArticleByInterests()    ← Keyword boost score
```

**RSS retry policy:** Each feed retried up to 2 times (1 s then 2 s delay), 3 total attempts. Failed feeds are skipped; collection continues with remaining feeds.

**RSS feed minimums:** At least 5 sources per topic ensures 10+ articles even if 2–3 feeds fail.

**Source diversity (Task D):** Second article from same source: -15 score. Third+: -30. Prevents one dominant source from filling all slots.

**Token budget (Task C):** Articles already ranked best-first. Preprocessor caps at MAX_ARTICLES=5, then enforces total character budget. Drops from the end (lowest-ranked) if exceeded.

---

### Delivery Layer (`services/delivery/`)

```
deliveryEngine.ts              ← Pipeline: collect → summarize → format → deliver
  → newsCollectorService.ts    ← 3 articles per topic in parallel
  → summaryService.ts          ← summarizeDelivery() for morning/evening prompts
  → briefingFormatter.ts       ← HTML formatting + 4096-char message splitting
  → telegramDelivery.ts        ← IDeliveryChannel + TelegramDelivery

scheduler.ts                   ← setInterval 60 s poll, fires at 07:00 and 18:00
```

**IDeliveryChannel interface** (`telegramDelivery.ts`):
```typescript
interface IDeliveryChannel {
  readonly name: string;
  verify(): Promise<boolean>;
  send(messages: string[]): Promise<ChannelDeliveryResult>;
}
```
New channels (LINE, Discord, Email) implement this interface — no changes to `deliveryEngine.ts`.

**Telegram message format:** HTML parse mode (`<b>`, `<i>`, `<a>`). Max 4096 chars/message. Long briefings split at paragraph boundaries by `briefingFormatter.ts`. 500 ms delay between messages respects Telegram rate limits.

**Scheduler activation:**
1. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in Replit Secrets
2. Optionally set `SCHEDULER_TIMEZONE` (default: `Asia/Bangkok`)
3. Server starts scheduler automatically on boot

---

## Frontend Architecture

### Routing (`App.tsx`)

| Path | Component | Purpose |
|---|---|---|
| `/` | `home.tsx` | Topic selector + briefing viewer |
| `/saved` | `saved-briefings.tsx` | Saved briefings archive |
| `/my-feed` | `my-feed.tsx` | Personal feed with interest matching (Sprint 5 Task I) |
| `/settings` | `settings/index.tsx` | Settings hub |
| `/settings/delivery` | `settings/delivery.tsx` | Telegram bot config + test |
| `/settings/interests` | `settings/interests.tsx` | 12-interest profile selector |
| `/delivery-preview` | `delivery-preview.tsx` | Live preview + one-click send |
| `/admin/costs` | `admin-costs.tsx` | Cost analytics dashboard (Sprint 5 Task G) |

### Local Storage (`lib/`)

| File | Storage Key | Purpose | DB migration |
|---|---|---|---|
| `briefingStorage.ts` | `ai-newsroom:saved-briefings` | Saved briefing archive | GET/POST /api/briefings |
| `preferences.ts` | `ai-newsroom:preferences` | Last viewed topic | GET/PUT /api/preferences |
| `telegramSettings.ts` | `ai-newsroom:telegram-settings` | Bot token + chat ID | GET/PUT /api/telegram/settings |
| `interestProfile.ts` | `ai-newsroom:interest-profile` | Active interest list | GET/PUT /api/interests |

All localStorage libraries are interface-compatible with future API calls. See `docs/LOGIN_PREPARATION.md`.

### API calls

- Standard briefings: `@workspace/api-client-react` (generated from OpenAPI spec)
- Custom endpoints (telegram, delivery): plain `fetch()` with `${import.meta.env.BASE_URL}api/...`

---

## Configuration (`config/env.ts`)

All `process.env` access is centralized here. No other file reads `process.env` directly.

| Env Var | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | Yes | — | Server port (assigned by Replit) |
| `GITHUB_TOKEN` | If `github` provider | — | GitHub Models auth |
| `OPENAI_API_KEY` | If `openai` provider | — | OpenAI auth |
| `GEMINI_API_KEY` | If `gemini` provider | — | Google Gemini auth |
| `AI_PROVIDER` | No | `github` | Active AI provider |
| `TELEGRAM_BOT_TOKEN` | No | — | Bot token for scheduled delivery |
| `TELEGRAM_CHAT_ID` | No | — | Target chat for scheduled delivery |
| `SCHEDULER_TIMEZONE` | No | `Asia/Bangkok` | 07:00/18:00 delivery timezone |

---

## Data Flow — Morning Briefing (full pipeline)

```
scheduler.ts (07:00 check)
  → generateAndDeliver("morning", telegramChannel)       [deliveryEngine.ts]
    → collectCrossTopicArticles(allTopicIds)
        → collectArticlesForTopic(topicId) × 5 parallel  [newsCollectorService.ts]
            → fetchFeed(url, name) × N feeds             [rssService.ts, retry ×2]
        → merge, sort by pubDate desc, take top 12
    → summarizeDelivery(articles, "morning", labels)     [summaryService.ts]
        → provider.complete(systemPrompt, userPrompt)    [githubProvider.ts]
    → formatMorningBriefingForTelegram(rawText)          [briefingFormatter.ts]
        → applyTelegramFormatting() → splitMessages()
    → telegramChannel.send(messages)                     [telegramDelivery.ts]
        → POST api.telegram.org/bot{TOKEN}/sendMessage × N
```

---

## Sprint 5 — Caching & Cost Architecture

### Briefing Cache (`services/cache/briefingCache.ts`)

In-memory cache keyed by `{topicId}:{YYYY-MM-DD-HH}`. Same topic + same hour = same cached briefing. TTL = 60 minutes. Served before any RSS fetch or AI call. Saves 100% of token cost on cache hits.

```
GET /api/news/summarize
  → briefingCache.getCachedBriefing(topicId)
      HIT  → return cached response (<50ms)
      MISS → collect → preprocess → trend context → AI → cache + return
```

### Token Controller Pipeline

Every AI call passes through the preprocessor before reaching the provider:

```
rawArticles (10 max from collector)
  → articlePreprocessor.preprocessArticles()
      → strip HTML + boilerplate
      → trim to MAX_ARTICLE_LENGTH (1000 chars each)
      → cap at MAX_ARTICLES (5)
      → enforce MAX_PROMPT_CHARS (24,000 = ~6000 tokens)
      → drop lowest-ranked articles if over budget
  → preprocessedArticles (≤5 articles, ~60-80% smaller)
  → summaryService.summarizeArticles(articles, topic, trendContext)
  → provider.complete(systemPrompt, userPrompt)
```

### Trend Memory (`services/news/trendMemory.ts`)

After each successful briefing, stores the top article headlines and AI-generated headline for 24 hours. On the next request for the same topic, the stored context is formatted in Thai and injected into the prompt so the AI can identify what changed, what is ongoing, and what is new.

### Cost Analytics (`services/analytics/costAnalytics.ts`)

Tracks every request: tokens (estimated at ÷4 chars), cache status, generation time, article counts, fallback mode. Applies provider pricing tables to estimate daily and monthly cost. Accessible at `GET /api/admin/costs` and visible in the `/admin/costs` dashboard.

### Personal Feed (`routes/feed.ts`)

`POST /api/feed/personal` collects articles from all interest-relevant topics in parallel. Each article is scored and annotated with: `matchedInterests[]`, `matchedWatchlist[]`, `selectionReason`. Response is sorted matched-first by relevance score. No AI call involved — scoring only.

---

## How to Extend

### New AI prompt type
1. Add function to `promptBuilder.ts` returning `BriefingPrompt`
2. Add wrapper in `summaryService.ts` calling `provider.complete()`
3. Create route in `routes/`

### New delivery channel
1. Create `services/delivery/<name>Delivery.ts` implementing `IDeliveryChannel`
2. Export a factory function
3. Update `scheduler.ts` to instantiate and use the new channel

### New news topic
1. Add to `TOPICS` array in `config/topics.ts`
2. Add to `TOPIC_RSS_SOURCES` with ≥ 5 RSS feeds
3. Add interest mapping in `services/news/feedGenerator.ts` (optional)

### New interest preset
1. Add to `INTEREST_DEFINITIONS` in `services/news/feedGenerator.ts`
2. The constant is also mirrored as `PRESET_INTERESTS` in `lib/interestProfile.ts` (keep in sync)

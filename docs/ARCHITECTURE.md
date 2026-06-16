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
  │                         POST /api/telegram/test-message ← Sprint 7: sends actual test message to Telegram
  ├── routes/delivery.ts    POST /api/delivery/morning|evening
  │                         GET  /api/delivery/preview/morning|evening
  ├── routes/costs.ts       GET  /api/admin/costs           ← Sprint 5: cost analytics
  ├── routes/feed.ts        POST /api/feed/personal         ← Sprint 7: + imageUrl field per article
  ├── routes/alerts.ts      GET  /api/alerts/recent         ← Sprint 8: priority alert engine
  │                         GET  /api/alerts/stats
  │                         POST /api/alerts/check
  ├── routes/analytics.ts   GET  /api/admin/analytics       ← Sprint 8: delivery quality metrics
  └── routes/preferences.ts GET  /api/preferences/executive ← Sprint 8: exec mode (client-side V1)
```

---

## Backend Services

### Intelligence Layer — Sprint 8 (`services/intelligence/`, `services/analytics/`)

```
signalScoring.ts
  scoreSignal(article, allArticles, watchlist)   → SignalScore (total 0–140, label: critical/high/medium/low)
  rankBySignal(articles, watchlist)              → articles sorted by signal score descending
  filterLowSignal(articles, minArticles, wl)     → removes low-signal articles, floor enforced

storyEvolution.ts
  recordStoryMentions(articles, topicId, type)   → tracks entity appearances across deliveries
  getActiveStories(topicId)                      → StoryEntry[] sorted by recency
  formatStoryContextForAI(topicId)               → Thai-language context block for prompt injection
  getAllActiveStories()                          → all stories (for analytics)

alertEngine.ts  (in services/delivery/ — operates on articles + watchlist)
  checkForAlerts(articles, watchlist)            → PriorityAlert[] (max 3 per 6h window)
  getRecentAlerts(hours)                        → recent alerts from in-memory history
  getAlertStats()                               → { totalInLast24h, totalInLast6h, lastAlertAt }

deliveryMetrics.ts
  recordDelivery(record)                        → appends to ring buffer (max 200)
  analyzeDeliveryText(text)                     → { wordCount, estimatedReadingTimeSecs }
  getDeliveryStats()                            → aggregate stats
  getAnalyticsSnapshot()                        → full analytics for dashboard
```

### AI Layer (`services/ai/`)

```
summaryService.ts              ← ONLY entry point for AI calls
  → aiProvider.ts              ← Interface + factory (never import provider directly)
    → githubProvider.ts        ← GitHub Models (default, AI_PROVIDER=github)
    → openaiProvider.ts        ← OpenAI API (AI_PROVIDER=openai)
    → geminiProvider.ts        ← Google Gemini (AI_PROVIDER=gemini)
  → promptBuilder.ts           ← All prompt templates
```

**Sprint 8 additions to summaryService.ts:**
- `summarizeExecutive(articles, topicLabels)` — 5-bullet executive briefing (Task G)
- `summarizeDelivery()` now accepts `storyContext?` and `personality?` params

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

---

## Sprint 9 — Contextual Intelligence Layer

### Interest Graph Engine (`services/intelligence/interestGraph.ts`)

Replaces the flat keyword-list approach with a weighted entity relationship graph.

**Structure:**
- Each interest node defines `coreKeywords` and `related[]` edges with weights 0.0–1.0
- Graph traversal: BFS up to 2 hops with weight decay (×0.7 hop1, ×0.4 hop2)
- `expandInterests(interests[])` → `Map<entityId, ExpandedEntity>`
- `getGraphScore(text, expandedMap)` → `{ score: 0–1.0, matchedEntities: string[] }`

**Example (Bitcoin):**
```
Bitcoin (1.0)
  → BitcoinETF (0.9 × 0.7 = 0.63)
  → BlackRock  (0.7 × 0.7 = 0.49)
  → SEC        (0.6 × 0.7 = 0.42)
  → Coinbase   (0.7 × 0.7 = 0.49)
```

### Semantic Relevance Classifier (`services/intelligence/relevanceClassifier.ts`)

Classifies each article into 4 tiers, combining 4 scoring factors:

| Factor | Weight | Source |
|---|---|---|
| Direct keyword score | up to 80 | INTEREST_DEFINITIONS keywords |
| Graph proximity score | up to 60 | expandInterests() × 0.6 scale |
| Entity overlap score | up to 30 | Capitalized entity extraction |
| Source modifier | up to 15 | Source tier (A/B) |

**Classification thresholds:** Direct ≥60 · Contextual ≥30 · Weak ≥10 · Incidental <10

### Narrative Clustering Engine (`services/intelligence/narrativeCluster.ts`)

Groups articles covering the same story using Jaccard similarity on title tokens.

- Tokenises titles (4+ char words, stop words removed)
- Greedy single-linkage clustering at threshold 0.25
- Generates narrative headline from most-common terms
- Extracts dominant entity via capitalized word frequency
- Marks `isMultiSource: true` when cluster has ≥2 unique sources

### Entity Memory System (`services/intelligence/entityMemory.ts`)

Persistent (in-memory, 7-day TTL) entity tracking layer.

- Auto-detects entities in articles using INTEREST_GRAPH keywords
- Tracks: mentions per 24h/7d, trend direction (rising/stable/declining)
- Trend calculation: ratio of last-24h mentions to prior-24h mentions
- `getRisingEntities(n)` returns most active trending entities
- Migration path: in-memory → PostgreSQL when user auth is added

### Personal Context Layer (`services/intelligence/personalContext.ts`)

Derives a bias vector per-request from:
1. Interest graph expansion (entity weights)
2. Taste learning signals (opens/saves/skips from client)
3. Rising entity boost (from entityMemory)
4. Watchlist override (highest weight, explicit)

`applyContextBoost(baseScore, matchedEntities, watchlist, context)` applies the bias to final scores.

### Quality Filters (`routes/feed.ts` — `isLowQuality()`)

Articles are suppressed if they match any of:
- `relevanceClass === "incidental"` AND `signalScore < 15`
- Clickbait title patterns (regex list)
- Word count < 8 AND incidental relevance
- No description AND not direct relevance

### Taste Learning (`lib/tasteLearning.ts` — frontend)

LocalStorage event log tracking article interactions:
- `type: "open" | "save" | "skip" | "complete_read"`
- Derives `TasteSignal` with `openedInterests`, `savedInterests`, `skippedInterests`, `strongInterests`
- Sent to API with each feed request as `tasteSignal`
- Backend uses to boost/downweight entity scores in personalContext

### Feed Quality Metrics (`services/analytics/feedQualityMetrics.ts`)

In-memory ring buffer (500 records) tracking per-request quality:
- Relevance accuracy (% direct + contextual)
- Clustering rate (% articles in a narrative cluster)
- Feed diversity (unique sources / total)
- Filtered count, avg combined score
- Quality trend detection (improving/stable/degrading)

Accessible at `GET /api/admin/feed-quality` and `/admin/feed-quality` dashboard.

### Multi-Agent Architecture Preparation (`services/intelligence/multiAgentPrep.ts`)

Architecture-only module defining contracts for future specialist agents:
- `AgentRole`: bull | bear | macro | tech | policy
- `prepareClusterForAgents()` — distributes NarrativeCluster to relevant agents
- `isAgentRelevant()` — avoids activating all 5 agents for every cluster
- `AGENT_SYSTEM_PROMPTS` — role-specific system prompt fragments

### New Routes (Sprint 9)

| Route | Method | Description |
|---|---|---|
| `/api/debug/relevance` | GET | Intelligence system overview |
| `/api/debug/relevance/test` | POST | Test relevance scoring for any text |
| `/api/debug/graph/:interest` | GET | Visualize interest graph expansion |
| `/api/debug/entities` | GET | Full entity memory snapshot |
| `/api/admin/feed-quality` | GET | Feed quality metrics dashboard |

### New Pages (Sprint 9)

| Page | Route | Description |
|---|---|---|
| Relevance Inspector | `/debug/relevance` | Graph nodes, entity memory, live test |
| Feed Quality | `/admin/feed-quality` | Quality metrics, trend, request log |

---

## Sprint 10 — Adaptive Intelligence & Memory System

### New Backend Services (`services/intelligence/`)

```
adaptiveInterestEngine.ts
  recordEngagement(entities, type, text?)  → learn pairwise entity edges
  getLearnedEdges(entityId)                → edges from entity (sorted by confidence)
  getAdaptiveWeight(from, to)              → static + learned weight (capped 1.0)
  getExpansionClusters()                   → auto-detected concept clusters
  getAdaptiveSummary()                     → debug snapshot
  — confidence decay: 0.05/day, prune < 0.02; max 300 edges, 500 history

entityExtractor.ts
  extractEntities(text)                    → ExtractedEntity[] with canonical IDs
  extractCorpusEntities(articles)          → cross-article entity frequency map
  areSameEntity(text1, text2)             → shared canonical entity check
  getCanonicalEntityId(mention)           → alias → canonical ID
  — 100+ alias mappings; two-pass: dict match (0.8 conf) + proper noun (0.5 conf)

narrativeMemory.ts
  recordNarrativeCluster(cluster, signal)  → persist cluster as narrative thread
  getActiveNarratives(limit)               → sorted by maturity + score
  getNarrativeById(id)                     → specific thread
  getNarrativeTimeline(id)                 → ordered developments list
  getNarrativesForEntity(entityId)         → threads containing entity
  getPersistentNarratives()               → all including resolved (admin)
  getNarrativeMemoryStats()               → aggregate snapshot
  — TTL: 14 days; max 150 threads; maturity: emerging→active→peaking→declining→resolved

feedAdaptationEngine.ts
  recordFeedback(FeedbackRecord)           → explicit user feedback
  recordEngagementSignal(url, type, ents) → implicit open/save/skip signal
  getAdaptiveBoost(entityId)               → 0.3–2.0 multiplier
  applyAdaptiveRanking(items, signal)      → re-ranked feed items
  getAutocorrectionSuggestions()          → entities to suppress/reduce
  getAdaptationState()                     → debug snapshot
  — boost/penalty per engagement type; decay 0.02/day; autocorrect at ≥3 ignores

longTermMemory.ts (architecture only)
  getMigrationStatus()                     → current storage phase
  isPostgresAvailable()                    → checks DATABASE_URL
  — Defines PostgreSQL schemas for all intelligence stores
  — Phase 1: in-memory (current) → Phase 2: PostgreSQL → Phase 3: vector
```

### Semantic Clustering Upgrade (`narrativeCluster.ts` — Sprint 10 Task D)

```
combinedSimilarity = Jaccard × 0.5 + entityOverlap × 0.5
paraphraseThreshold = 0.15 (vs 0.25 default) when entityOverlap ≥ 0.5
```

Entity overlap uses canonical entity IDs from `entityExtractor.ts`. Catches:
- "Fed raises rates" + "Federal Reserve hikes interest rates" → same cluster
- "Nvidia H200" + "Jensen Huang GPU announcement" → same cluster

### New Routes (Sprint 10)

| Route | Method | Description |
|---|---|---|
| `/api/adaptive/feedback` | POST | Explicit relevance feedback |
| `/api/adaptive/engagement` | POST | Implicit engagement signal |
| `/api/adaptive/state` | GET | Full adaptation state |
| `/api/adaptive/autocorrect` | GET | Quality autocorrection hints |
| `/api/adaptive/summary` | GET | Learned expansions + clusters |
| `/api/narratives` | GET | Active narrative threads |
| `/api/narratives/:id` | GET | Specific narrative + timeline |
| `/api/narratives/:id/timeline` | GET | Ordered developments |
| `/api/narratives/entity/:id` | GET | Narratives for entity |
| `/api/narratives/stats` | GET | Memory stats |

### New Pages (Sprint 10)

| Page | Route | Description |
|---|---|---|
| Narrative Intelligence | `/narratives` | Persistent threads, timeline view |
| Entity Relationship Map | `/debug/entities` | Entity memory, learned edges, clusters |

### Relevance Feedback UI (Sprint 10 Task F)

Each feed card in detailed mode shows a hover-revealed feedback bar:
- `★ High value` → +0.20 boost per matched entity
- `✓ More like this` → +0.18 boost
- `↓ Less like this` → -0.20 penalty  
- `✗ Irrelevant` → -0.25 penalty
- No social mechanics; no public counters; one feedback per article

---

## Sprint 12 — Delivery Stability & Real-World Usability

### New Backend Services

| Service | File | Purpose |
|---|---|---|
| Article Compression V2 | `articleCompressionV2.ts` | Sentence-level extraction, 40–60% compression |
| Source Reliability Engine | `sourceReliability.ts` | Per-source scoring, 3-tier rating, signal penalties |
| Delivery Recovery | `deliveryRecovery.ts` | Heartbeat monitoring, digest persistence, retry queue |
| Token Economy | `tokenEconomy.ts` | Narrative deduplication, priority budgets, cost tracking |
| Persistent Memory Prep | `persistentMemoryPrep.ts` | In-memory stores with Drizzle-ready interfaces |

### Delivery Engine V2 (`deliveryEngine.ts`)

The engine now runs a full pipeline before every briefing send:

```
fetchArticles()
  → compressArticleBatch()          ← V2 sentence-level compression
  → deduplicateNarratives()         ← Token economy deduplication
  → allocatePriorityBudget()        ← Signal-tier char budgets
  → applySourceReliabilityPenalty() ← Source reliability scoring
  → summarize()                     ← AI generation
  → persistDigestBeforeSend()       ← Recovery persistence
  → channel.send()                  ← Telegram delivery
  → recordHeartbeat()               ← Health monitoring
```

### Delivery Recovery Pattern

```
digest stored (pending)
  ↓ send success → status = "delivered"
  ↓ send failure → status = "failed" → retry queue (max 3 attempts)
```

Retry delays: 1 min → 5 min → 15 min. Missed-window detection at 07:00 / 18:00 ICT.

### Token Economy Budgets

| Mode | Total Budget | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Default | 18,000 chars | 800 | 600 | 350 | 150 |
| Executive | 8,000 chars | 800 | 600 | 350 | — |
| Intelligence | 22,000 chars | 1,000 | 700 | 400 | 200 |

Low-tier articles excluded unless `includeLowTier` flag is set or below minimum article count.

### Persistent Memory Contracts

`persistentMemoryPrep.ts` defines schema interfaces (`UserProfile`, `DeliveryHistoryEntry`, `UserMemoryEntry`, `StoredDigest`, `VectorMemoryEntry`) and an `InMemoryStore<T>` backing class. All stores (`userProfileStore`, `deliveryHistoryStore`, `userMemoryStore`, `digestStore`) expose the same interface as a future Drizzle ORM query — migration requires only swapping the implementation.

### New Routes (Sprint 12)

| Route | Method | Description |
|---|---|---|
| `/api/delivery/preview/send` | POST | Generate and send real briefing to Telegram |
| `/api/delivery/recovery` | GET | Recovery snapshot (health, retry queue, missed windows) |
| `/api/admin/delivery` | GET | Analytics V2 with token stats + recovery snapshot |

### New Pages (Sprint 12)

| Page | Route | Description |
|---|---|---|
| Delivery Analytics V2 | `/admin/delivery` | Token cost tracking, recovery health, signal efficiency |

### Briefing Formatter V2 (`briefingFormatter.ts`)

Clean Bloomberg/FT-style formatting for 4 briefing types:
- Section dividers: `────────────────` (no emoji spam)
- Compact markers: `◆` (headline) `▸` (point) `◎` (signal)
- Reading time calibrated for Thai text (~440 chars/min)
- Footer: `─── INFOX · {time} ICT ───`

---

## Sprint 14 — Persistent Infrastructure & Identity Foundation

### DB Schema (11 tables)

All Drizzle ORM table definitions live in `lib/db/src/schema/`. Run `pnpm --filter @workspace/db run push` to apply.

| Table | Purpose |
|---|---|
| `userProfiles` | Anonymous identity, onboarding state, founding-member flag |
| `userPreferences` | Topic subscriptions, delivery schedule, personality mode |
| `savedBriefings` | User-saved briefing content with metadata |
| `feedbackEvents` | Per-article engagement signals (open/save/skip/thumbs) |
| `deliveryHistory` | Every Telegram delivery record with status + token cost |
| `deliveryQueue` | Durable outbox — persists retry state across restarts |
| `narrativeThreads` | Named story arcs across multiple briefings |
| `entityMemoryEntries` | Per-entity mention count, sentiment, last-seen time |
| `analyticsSnapshots` | Daily/weekly aggregated usage metrics |
| `workerCheckpoints` | Worker heartbeats + last-run timestamps |
| `systemConfig` | Key-value store for runtime configuration |

### Storage Abstraction Layer

`artifacts/api-server/src/services/storage/` defines a single `IRepository<T>` interface. Two adapters ship:

- **`memoryAdapter`** — in-process Map; zero dependencies; used when `DATABASE_URL` is absent
- **`pgAdapter`** — Drizzle ORM + PostgreSQL; activated automatically when `DATABASE_URL` is present

Five repositories wrap the adapters: `userProfileRepository`, `userPreferencesRepository`, `savedBriefingRepository`, `feedbackRepository`, `deliveryQueueRepository`.

### Worker Architecture

`artifacts/api-server/src/workers/` houses a lightweight background-job system:

- **`baseWorker`** — `setInterval` wrapper with error isolation per tick
- **`retryWorker`** — re-queues failed deliveries every 60 s
- **`narrativeWorker`** — refreshes narrative threads every 30 min
- **`analyticsWorker`** — writes daily snapshots every 15 min
- **`workerRegistry`** — starts/stops all workers; called from `server/index.ts` on boot

### Startup Recovery (`startupRecovery.ts`)

On every boot: verifies DB connection, recovers stale delivery-queue items, logs storage mode (memory vs PostgreSQL). If DB is unreachable, server degrades gracefully to in-memory mode without crashing.

### Identity API Routes

| Route | Method | Description |
|---|---|---|
| `/api/identity/sync` | POST | Upsert anonymous profile from browser fingerprint |
| `/api/identity/:id` | GET | Retrieve persisted profile |
| `/api/identity/:id/onboarding` | POST | Mark onboarding complete + founding-member flag |
| `/api/identity/:id/feedback` | POST | Record article engagement event |
| `/api/identity/:id/briefings` | GET | List saved briefings for profile |
| `/api/identity/briefing` | POST | Persist a briefing |
| `/api/identity/briefing/:id` | DELETE | Remove a saved briefing |

### Economics API Routes

| Route | Method | Description |
|---|---|---|
| `/api/economics/summary` | GET | Token budget usage, cost estimate, model breakdown |
| `/api/economics/reset` | POST | Reset usage counters for current period |

### New Pages (Sprint 14)

| Page | Route | Description |
|---|---|---|
| Onboarding | `/onboarding` | 4-step founding-member signup flow |
| Cost Visibility | `/admin/economics` | Token usage, cost estimates, model breakdown |

### Deployment Files

`deployment/` contains: `Dockerfile`, `docker-compose.yml`, `.env.example`, `railway.toml`, `render.yaml`, `fly.toml`. The app is environment-portable — all secrets via env vars, no hardcoded hostnames.

### Architecture Decisions (Sprint 14)

1. **Graceful degradation over hard fail:** If `DATABASE_URL` is absent, the server runs fully on in-memory adapters. No crash, no data loss for the session.
2. **Repository pattern for all DB access:** Consumers never touch Drizzle directly — adapters are swappable without touching business logic.
3. **Workers are isolated:** Each worker tick is wrapped in try/catch; one failing worker cannot kill others or the main process.
4. **Identity is anonymous-first:** No auth required. Profile is keyed on a client-generated UUID stored in localStorage. Migration to authenticated accounts is additive.
5. **Persist-before-send pattern:** Delivery queue entries are written to DB before Telegram is called, ensuring no silent drops on process crash.


---

## Sprint 16 — Strategic Intelligence Layer

Sprint 16 transforms the system from "AI summarises news" into "AI helps users understand what matters and what to do next."

### New Services

| Service | Path | Responsibility |
|---------|------|----------------|
| Signal Mode Engine | `services/intelligence/signalModeEngine.ts` | User-controlled speed/verification balance (safe/balanced/raw) |
| Priority Hierarchy | `services/intelligence/priorityHierarchy.ts` | 5-tier signal classification for feed ranking |
| Confidence Scoring | `services/intelligence/confidenceScoring.ts` | 0–100 score + 5 signal classes per article/cluster |
| Strategic Context | `services/intelligence/strategicContext.ts` | Personalised "why this matters" explanation |
| Action Insight | `services/intelligence/actionInsight.ts` | Strategic implications + watch-entity list |
| Briefing Formatter V3 | `services/delivery/briefingFormatterV3.ts` | 6-section premium briefing structure |

### New API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/signal-mode` | GET | Current mode + config |
| `/api/signal-mode` | POST | Set mode (`safe`/`balanced`/`raw`) |
| `/api/signal-mode/configs` | GET | All mode definitions (for settings UI) |
| `/api/admin/system-intelligence` | GET | Full intelligence observability dashboard data |

### New Pages

| Page | Route | Description |
|------|-------|-------------|
| Signal Mode | `/settings/signal-mode` | User chooses speed vs. verification mode |
| System Intelligence | `/admin/system-intelligence` | Narrative/entity/delivery/token observability |

### New Documentation

- `docs/SIGNAL_MODES.md` — Signal Mode user guide
- `docs/CONFIDENCE_SYSTEM.md` — Confidence scoring algorithm
- `docs/ACTIONABLE_INTELLIGENCE.md` — Action insight system
- `docs/STRATEGIC_CONTEXT.md` — Strategic context personalisation layer

### Architecture Decisions (Sprint 16)

1. **Signal Mode is a server-side knob with client persistence**: Mode is stored in the API server process state and synced from localStorage on each client session start. This ensures consistent filtering across all server-side workers (not just the frontend).
2. **Confidence scoring is additive**: Each signal class has a minimum floor score; sources, freshness, and entity confirmation add points above the floor. This prevents gaming and ensures a minimum bar per class.
3. **Strategic context is non-blocking**: If the AI provider fails to generate strategic context, the briefing degrades to V2 format — no silent crash, no blank section.
4. **System intelligence dashboard is read-only**: `/api/admin/system-intelligence` is a GET-only aggregation endpoint. It reads from multiple in-memory stores and returns a JSON snapshot. No mutations.

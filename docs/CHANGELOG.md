# CHANGELOG.md — Personal AI Newsroom V1

---

## [2026-06-16] — Sprint 10: Adaptive Intelligence & Memory System

**What:** Twelve-task sprint adding adaptive interest engine (learns from behavior), entity extraction pipeline (alias-normalized entities), persistent narrative memory (14-day thread tracking), semantic clustering upgrade (entity overlap + paraphrase matching), feed adaptation engine (real-time re-ranking), relevance feedback UI (thumbs up/down/star/irrelevant), narrative timeline view, entity relationship map debug page, long-term memory foundation interfaces, feed quality autocorrection, agent orchestration memory contracts, and documentation.

**Why:** The product knew what users said they cared about (Sprint 9 interest graph) but not what they actually engaged with. This sprint closes the loop: engagement and explicit feedback now reshape the feed in real time. Narrative threads persist across sessions so recurring stories surface as tracked arcs rather than isolated articles. Entities are canonically normalized so "Fed" and "Federal Reserve" cluster together. The adaptive engine builds a private preference graph that makes the feed progressively smarter with use, with no social mechanics or external tracking.

### Task A — Adaptive Interest Engine (`adaptiveInterestEngine.ts`)
- Learns pairwise entity relationship edges from `open`, `save`, `complete_read`, `skip`, `feedback_positive`, `feedback_negative` signals
- Confidence per edge: +0.06 (open) → +0.20 (high_value feedback); -0.20–0.25 for negative signals
- Confidence decay: 0.05/day; prune below 0.02 effective confidence; max 300 edges, 500 engagement history (ring buffers)
- Auto-detects "expansion clusters" — concept groups inferred from repeated co-occurrence in reading (e.g., "Institutional Bitcoin Infrastructure")
- `getAdaptiveSummary()` — full debug snapshot of learned state

### Task B — Entity Extraction Pipeline (`entityExtractor.ts`)
- 100+ alias mappings: "Fed" / "FOMC" / "Jerome Powell" → `FederalReserve`; "NVDA" → `Nvidia`; "ChatGPT" → `OpenAI`
- Two-pass extraction: alias dict (confidence 0.8) + capitalized proper noun detection (0.5)
- Entity types: `company | person | government | product | cryptocurrency | institution | index | event | concept`
- `areSameEntity(title1, title2)` — used by clustering to detect paraphrase coverage
- `extractCorpusEntities(articles)` — frequency map across article set

### Task C — Persistent Narrative Memory (`narrativeMemory.ts`)
- Matches incoming clusters to existing threads via Jaccard title similarity (≥0.30) or dominant entity match (within 72h)
- 14-day TTL, max 150 threads; maturity lifecycle: emerging → active → peaking → declining → resolved
- Tracks: canonical headline, theme, related entities, up to 20 developments, mentions/24h, trend acceleration, sentiment direction, peak signal, milestones
- `GET /api/narratives` — active threads; `GET /api/narratives/:id` — thread detail + timeline
- Feed route now records every cluster into narrative memory via `recordNarrativeCluster()`

### Task D — Semantic Clustering Upgrade (`narrativeCluster.ts`)
- Combined similarity: `Jaccard × 0.5 + entityOverlap × 0.5` (was Jaccard only)
- Entity overlap uses canonical entity IDs from `entityExtractor.ts`
- Paraphrase threshold: 0.15 (vs 0.25 default) when `entityOverlap ≥ 0.5`
- Catches: "Fed raises rates" / "Federal Reserve hikes interest rates" → same cluster

### Task E — Feed Adaptation Engine (`feedAdaptationEngine.ts`)
- `applyAdaptiveRanking(items, signal)` — re-ranks feed by `relevanceScore × maxBoostAcrossEntities`
- `AdaptationSignal` from client body merged into feed request for session-aware ranking
- Boost multiplier range: 0.3 (suppressed) → 2.0 (highly preferred); decay 0.02/day
- Feed route at step 7b applies adaptive ranking after clustering

### Task F — Relevance Feedback UI (`my-feed.tsx`)
- `FeedbackBar` component on every detailed feed card; visible on hover
- Four buttons: ★ High value (+0.20), ✓ More like this (+0.18), ↓ Less like this (-0.20), ✗ Irrelevant (-0.25)
- One feedback per article; inline confirmation message; no social mechanics or counters
- `POST /api/adaptive/feedback` — feedback routed to adaptation engine

### Task G — Narrative Timeline View (`pages/narratives.tsx` + `routes/narratives.ts`)
- New page at `/narratives` — all active narrative threads
- Stats bar: counts by maturity + avg lifespan; filter tabs: all / peaking / active / emerging
- Narrative card: maturity badge, sentiment, 24h mentions, peak signal, related entities
- Detail view: 3-column stats, development timeline, entity chips, milestone markers
- `GET /api/narratives`, `GET /api/narratives/:id`, `GET /api/narratives/:id/timeline`

### Task H — Entity Relationship Map (`pages/debug/entities.tsx`)
- New debug page at `/debug/entities` — three tabs
- **Entity Memory**: all tracked entities with mention counts, trend direction, recent developments
- **Learned Edges**: adaptive engine's relationship graph with confidence bars
- **Expansion Clusters**: auto-detected concept groups with entity chips
- Search filter on entity memory tab; `GET /api/adaptive/state`

### Task I — Long-Term Memory Foundation (`longTermMemory.ts`)
- Defines `entity_memory`, `narrative_threads`, `narrative_developments`, `entity_adaptations`, `user_feedback`, `briefing_embeddings` PostgreSQL schemas
- `CrossSessionContext` interface — serializes all long-term memory into a portable session bundle
- `getMigrationStatus()` — reports current storage phase; `isPostgresAvailable()` — checks DATABASE_URL
- Phase roadmap: 1 (in-memory) → 2 (PostgreSQL) → 3 (pgvector) → 4 (multi-device)

### Task J — Feed Quality Autocorrection (`feedAdaptationEngine.ts`)
- `getAutocorrectionSuggestions()` — entities with `ignores ≥ 3` and `engagements = 0` flagged
- Suggestion types: `suppress` (70% reduction), `reduce` (40% reduction), `monitor` (flag for review)
- `GET /api/adaptive/autocorrect` — returns ranked correction suggestions

### Task K — Agent Orchestration Preparation (`multiAgentPrep.ts`)
- Added `SharedAgentMemory` interface — snapshot of all long-term memory for agent context distribution
- Added `AgentAnalysisRequestV2` — extends Sprint 9 request with `sharedMemory` + `narrativeThread`
- Added `OrchestratorState` — lifecycle tracking: idle → collecting → analyzing → synthesizing
- `isAgentActivationReady(role, cluster, thread)` — maturity gate blocks agents on `resolved`/`declining` narratives
- Imports `NarrativeThread` and `EntityMemoryEntry` types into agent contracts

### Task L — Documentation Updates
- `docs/INTELLIGENCE_MEMORY.md` (new): full Sprint 10 system reference — adaptive engine, entity extraction, narrative memory, semantic clustering, feedback system, long-term memory, UI views, agent contracts
- `docs/ARCHITECTURE.md`: Sprint 10 section — all new services, routes, pages, and semantic clustering math
- `docs/AGENT_ARCHITECTURE.md`: Sprint 10 section — shared memory contracts, maturity gate, Sprint 11 activation plan
- `docs/CHANGELOG.md`: this entry

---

## [2026-06-16] — Sprint 8: Habit Loop & Intelligence Companion

**What:** Twelve-task sprint adding flexible delivery scheduling, smart digest compression, story evolution engine, priority alerts, personality UI, reading memory filter, executive mode, signal/noise scoring, delivery metrics dashboard, visual refinement, future agent architecture docs, and documentation updates.

**Why:** The product was broadcasting content at users rather than building a habit loop. A truly useful intelligence companion must compress noise, surface emerging narratives, alert on critical events, and adapt its format to the user's context (busy executive vs. deep analyst). This sprint establishes the intelligence primitives that make INFOX feel like an active analyst, not a RSS reader.

### Task A — Flexible Delivery Scheduling
- `lib/schedulerSettings.ts` (new): `ScheduleSlot` type with `hour`, `minute`, `label`, `enabled`, `daysFilter` (all/weekdays/weekends); localStorage key `ai-newsroom:schedule-v2`; `addSlot`, `removeSlot`, `toggleSlot`, `updateSlotDaysFilter`, `getNextDeliveryForSlot`, `getDaysFilterLabel` helpers
- `pages/settings/scheduler.tsx` rewritten: slot cards with enable/disable toggle, days filter chips (Every day / Mon–Fri / Sat–Sun), countdown to next delivery, add-slot form with hour/minute dropdowns and label field; max 10 slots; delivery pipeline explainer section

### Task B — Smart Digest Compression
- `deliveryEngine.ts`: `compressDigest()` function ranks articles by signal score via `rankBySignal()`, deduplicates by title key (first 5 significant words), applies `filterLowSignal()` with minimum floor; articles entering the AI are the highest-impact subset rather than raw chronological order
- Logging records raw vs. compressed article count at every delivery run

### Task C — Story Evolution Engine
- `services/intelligence/storyEvolution.ts` (new): tracks 30+ named entities (Nvidia, OpenAI, Bitcoin, NATO, etc.) across deliveries; `recordStoryMentions(articles, topicId, briefingType)` extracts entity mentions; `getActiveStories(topicId)` returns active threads sorted by recency; `formatStoryContextForAI(topicId)` formats a Thai-language context block for AI prompt injection; stories expire after 72h; max 10 mentions per story (ring buffer)
- `deliveryEngine.ts`: calls `recordStoryMentions()` after collection; injects `formatStoryContextForAI()` output into `summarizeDelivery()` as `storyContext` param
- `summaryService.ts`: `summarizeDelivery()` now accepts `storyContext?` param; passed through to `promptBuilder.ts`
- `promptBuilder.ts`: `buildMorningBriefingPrompt()` and `buildEveningBriefingPrompt()` include story context block when provided

### Task D — Priority Alert Engine
- `services/delivery/alertEngine.ts` (new): `checkForAlerts(articles, watchlist)` — detects high-signal articles matching market move, AI development, geopolitical, or watchlist patterns; max 3 alerts per 6h window; 24h per-entity cooldown; min signal score 80; `getRecentAlerts(hours)` and `getAlertStats()` for dashboard
- `routes/alerts.ts` (new): `GET /api/alerts/recent`, `GET /api/alerts/stats`, `POST /api/alerts/check` (manual trigger with watchlist)
- `deliveryEngine.ts`: calls `checkForAlerts()` on raw articles after collection; alert count logged; alerts returned in `DeliveryEngineResult`

### Task E — Personality UI
- `lib/personalitySettings.ts` (new): 5 personality types — Analyst, Concise, Financial, Neutral, Contrarian; localStorage key `ai-newsroom:personality`; `getPersonality()`, `setPersonality()`, `getPersonalityOption()` helpers
- `pages/settings/personality.tsx` (new): one-button-per-personality UI with color-coded active state (blue/emerald/amber/slate/rose); tone description shown per personality; saved to localStorage
- `pages/settings/index.tsx`: Briefing Personality card shows current active personality name
- `promptBuilder.ts`: `PERSONALITY_INSTRUCTIONS` map now covers all 5 personalities with full Thai-language instructions

### Task F — Reading Memory Filter
- `pages/my-feed.tsx`: `hideRead` state persisted to localStorage key `ai-newsroom:hide-read`; eye/eye-off toggle button in feed header; when active, filters `visibleItems` to exclude URLs already in `readUrls` Set; summary row shows "X read hidden" count in amber; toggle state survives page refresh

### Task G — Executive Mode
- `lib/executiveMode.ts` (new): localStorage key `ai-newsroom:executive-mode`; `getExecutiveMode()`, `setExecutiveMode()`, `isExecutiveModeEnabled()` helpers
- `pages/settings/preferences.tsx` (new): executive mode toggle with preview of 5-bullet format; reading time guide comparing all briefing types; pill badge shows active mode
- `promptBuilder.ts`: `buildExecutiveBriefingPrompt()` (new) — 5-bullet impact-first format, ≤250 Thai words, under 90s reading time; each bullet starts with impact before event
- `summaryService.ts`: `summarizeExecutive(articles, topicLabels)` (new method)
- `pages/settings/index.tsx`: Preferences card shows Exec Mode badge when active

### Task H — Signal vs. Noise Scoring
- `services/intelligence/signalScoring.ts` (new): multi-factor signal scoring system; factors: source quality (Tier A=25/B=15/C=5 pts), recency (≤1h=30/≤3h=25/≤6h=18/≤12h=12/≤24h=6), geopolitical significance (keyword matches, cap 24), watchlist relevance (15 per hit, cap 30), multi-source confirmation (10/18/25 for 1/2/3+ confirms), trend momentum (capitals+numbers+length, cap 15); total max ~140; `scoreSignal()`, `rankBySignal()`, `filterLowSignal()` exports; thresholds: critical ≥100, high ≥70, low <20

### Task I — Delivery Quality Metrics
- `services/analytics/deliveryMetrics.ts` (new): `DeliveryRecord` type; `recordDelivery()`, `analyzeDeliveryText()`, `getDeliveryLog()`, `getDeliveryStats()`, `getAnalyticsSnapshot()` — in-memory ring buffer max 200 records; tracks word count, reading time, article count, generation time, signal distribution
- `routes/analytics.ts` (new): `GET /api/admin/analytics` — returns stats, alert stats, recent deliveries, active stories, trend memory
- `pages/admin/analytics.tsx` (new): three-tab dashboard (Overview / Deliveries / Intelligence); stat cards for success rate, reading time, generation time; 7-day delivery breakdown; signal quality distribution; recent delivery log; active story threads; trend memory panel

### Task J — Visual Refinement
- `pages/settings/index.tsx` rewritten: section groupings (Delivery / Personalisation / Content / Tools); all settings cards with icon + description + status badge; Delivery Analytics and Delivery Preview accessible from settings
- `pages/settings/personality.tsx`: color-coded card selection with per-personality accent colors; active badge with checkmark; tone line in personality color

### Task K — Future Agent Architecture
- `docs/AGENT_ARCHITECTURE.md` (new): 5-layer architecture (Orchestrator → Specialist Agents → Memory System → Tool Use → Inter-Agent Communication); specialist agent table; memory layer types; migration path from current pipeline; design principles; security considerations; evaluation metrics table

### Task L — Documentation
- `docs/CHANGELOG.md`: Sprint 8 entry (this)
- `docs/ARCHITECTURE.md`: new backend routes (alerts, analytics, preferences), Sprint 8 additions to summaryService and intelligence services

**Files created:**
- `services/intelligence/signalScoring.ts`
- `services/delivery/alertEngine.ts`
- `services/intelligence/storyEvolution.ts`
- `services/analytics/deliveryMetrics.ts`
- `routes/alerts.ts`, `routes/analytics.ts`, `routes/preferences.ts`
- `lib/schedulerSettings.ts`, `lib/personalitySettings.ts`, `lib/executiveMode.ts`
- `pages/settings/scheduler.tsx` (rewrite), `pages/settings/personality.tsx`, `pages/settings/preferences.tsx`
- `pages/admin/analytics.tsx`
- `docs/AGENT_ARCHITECTURE.md`

**Files modified:**
- `services/ai/promptBuilder.ts`, `services/ai/summaryService.ts`
- `services/delivery/deliveryEngine.ts`
- `routes/index.ts`
- `pages/my-feed.tsx`, `pages/settings/index.tsx`, `App.tsx`
- `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`

---

## [2026-06-16] — Sprint 7: Visual Intelligence & Trust Layer

**What:** Twelve-task sprint transforming INFOX into a Bloomberg/FT-quality media product. Telegram test-send button, smart image layer, article card redesign, trust indicators, compact/detailed density modes, reading progress, delivery preview phone mockup, source visual identity, image content safety, performance optimization (lazy loading), Visual Language Standard, and documentation.

**Why:** The feed was text-heavy and lacked visual identity. AI-generated content needed stronger trust signals. Delivery setup was hard to verify. The preview page was developer-oriented, not user-facing. There was no standard to keep the visual language consistent.

### Task A — Telegram Test Send Button
- `routes/telegram.ts`: new `POST /api/telegram/test-message` — calls getMe + getChat, formats a branded HTML confirmation message with bot username, chat title, ICT timestamp, and scheduled delivery times; sends to Telegram; returns `{ success, botUsername, chatTitle, messageId }`
- Helper function `telegramPost()` added alongside `telegramGet()` in the route
- `pages/settings/delivery.tsx`: "Send Test Message" button with sending spinner, ✓ Delivered result (bot + chat name), actionable error state with diagnostics link
- `pages/settings/delivery-debug.tsx`: "Send Test Message" button added alongside Run Diagnostics with inline success/fail result

### Task B — Smart Image Layer
- `services/news/rssService.ts`: parser configured with `customFields.item` for `media:content` and `media:thumbnail`; `extractImageUrl()` helper checks: (1) enclosure with image MIME type, (2) `media:content.$url`, (3) `media:thumbnail.$url`
- `imageUrl?` field added to `Article` interface in `aiProvider.ts`; flows through RSS → feed pipeline
- `routes/feed.ts`: `imageUrl` added to `PersonalFeedItem` type and returned in response

### Task C — Article Card Redesign
- `pages/my-feed.tsx` fully redesigned: Bloomberg/FT dark theme, new `FeedCard` component with source avatar, trust row, description excerpt (2 lines), footer with topic tag + recency badge + selection reason, `ArticleThumbnail` component (80×56px, right-aligned, lazy loaded)
- Loading skeletons (`SkeletonCard`) for both compact and detailed modes
- Smooth `transition-colors` on hover (no bounce/spring animation)

### Task D — Trust Indicators
- `TierBadge` component: amber border badge for Tier A sources only — "Tier A" text
- `RecencyBadge` component: "Breaking" in amber for ≤2h articles, "Recent" in muted for ≤6h
- Source avatar displays brand color + initials — instant recognition without text
- `selectionReason` field shown in detailed mode: "Matched: OpenAI · Watchlist: NVDA · Breaking · Reuters ★"

### Task E — Compact / Detailed View Toggle
- Density toggle in feed header (two-button group: LayoutList / AlignLeft icons)
- Compact mode: one-row per article (avatar + title + timestamp + topic tag)
- Detailed mode: full card with description, image, trust signals, "why selected"
- Persisted to localStorage key `ai-newsroom:feed-density`

### Task F — Reading Progress
- `lib/readingProgress.ts` (new): `useReadingProgress(urls)` hook — tracks viewed URLs in `localStorage` key `ai-newsroom:read-articles` (max 500 entries, ring buffer)
- `FeedCard` uses `IntersectionObserver` (threshold 0.5) — marks article as read when 50% visible, then disconnects
- Header shows: "X of Y read" in tertiary text — no progress bar, no gamification

### Task G — Delivery Preview Redesign
- `pages/delivery-preview.tsx` redesigned: `TelegramPhone` component renders a full phone frame (rounded-[36px] outer, rounded-[26px] screen, black notch pill, home indicator bar)
- Telegram dark chat UI: header with bot avatar + "online" status, date separator, message bubbles (bg-[#1e2b3b], `rounded-2xl rounded-tl-sm`, timestamp bottom-right), decorative input bar
- Page header updated with subtitle "See exactly what arrives in Telegram"

### Task H — Source Visual Identity
- `lib/sourceBranding.ts` (new): `getSourceBrand(sourceName)` — brand map for 30+ known sources (FT amber, Bloomberg purple, Reuters orange, AP red, TechCrunch blue, etc.)
- Partial/case-insensitive matching for source name variations
- Deterministic fallback palette (7 slate colors, color chosen by `charCodeAt(0) % 7`)
- `SourceAvatar` component: 28×28px rounded-sm square with initials

### Task I — Image & Content Safety
- `validateImageUrl()` in `rssService.ts`: rejects data URIs, URLs matching `/pixel|tracking|beacon|1x1|spacer|blank\.gif/i`, invalid URLs
- `ArticleThumbnail` component: `onError` handler hides image on load failure — layout never breaks
- Images shown only in detailed mode; compact mode has zero image overhead

### Task J — Performance Optimization
- All `<img>` elements use `loading="lazy"` — images only fetch when approaching viewport
- `IntersectionObserver` created once per card, disconnected after first trigger — zero ongoing cost
- Reading progress uses a `Set` diff to avoid unnecessary re-renders (only updates state when a new URL is added)

### Task K — Visual Language Standard
- `docs/VISUAL_GUIDELINES.md` (new): 8 sections — Philosophy, Color System, Typography, Spacing, Source Identity System, Card Density Modes, Image System, Trust Indicators, Reading Progress, Motion Rules, Delivery Preview spec, Iconography, Accessibility

### Task L — Documentation
- `docs/CHANGELOG.md` Sprint 7 entry (this)
- `docs/ARCHITECTURE.md` updated: Visual Layer, Image System, Reading Progress, Source Branding, delivery preview spec

**Files created:** `lib/sourceBranding.ts`, `lib/readingProgress.ts`, `docs/VISUAL_GUIDELINES.md`
**Files modified:** `aiProvider.ts`, `rssService.ts`, `routes/telegram.ts`, `routes/feed.ts`, `my-feed.tsx`, `delivery-preview.tsx`, `settings/delivery.tsx`, `settings/delivery-debug.tsx`, `docs/CHANGELOG.md`, `docs/ARCHITECTURE.md`

---

## [2026-06-16] — Sprint 6: Delivery & True Personalization

**What:** Eleven-task sprint completing the delivery pipeline and making personalization truly data-driven. Telegram diagnostics, professional message formatter, true personal feed scoring, feed explanation engine, Thai localization hardening, dynamic custom topics, source quality registry, daily digest memory, delivery scheduler UI, personality foundation, and documentation.

**Why:** The delivery pipeline worked but was opaque when Telegram failed. Feed ranking used only interest keywords — no recency, no source quality. There was no way to add topics beyond the 5 built-in ones. Evening briefings had no memory of the morning's stories.

### Task A — Telegram Diagnostics
- `routes/telegram.ts`: `POST /api/telegram/diagnostics` — calls `getMe` + `getChat`, returns full structured report with bot info, chat type, and diagnosis messages (✅/❌/💡 per issue)
- `pages/settings/delivery-debug.tsx` — dedicated diagnostics UI at `/settings/delivery/debug`; shows bot username, chat title/type, raw API responses (collapsible), common fix instructions

### Task B — Professional Telegram Formatter
- `services/delivery/briefingFormatter.ts` rewritten: section headers get `◆`/`▸` visual indicators, reading-time estimate injected in header (`⏱ N min read`), source count shown, ICT timestamp in footer, all via Telegram HTML mode (`<b>`, `<i>`)

### Task C — True Personal Feed Scoring
- `routes/feed.ts`: multi-signal scoring: interest keyword match (+20), watchlist match (+50/term), recency bonus (≤2h +40, ≤6h +25, ≤12h +15, ≤24h +8), source quality (Tier A +15, Tier B +8)
- Score ties broken by pubDate (most recent wins)

### Task D — Feed Explanation Engine
- `routes/feed.ts`: richer `selectionReason` field — "Matched: OpenAI · Watchlist: NVDA · Breaking · TechCrunch ★"
- Two new fields returned per article: `recencyLabel` ("Breaking"/"Recent") and `sourceTier` ("A"/"B"/"C")
- `pages/my-feed.tsx`: `FeedItem` interface extended with `recencyLabel` and `sourceTier`

### Task E — Thai Localization Hardening
- `services/ai/promptBuilder.ts` SHARED_RULES updated: explicit rule to keep company/product names in English (OpenAI, Nvidia, Tesla, Claude, GPT-4, Bitcoin, etc.), natural Thai analysis (not mechanical translation), ban on filler phrases

### Task F — Dynamic Custom Topics
- `services/news/customTopicsService.ts` — in-memory CRUD for custom topics; max 20 per server; kebab-case IDs; validates against built-in topic IDs
- `routes/topics.ts`: `POST /api/topics` (create), `DELETE /api/topics/:id`; `GET /api/topics` returns built-in + custom
- `pages/settings/topics.tsx` — full topic management UI at `/settings/topics`; lists built-in (locked), create form with RSS URL + keywords, delete for custom

### Task G — Source Quality Registry
- `services/news/sourceRegistry.ts` — static quality map (Tier A: FT/Bloomberg/Economist/MIT/Reuters/AP; Tier B: TechCrunch/Ars/Verge/CNBC/BBC/Politico; Tier C: all others)
- `getSourceBonus()` used in `routes/feed.ts` for feed scoring
- Custom sources registered at runtime when custom topics are created

### Task H — Daily Digest Memory
- `services/delivery/digestMemory.ts` — ring buffer (max 4 entries, ~2 days); `recordDigest()`, `getTodayMorning()`, `getTodayEvening()`, `getYesterdayEvening()`, `formatDigestContextForAI(type)`
- `deliveryEngine.ts`: injects digest context into morning/evening prompts; records each successful briefing
- `summaryService.ts`: `summarizeDelivery()` accepts optional `digestContext` parameter
- `promptBuilder.ts`: `buildMorningBriefingPrompt()` and `buildEveningBriefingPrompt()` accept optional `digestContext`

### Task I — Delivery Scheduler UI
- `pages/settings/scheduler.tsx` — shows next delivery countdown (live ICT clock), toggles for morning/evening, "how it works" pipeline, saves prefs to localStorage key `ai-newsroom:scheduler-prefs`
- Server-side delivery times remain fixed at 07:00/18:00 ICT via env vars; frontend toggle controls user preference display

### Task J — Personality Foundation
- `services/ai/promptBuilder.ts`: `BriefingPersonality` type (`analyst` | `concise` | `financial` | `neutral` | `aggressive`) with Thai instruction strings per mode
- `buildBriefingPrompt()` accepts optional `personality` parameter; passed through `summarizeArticles()` in `summaryService.ts`
- Architecture ready; no UI yet (planned for Sprint 7)

### Task K — Documentation
- `docs/CHANGELOG.md` Sprint 6 entry (this)
- `docs/ARCHITECTURE.md` updated: delivery + personalization modules, digest memory, source registry, custom topics, personality

**Files created:** `sourceRegistry.ts`, `customTopicsService.ts`, `digestMemory.ts`, `delivery-debug.tsx`, `scheduler.tsx`, `topics.tsx`
**Files modified:** `telegram.ts`, `briefingFormatter.ts`, `feed.ts`, `promptBuilder.ts`, `summaryService.ts`, `deliveryEngine.ts`, `newsCollectorService.ts`, `routes/topics.ts`, `App.tsx`, `settings/index.tsx`, `my-feed.tsx`

---

## [2026-06-15] — Sprint 5: Cost Optimization & Personalization

**What:** Ten-task sprint making the platform scalable and cost-efficient. Global briefing cache, article preprocessor, token budget controller, source diversity scoring, interest priority engine, trend memory, cost analytics dashboard, lightweight fallback generator, personal feed V1, and documentation.

**Why:** Every request generated a fresh AI briefing. Technology and AI topics exceeded GitHub token limits. The personalization layer existed but wasn't driving article selection. Sprint 5 fixes all three problems before adding more features.

### Task A — Shared Briefing Cache
- `services/cache/briefingCache.ts` — in-memory, 60-min TTL, key `{topicId}:{YYYY-MM-DD-HH}`
- Same topic + same hour → same briefing served to all users
- `getCacheMetrics()` tracks hit rate; returned in `GET /api/admin/costs`
- `routes/news.ts` checks cache first; returns in <50ms on hit, includes `cacheHit: true` flag

### Task B — Article Preprocessor
- `services/news/articlePreprocessor.ts` — strips HTML, boilerplate, entity codes; trims descriptions
- Logs before/after char counts + reduction %; `preprocessStats` field in API response

### Task C — Token Budget Controller
- Part of `articlePreprocessor.ts`: MAX_ARTICLES=5, MAX_ARTICLE_LENGTH=1000, MAX_PROMPT_CHARS=24000
- Drops lowest-ranked articles if budget exceeded; Technology/AI topics can no longer exceed GitHub limits

### Task D — Source Diversity Scoring
- `newsCollectorService.ts` updated: second article from same source -15 pts, third+ -30 pts
- Promotes cross-source variety across the selected article set

### Task E — Interest Priority Engine
- `newsCollectorService.ts` now accepts `interests: string[]`; applies `scoreArticleByInterests()` during ranking
- `routes/news.ts` extracts `interests` from request body and passes through the pipeline

### Task F — Trend Memory
- `services/news/trendMemory.ts` — stores top headlines per topic for 24 hours
- `formatTrendContext()` returns Thai-language context injected into the AI prompt
- `promptBuilder.ts` and `summaryService.ts` updated to accept optional `trendContext` parameter

### Task G — Cost Analytics Dashboard
- `services/analytics/costAnalytics.ts` — rolling 1000-entry request log with token estimates + cost projection
- `routes/costs.ts` — `GET /api/admin/costs` returns full snapshot
- `pages/admin-costs.tsx` — dashboard at `/admin/costs` with stat cards, request table, cache state, trend memory

### Task H — Fallback Generation
- `services/ai/fallbackGenerator.ts` — generates HEADLINE + TOP STORIES + KEY FACTS without LLM
- Activated on any AI failure; `isLightweightFallback: true` in response

### Task I — Personal Feed V1
- `routes/feed.ts` — `POST /api/feed/personal` scores and annotates articles across all interest topics
- `pages/my-feed.tsx` — `/my-feed` page; interest pills, watchlist input, matched/unmatched split, selection reasons
- "My Feed" link added to home page nav

### Task J — Documentation
- `docs/ARCHITECTURE.md` updated: Sprint 5 modules, caching architecture, token controller, trend memory, personal feed
- `docs/CHANGELOG.md` Sprint 5 entry (this)

**Files created:** `briefingCache.ts`, `articlePreprocessor.ts`, `trendMemory.ts`, `fallbackGenerator.ts`, `costAnalytics.ts`, `costs.ts`, `feed.ts`, `admin-costs.tsx`, `my-feed.tsx`
**Files modified:** `newsCollectorService.ts`, `promptBuilder.ts`, `summaryService.ts`, `news.ts`, `routes/index.ts`, `App.tsx`, `home.tsx`

---

## [2026-06-15] — Sprint 4: Intelligence Delivery Engine

**What:** Transformed from a news website into a personal intelligence assistant with automated Telegram delivery, morning/evening briefing schedules, interest profiling, delivery preview, and configuration center. 11 tasks across backend and frontend.

**Why:** Sprint 3 proved the core briefing quality. Sprint 4 makes it a daily-use tool — delivering insights to you automatically instead of requiring you to visit the site.

---

### Task A — Telegram Delivery Settings UI

- `/settings/delivery` — form to enter bot token + chat ID, save to localStorage, test connection
- `POST /api/telegram/test` — verifies bot can reach the configured chat (calls `getChat`)
- `POST /api/telegram/send` — sends a pre-generated briefing text to Telegram
- Credentials stored in localStorage (migration-ready for DB: see `lib/telegramSettings.ts`)

### Task B — Delivery Engine + Real Telegram

- `services/delivery/telegramDelivery.ts` — `IDeliveryChannel` interface + `TelegramDelivery` implementation using raw `fetch` to Telegram Bot API (HTML parse mode, 500 ms inter-message delay)
- `services/delivery/deliveryEngine.ts` — pipeline orchestrator: collect → summarize → format → deliver; `generateBriefing()` (no send) and `generateAndDeliver()` (with channel)
- `services/delivery/briefingFormatter.ts` — HTML formatting, 4096-char message splitting at paragraph boundaries

### Task C+D — Morning + Evening Scheduled Briefings

- `services/delivery/scheduler.ts` — setInterval 60 s poll, fires at 07:00 and 18:00 in `SCHEDULER_TIMEZONE` (default `Asia/Bangkok`); memory-tracks sent-today keys to prevent duplicates
- Scheduler starts automatically on server boot; silently no-ops if Telegram credentials are not configured
- `POST /api/delivery/morning` and `POST /api/delivery/evening` — generate and optionally deliver

### Task E+F — Interest Engine + Feed Generator

- `lib/interestProfile.ts` — localStorage profile with add/remove/clear; 12 preset interests
- `services/news/feedGenerator.ts` — `INTEREST_DEFINITIONS` map (12 presets: Tesla, Nvidia, BYD, Bitcoin, Ethereum, Nintendo, Steam, OpenAI, Anthropic, AI Agents, EV, Gaming); `generatePersonalFeed()`, `scoreArticleByInterests()`
- `/settings/interests` — toggle grid for all 12 presets, shows which topics each maps to

### Task G — Delivery Preview Page

- `/delivery-preview` — generate morning and evening briefings on-demand; renders them inside a mock Telegram UI bubble; "Send to Telegram" button uses stored credentials
- `GET /api/delivery/preview/morning` and `GET /api/delivery/preview/evening` — generate and return formatted messages without delivering

### Task H — Briefing Quality Upgrade

- Added to all prompts: multi-source evidence synthesis (cite org names, people, numbers)
- Added: contradiction detection between sources
- Clarified IMPACT ANALYSIS: explicit short-term (1–4 weeks) vs long-term (3–12 months) split
- All providers now expose `complete(systemPrompt, userPrompt)` as the low-level method; `summarize()` calls it

### Task I — Configuration Center

- `/settings` hub — cards for Telegram Delivery, Interest Profile, Delivery Preview; live status badges
- Settings gear icon added to main header nav (home page)

### Task J — Retry System

- `rssService.ts` — each feed retried up to 2 times (1 s then 2 s delay); `FeedDiagnostic.attempts` tracks retry count
- `summaryService.ts` — AI calls retried once after 2 s; auth errors (401) not retried

### Task K — Architecture Docs

- `docs/ARCHITECTURE.md` — fully rewritten: system diagram, all layers, data flow, extension guides
- `docs/CHANGELOG.md` — Sprint 4 entry added

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

---

## [2026-06-16] — Sprint 9: Contextual Intelligence Layer

**Mission:** Evolve from keyword-based personalization to semantic relevance, narrative clustering, interest graphs, and entity memory.

### Intelligence Services Created

**`services/intelligence/interestGraph.ts`** (Task A)
- 40+ entity nodes in weighted relationship graph
- BFS traversal up to 2 hops with decay (×0.7, ×0.4)
- `expandInterests()` → full entity expansion map
- `getGraphScore()` → 0.0–1.0 graph-aware relevance

**`services/intelligence/relevanceClassifier.ts`** (Task B)
- 4-tier classification: direct / contextual / weak / incidental
- Combines: keyword score + graph proximity + entity overlap + source modifier
- Recency multiplier: ≤2h = ×1.3, ≤6h = ×1.2
- `classifyRelevance()` returns full `RelevanceClassification` with explanation

**`services/intelligence/narrativeCluster.ts`** (Task C)
- Jaccard similarity clustering on title word sets (threshold 0.25)
- Generates narrative headlines from most-common shared terms
- Marks `isMultiSource` for clusters with ≥2 unique sources
- `agentContext` block: future multi-agent compatibility metadata

**`services/intelligence/tasteLearning.ts` (frontend)** (Task D)
- LocalStorage event log: opens, saves, skips, complete_reads
- `deriveTasteSignal()` → sent to API per feed request
- `getTasteStats()` → user-readable learning stats
- Strong interests: opened ≥3 times in 30 days

**`services/intelligence/entityMemory.ts`** (Task G)
- Auto-detects entities in articles via INTEREST_GRAPH keywords
- Tracks 24h/7d mention counts with trend direction
- Rising entity detection: last24h/prior24h ratio ≥1.5
- In-memory store, 7-day TTL, 15 developments per entity

**`services/intelligence/personalContext.ts`** (Task H)
- Derives per-request bias vector from graph + taste + entity memory + watchlist
- `applyContextBoost()` applies weighted boost to article scores
- Rising entities receive +8 additional boost
- Watchlist always scores 1.0 weight

**`services/analytics/feedQualityMetrics.ts`** (Task J)
- Ring buffer (500 records) per-request quality tracking
- Quality trend detection comparing recent vs older accuracy
- `getFeedQualityStats()` includes qualityTrend: improving/stable/degrading

**`services/intelligence/multiAgentPrep.ts`** (Task K)
- Architecture-only: no active agent processing
- Defines `AgentRole`, `AgentAnalysisRequest`, `AgentAnalysisResult` types
- `AGENT_SYSTEM_PROMPTS` — role-specific system prompt fragments for Bull/Bear/Macro/Tech/Policy
- `isAgentRelevant()` — prevents unnecessary agent activation per cluster type

### Routes Created

**`routes/debug.ts`** (Task E)
- `GET /api/debug/relevance` — system overview
- `POST /api/debug/relevance/test` — live relevance testing
- `GET /api/debug/graph/:interest` — graph expansion visualizer
- `GET /api/debug/entities` — entity memory snapshot

**`routes/feedQuality.ts`** (Task J)
- `GET /api/admin/feed-quality` — quality metrics snapshot

### Routes Updated

**`routes/feed.ts`** — Full Sprint 9 intelligence pipeline:
- Builds PersonalContextProfile per request
- Classifies all articles with RelevanceClassifier
- Records entity mentions to EntityMemory
- Applies quality filters (clickbait, incidental+low-signal, no-description)
- Clusters narratives and annotates articles with cluster info
- Builds intelligent feed explanations (Task I)
- Records FeedQualityMetrics per response
- New response fields: `narrativeClusters`, `filteredArticles`, `contextSummary`, `feedQuality`, `expandedEntities`

**`routes/index.ts`** — Added debugRouter, feedQualityRouter

### Frontend Updated

**`pages/my-feed.tsx`** (Tasks C, D, F, I, J)
- Shows RelevanceClassBadge (Direct/Contextual/Weak) per article
- Narrative Clusters section above individual stories
- Feed Quality Bar (accuracy%, clustering rate, filtered count)
- Personal context summary displayed under interests
- Graph-matched entities shown for contextual articles
- Sends `tasteSignal` with every feed request
- Records opens via IntersectionObserver for taste learning
- Summary bar shows direct/contextual counts separately
- Links to /debug/relevance and /admin/feed-quality

**`pages/debug/relevance.tsx`** (Task E)
- 4-tab inspector: Overview, Test, Graph, Memory
- Live relevance testing with score breakdown bars
- Interest graph visualizer with hop coloring
- Entity memory table with trend indicators
- Stat cards: graph nodes, tracked entities, active stories

**`pages/admin/feed-quality.tsx`** (Task J)
- Real-time quality stats grid (accuracy, clustering, diversity, filtered)
- Relevance class distribution bars
- Per-request log with color-coded class breakdown
- Auto-refreshes every 30 seconds
- Quality trend badge (Improving/Stable/Degrading)

**`App.tsx`** — Added routes for /debug/relevance, /admin/feed-quality

### Architecture Decisions

1. **Graph over keywords:** All entity expansion via INTEREST_GRAPH prevents accidental keyword pollution from unrelated contexts.
2. **4-tier classification:** Enables quality filtering (incidental removed) without discarding edge-relevant stories.
3. **Narrative clustering is additive:** Clusters displayed above the feed, not replacing individual articles, preserving user agency.
4. **Taste learning is transparent:** User can see what's being tracked via getTasteStats(); no hidden manipulation.
5. **Entity memory is stateless per-request:** Server derives context fresh each call from the in-memory store — no session coupling.
6. **Multi-agent prep is interface-only:** No agent code runs. The architecture is forward-compatible without incurring cost or latency.

### Known Limitations

- Interest graph is static (hardcoded in interestGraph.ts). Dynamic expansion from user feedback is Sprint 10+ work.
- Narrative clustering uses Jaccard on title tokens — not semantic embeddings. Will miss paraphrase clusters.
- Entity memory is in-memory: resets on server restart. Persistence requires PostgreSQL integration (post-auth sprint).
- Taste learning is client-only: resets if user clears localStorage. No sync between devices.
- Quality filters use heuristics (clickbait regex, word count). False positives possible for short-form legitimate news.


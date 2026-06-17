# CHANGELOG.md — Personal AI Newsroom V1

---

## [2026-06-17] — Sprint 21: Observability & Business Intelligence

**What:** Observability sprint — zero new product features; all work improves visibility into what is running and fixes routes that were silently broken.

### Critical Route Fixes (Task A + expanded)
Root cause: 7 route files declared paths with `/api/` prefix inside a router already mounted at `app.use("/api", router)` — creating double `/api/api/...` paths that all returned 404.

**Fixed files:**
- `economics.ts` — 4 routes: `/api/economics/*` → `/economics/*`
- `identity.ts` — 8 routes: `/api/identity/*` → `/identity/*`
- `adminNarratives.ts` — 3 routes: `/api/admin/narratives*` → `/admin/narratives*`
- `knowledgeCompound.ts` — 3 routes: `/api/intelligence/compound*` → `/intelligence/compound*`
- `proactiveIntelligence.ts` — 8 routes: `/api/intelligence/*` → `/intelligence/*`
- `waitlist.ts` — 2 routes: `/api/waitlist/*` → `/waitlist/*`

**Impact:** `/admin/economics`, onboarding identity sync, narrative admin, intelligence routes, and waitlist were ALL returning 404. Now operational.

### New DB Tables (Task C, E)
- `analytics_events` — event stream: PAGE_VIEW, FEED_VIEW, ARTICLE_OPEN, BRIEFING_SAVE, TELEGRAM_CONNECT, etc.
- `token_usage_daily` — daily token aggregation per feature/topic/briefing type

### New Backend Routes
- `POST /api/events/track` — fire-and-forget event recording
- `POST /api/events/batch` — batch event recording (up to 50)
- `GET /api/admin/events/recent` — recent events list
- `GET /api/admin/events/stats` — event counts by type (24h + 7d)
- `GET /api/admin/analytics` — business snapshot (users DAU/WAU/MAU, delivery, events)
- `GET /api/admin/analytics/usage` — 14-day daily user activity chart
- `GET /api/admin/analytics/features` — feature popularity ranked by 7d events
- `GET /api/admin/analytics/funnel` — conversion funnel (visitor → interest → telegram → briefing → returning)
- `GET /api/admin/analytics/alerts` — system alert conditions (queue, degradation, token budget, workers)
- `GET /api/identity/profiles` — admin endpoint listing all anonymous profiles

Also fixed route conflict: old `/admin/analytics` in `analytics.ts` renamed to `/admin/analytics/delivery-quality`.

### New Frontend Pages
- `/admin/command-center` — unified admin view: Alerts, Business, AI Economics, Product, Delivery, System
- `/admin/users` — anonymous user insight panel with profile list and engagement stats

### New Frontend Hook
- `useAnalytics` / `trackEvent` — fire-and-forget event tracking; batched with 300ms debounce; silently swallows errors; never blocks UI

### UI Contrast Fixes (Task I)
In `settings/index.tsx`:
- `SectionLabel`: `text-white/30` → `text-white/50`
- Appearance/Account placeholder cards: `text-white/20` → `text-white/40`, `text-white/35` and `text-white/40`
- Footer branding: `text-white/20` → `text-white/35`

### Route Budget
Routes: 17 primary (`/admin/command-center` + `/admin/users` added; both `/admin/system` and `/admin/health` kept for backwards compat — within ≤ 20 budget).

---

## [2026-06-17] — Sprint 20: System Consolidation & Production Preparation

**What:** Continued consolidation sprint building on Sprint 19's route merges. Deleted 17 dead page files that were de-routed in Sprint 19 but left on disk. Fixed vite.config.ts — removed hard-throw on missing PORT/BASE_PATH, replaced with safe defaults (23519/`/`). Rewired App.tsx to use wouter `<Redirect>` for legacy URLs instead of dead imports. Added `/admin/system` (unified ops dashboard with 6 collapsible sections: Runtime, Token Economy, Workers, Delivery, Sources, Cache/Storage) and `/admin/health` (real-time API health monitor with 15s auto-refresh). Added `/auth/login` placeholder with Sprint 21 architecture contract. Created `artifacts/api-server/src/middleware/auth.ts` with typed stubs for `requireAuth`, `requireAdmin`, `requireEntitlement`, `optionalAuth`. Created `artifacts/newsroom/src/components/auth/ProtectedRoute.tsx` with passthrough (Sprint 21 contract). Wrote `docs/CONSOLIDATION_AUDIT.md` (full system audit), `docs/MASTER_INDEX.md` (canonical docs navigator), `deployment/Makefile` (dev/build/docker/deploy commands). Production runtime files (Dockerfile, fly.toml, railway.toml, render.yaml, .env.example) already existed from Sprint 14 — validated and kept.

**Why:** Sprint 19 removed routes from App.tsx but left 17 dead files on disk, creating import confusion. The vite.config.ts PORT hard-throw was blocking the artifact workflow from starting (it requires PORT/BASE_PATH but the Replit-managed workflow doesn't inject them). Sprint 20 closes both gaps and lays the auth + production architecture foundation for Sprint 21.

### Deleted (17 dead page files)
`settings/delivery.tsx` · `settings/delivery-debug.tsx` · `settings/delivery-preview-live.tsx` · `settings/delivery-preview-v3.tsx` · `settings/scheduler.tsx` · `settings/intelligence-score.tsx` · `admin/analytics.tsx` · `admin/delivery.tsx` · `admin/feed-quality.tsx` · `admin/habit.tsx` · `admin/source-trust.tsx` · `admin/system-intelligence.tsx` · `admin-costs.tsx` · `delivery-preview.tsx` · `debug/entities.tsx` · `debug/feed-evolution.tsx` · `debug/relevance.tsx`

### New Pages
- `admin/system.tsx` — unified ops dashboard (6 collapsible sections)
- `admin/health.tsx` — real-time health monitor (15s auto-poll, live/paused toggle)
- `auth/login.tsx` — Sprint 21 auth placeholder with architecture contract

### Auth Foundations (Sprint 21 prep)
- `api-server/src/middleware/auth.ts` — typed stubs: `requireAuth`, `requireAdmin`, `requireEntitlement`, `optionalAuth`; Sprint 21 TODO comments inline
- `newsroom/src/components/auth/ProtectedRoute.tsx` — passthrough wrapper with Sprint 21 contract
- `AuthUser` interface: `{ id, profileId, email?, role, tier, sessionId }`

### Bug Fixes
- `vite.config.ts` — removed hard-throw on missing `PORT`/`BASE_PATH`; defaults to `23519`/`/`; fixes `artifacts/newsroom: web` workflow startup
- `App.tsx` — replaced 7 dead legacy page imports with proper wouter `<Redirect>` components

### Docs
- `docs/CONSOLIDATION_AUDIT.md` — full system audit (pages, routes, services, Telegram, admin, docs)
- `docs/MASTER_INDEX.md` — canonical documentation navigator with route map + sprint roadmap
- `deployment/Makefile` — standardised dev/build/docker/deploy commands

---

## [2026-06-17] — Sprint 19: Platform Consolidation & Product Stabilization

**What:** Structural sprint — no new features. 33 routes collapsed to 15 primary routes. Six fragmented Telegram pages merged into `/delivery-studio` (5 tabs: Config, Preview, Send, Diagnostics, Schedule). Seven analytics/admin pages merged into `/intelligence-center` (5 sections: Intelligence, Delivery, Sources, Token Economy, System). Three debug pages merged into `/admin/debug` (3 tabs: Relevance, Entities, Feed Evolution). Settings page restructured into 6 clean sections. 29 redundant sprint-specific docs archived to `docs/archive/`. Two governance documents written: `CLOSED_ALPHA_READINESS_REPORT.md` (alpha readiness score 4/10) and `ARCHITECTURE_GUARDRAILS.md` (10 rules, route budget ≤ 20, doc budget ≤ 10). React hooks-in-map violation in ScheduleTab fixed by extracting `SlotCard` as a proper component. Missing `label` arg to `addSlot()` corrected.

**Why:** By Sprint 18 the product had accumulated 33 routes, 25+ sprint-specific docs, and six separate Telegram configuration pages. Users had no coherent navigation path. This sprint removes the debt before closed alpha without touching the intelligence pipeline.

### Route Map (33 → 15)
**Merged away:**
- `/delivery-preview`, `/settings/delivery`, `/settings/delivery/debug`, `/settings/delivery/preview-live`, `/settings/delivery/preview-v3`, `/settings/scheduler` → `/delivery-studio`
- `/admin/analytics`, `/admin/delivery`, `/admin/feed-quality`, `/admin/system-intelligence`, `/admin/source-trust`, `/settings/intelligence-score`, `/admin/habit` → `/intelligence-center`
- `/admin/costs` → `/admin/economics`
- `/debug/relevance`, `/debug/entities`, `/debug/feed-evolution` → `/admin/debug`

**Kept (15 primary routes):**
`/` · `/onboarding` · `/saved` · `/my-feed` · `/narratives` · `/waitlist` · `/settings` · `/settings/*` (interests/topics/personality/preferences/signal-mode) · `/delivery-studio` · `/intelligence-center` · `/admin/economics` · `/admin/narratives` · `/admin/efficiency` · `/admin/debug` · `/insights/export`

### New Pages
- `delivery-studio.tsx` — unified Telegram hub with Config/Preview/Send/Diagnostics/Schedule tabs
- `intelligence-center.tsx` — unified ops dashboard with 5 sections
- `admin/debug.tsx` — consolidated debug hub with 3 tabs

### Docs
- `docs/CLOSED_ALPHA_READINESS_REPORT.md` — 4/10 readiness score, blockers, UX risks
- `docs/ARCHITECTURE_GUARDRAILS.md` — 10 architecture rules for future sprints
- `docs/archive/` — 29 redundant sprint docs moved here

### Bug Fixes
- `delivery-studio.tsx` ScheduleTab: `useState`/`useEffect` called inside `.map()` — extracted `SlotCard` component
- `addSlot()` call missing required `label` argument — corrected

---

## [2026-06-16] — Sprint 15: Precision Intelligence & Alpha Experience

**What:** Ten-task sprint that transforms INFOX from "AI news summarizer" into "high-signal intelligence companion." Key additions: Feed Precision V2 with entity weighting + source trust + crypto downgrade logic (Task A), 7-factor Signal Priority Engine replacing simple recency sort (Task B), full pipeline re-wiring of tasks A+B into newsCollectorService (Task C wire), Telegram V2 formatter with layered scan-first structure + `/settings/delivery/preview-live` page (Task C), Knowledge Compound System tracking hours saved + noise filtered + compound rate at `/settings/intelligence-score` (Task F), Closed Alpha waitlist at `/waitlist` with 4-step onboarding + sample digest preview (Task H), signal quality badge on briefing card header showing noise filtered, HealthBadge dark-mode fix using theme-compatible opacity classes, and three new documentation files.

**Why:** The existing system ranked articles by recency + quality score — making INFOX feel like a RSS reader. Sprint 15 replaces this with a precision layer (crypto noise suppression, entity importance scoring) and a signal-priority ranker (7 factors: impact, acceleration, entity importance, narrative persistence, source trust, relevance confidence, recency). The result: important stories surface automatically, noise is quantified and shown to users, and the product now has an alpha capture flow.

### Task A — Feed Precision V2 (`precisionFilter.ts`)
- `applyPrecisionFilter(articles, topicId)` — multi-factor noise gate before AI
- 4 scoring dimensions: entity importance (tier weighting), topic purity, source trust, cross-source bonus
- Crypto downgrade: suppresses crypto content from crypto-native sources unless confirmed by Tier A/B source
- `SUPPRESSION_THRESHOLD = 12` — articles below this with no entity hits are removed
- Always keeps ≥ 4 articles to prevent empty briefings
- Output includes `isSuppressed`, `suppressionReason`, `isCryptoDowngraded`

### Task B — Signal Priority Engine (`signalPriorityEngine.ts`)
- `rankBySignalPriority(articles, topicId)` — 7-factor ranking replaces recency sort
- Factors: impact (30), acceleration (20), entity importance (20), narrative persistence (15), source trust (30), relevance confidence (20), recency (15) — max 150 pts
- Priority labels: `critical` ≥100, `high` ≥70, `medium` ≥40, `low` <40
- Critical/high always surfaces before medium/low regardless of age

### Task C — Pipeline Re-wire + Telegram V2
- `newsCollectorService.ts` fully rewired: precision filter → signal priority ranking
- `CollectionResult` now includes `suppressedCount`, `cryptoDowngradedCount`
- `briefingFormatterV2.ts` — 4-layer phone-scan format: headline → 3 scan bullets → extended body → link
- `deliveryEngine.ts` swapped to V2 formatters
- `/settings/delivery/preview-live` — phone-frame Telegram preview with send-test button

### Task F — Knowledge Compound System
- `knowledgeCompound.ts` — tracks hours saved, noise filtered, signal accuracy, compound rate
- Time savings model: 4 min/filtered article + 6.5 min/briefing session
- `GET /api/intelligence/compound` — weekly summary + daily breakdown
- `/settings/intelligence-score` — hero metric: estimated hours saved this week

### Task H — Closed Alpha Gating
- `/waitlist` — 4-step onboarding: email/name → pain points → sample digest preview → confirmation
- `POST /api/waitlist/join` with pain point capture (5 options)
- In-memory storage with 1000-entry ring buffer (DB migration ready)

### Visual Intelligence Layer + Dark Mode Fixes
- Briefing card header: amber "X filtered" badge when `suppressedCount > 0`
- `signalStats` object surfaced in `/api/news/summarize` response (`suppressedCount`, `signalRatio`, etc.)
- `HealthBadge` rewritten: dark-mode-compatible opacity classes, "Live/Degraded/Offline" labels
- Settings page: added Intelligence Score + Preview Live V2 menu items
- `Article` type import added to home.tsx; all implicit `any` callback parameters annotated
- `api-client-react` project reference build fixed (declarations generated via `tsc -b`)

### Documentation
- `docs/PRECISION_INTELLIGENCE.md` — full architecture doc for precisionFilter + signalPriorityEngine
- `docs/TELEGRAM_FORMATTING.md` — V1 vs V2 comparison, layer extraction, HTML vs MarkdownV2 rationale
- `docs/KNOWLEDGE_COMPOUND.md` — time savings model, API contract, compound score math
- `docs/ALPHA_GATING.md` — waitlist flow, pain point options, API contract, future founder-access

---

## [2026-06-16] — Sprint 12: Delivery Stability & Real-World Usability

**What:** Twelve-task sprint focused on delivery reliability, operational resilience, and infrastructure readiness. Key additions: "Send Test Briefing" with 4 briefing types (Task A), upgraded Telegram formatting with clean section dividers and narrative grouping (Task B), Article Compression V2 with sentence-level information extraction (Task C), Source Reliability Engine with automatic feed down-ranking (Task E), Delivery Recovery module with heartbeat monitoring + retry queue + digest persistence (Task F), Deployment Readiness documentation for Railway/Render/Fly.io/Docker (Task G), Token Economy layer with narrative deduplication + priority budget allocation (Task H), Delivery Analytics V2 at `/admin/delivery` with token cost tracking (Task I), Persistent Memory Preparation with PostgreSQL/vector memory contracts (Task K), and full documentation suite (Task L).

**Why:** INFOX's intelligence was strong but delivery was fragile. Sprint 12 moves from prototype to product: digests are now persisted before sending, failures are queued for retry, token usage is tracked and optimized, and the deployment roadmap is documented for migration to always-on infrastructure.

### Task A — Telegram Delivery Preview
- `POST /api/delivery/preview/send` — generate real briefing and send to Telegram
- Supports all 4 types: `morning` | `evening` | `executive` | `intelligence`
- "Send Test Briefing" card in `/settings/delivery/debug` with 4 buttons
- Each button shows article count, message count, and compression stats on success
- Inline status indicators (idle → sending → sent/failed) per briefing type

### Task B — Telegram Message Quality
- Rewrote `briefingFormatter.ts` — clean section dividers (`────────────────`)
- No emoji spam, no ASCII art — compact professional markers only (◆ ▸ ◎)
- Reading time calibrated for Thai text (~440 chars/min vs generic 200wpm)
- Meta line includes: reading time · source count · narrative count · signal badge
- 4 formatters: `formatMorningBriefingForTelegram`, `formatEveningBriefingForTelegram`, `formatExecutiveBriefingForTelegram`, `formatIntelligenceBriefingForTelegram`
- Narrative momentum field passed through to footer
- Footer: `─── INFOX · {time} ICT ───`

### Task C — Article Compression V2 (`articleCompressionV2.ts`)
- Sentence-level extraction replacing V1 flat truncation
- 5-signal sentence scoring: numbers (+30), quotes (+25), actions (+20), consequences (+15), entities (+10)
- Per-article budget: 600 chars (down from 1000 in V1)
- Total budget: 18,000 chars (down from 24,000 → ~25% token reduction)
- Boilerplate removal: HTML, tracking links, legal text, navigation, social sharing
- `compressArticleBatch()` — batch compression with total budget enforcement
- Typical result: 40–60% compression with higher content density than V1

### Task E — Source Reliability Engine (`sourceReliability.ts`)
- Per-source event log: `fetch_success` / `fetch_failure` / `parse_error` / `duplicate` / `quality_good` / `quality_poor`
- Composite reliability score (0–100): parse success (50%) + low duplication (25%) + quality (25%)
- Tiers: `reliable` (≥70, no penalty) · `unstable` (45–69, −8) · `poor` (<45, −20)
- Penalties applied to signal scores in delivery engine
- `recordFeedFetchResult()` and `recordArticleQuality()` called from delivery pipeline

### Task F — Delivery Recovery (`deliveryRecovery.ts`)
- Heartbeat monitoring: `recordHeartbeat()` called each delivery cycle
- Digest persistence: every digest stored before send (`persistDigestBeforeSend()`)
- Status transitions: `pending` → `delivered` / `failed`
- Retry queue: 3-attempt max, delays 1m → 5m → 15m
- Missed window detection: detects 07:00 / 18:00 ICT windows not delivered
- `GET /api/delivery/recovery` — full recovery snapshot
- `getRecoverySnapshot()` returns `overallHealthy` flag for dashboard

### Task G — Deployment Readiness (`docs/DEPLOYMENT_READINESS.md`)
- Migration targets: Railway, Render, Fly.io, VPS, Docker
- Full environment variable documentation
- Persistent service migration table (8 in-memory services → PostgreSQL targets)
- Scheduler migration: platform cron → BullMQ patterns documented
- Dockerfile examples for api-server and newsroom frontend
- Future Redis usage guide (BullMQ, caching, rate limiting, sessions)
- Recommended migration order: Railway → PostgreSQL → Clerk Auth → Redis → pgvector

### Task H — Token Economy (`tokenEconomy.ts`)
- `deduplicateNarratives()` — removes same-story articles before AI call
- `allocatePriorityBudget()` — signal-tier char budgets (critical: 800, high: 600, medium: 350, low: 150)
- `recordTokenUsage()` — tracks input/output chars, estimated tokens, estimated cost
- `getTokenStats()` — aggregate token usage for analytics dashboard
- 3 budget configs: DEFAULT (18k chars), EXECUTIVE (8k), INTELLIGENCE (22k)
- Low-tier articles excluded unless below minimum article count

### Task I — Delivery Analytics V2 (`/admin/delivery`)
- New page with infrastructure health status, token economy metrics, signal efficiency
- `GET /api/admin/delivery` — expanded analytics snapshot including tokenStats + recoverySnapshot
- `getAnalyticsSnapshot()` now includes: signalEfficiency, narrativeDensity, retryRate
- `deliveryMetrics.ts` expanded with retry count tracking and token input chars
- Link from existing `/admin/analytics` → `/admin/delivery`

### Task K — Persistent Memory Preparation (`persistentMemoryPrep.ts`)
- Schema interfaces: `UserProfile`, `DeliveryHistoryEntry`, `UserMemoryEntry`, `StoredDigest`, `VectorMemoryEntry`
- `InMemoryStore<T>` — in-memory fallback with same interface as future Drizzle ORM queries
- `buildPersonalizationContext()` — assembles user context from all stores
- `getMigrationReadiness()` — structured report with blockers + recommendations
- `userProfileStore`, `deliveryHistoryStore`, `userMemoryStore`, `digestStore` — ready to swap for Drizzle

### Task L — Documentation
- `docs/DEPLOYMENT_READINESS.md` — deployment architecture (new)
- `docs/DELIVERY_INFRASTRUCTURE.md` — delivery pipeline + recovery docs (new)
- `docs/TOKEN_ECONOMY.md` — compression + budget + cost model docs (new)
- `docs/ARCHITECTURE.md` — updated with Sprint 12 services
- `docs/CHANGELOG.md` — this entry

### Architecture Decisions

1. **Sentence-level compression over truncation:** V2 extracts highest-density sentences rather than cutting at N characters. Sends "better content" to AI, not just "less content".
2. **Persist-before-send pattern:** Digest is stored in memory before channel.send(). If send fails, the content is preserved for retry. No re-generation needed.
3. **Retry queue is passive for now:** Items are queued but the retry worker is not yet active. The queue pattern is established; activating the worker is a single addition.
4. **Token economy without embeddings:** Priority budgets are derived from rule-based signal scores, not semantic embeddings. This avoids additional API calls while still prioritizing high-value content.
5. **In-memory persistence contracts:** All new stores use `InMemoryStore<T>` which mirrors the future Drizzle ORM interface. Migrating to PostgreSQL requires only swapping the backing implementation.

### Known Limitations

- Retry worker is not yet active — queued retries require manual replay
- Source reliability resets on server restart (in-memory)
- Token cost estimates use OpenAI pricing as reference; GitHub Models is free but has rate limits
- `getMigrationReadiness()` always reports `readyForMigration: false` until auth is added
- Executive and Intelligence briefing types in delivery engine not connected to scheduler (manual/preview only)

---

## [2026-06-16] — Sprint 11: Proactive Intelligence Engine

**What:** Twelve-task sprint adding trend acceleration engine (5-class momentum scoring, 6h velocity windows), early signal detector (3 detection modes, cross-source emergence / unusual repetition / ecosystem linkage), narrative relationship engine (entity Jaccard + union-find ecosystems), entity influence system (5-component score, tier classification), user intelligence profile (synthesises all behavioral signals), intelligence briefing mode (`/api/intelligence/briefing`), narrative health monitor (`/admin/narratives`), feed evolution visualization (`/debug/feed-evolution`), agent orchestration layer v1 (3 new agent roles, `ProactiveTrigger` queue), and full documentation.

**Why:** The feed knew what was relevant to the user but not what was _emerging_. Sprint 11 closes this gap: INFOX now detects accelerating narratives, weak signals before they go mainstream, ecosystem linkages across story threads, and entity influence shifts — surfacing what matters earliest rather than waiting for the user to ask.

### Task A — Trend Acceleration Engine (`trendAcceleration.ts`)
- 6-hour sliding window velocity calculation with prior-window comparison
- Classifications: `emerging` · `accelerating` · `peak` · `declining` · `dormant`
- Momentum score 0–100: velocity (0–60) + acceleration (0–25) + source spread (0–10) + entity richness (0–5)
- `buildTrendSummary()` produces full sorted snapshot for all active narratives + entities

### Task B — Early Signal Detector (`earlySignalDetector.ts`)
- Mode 1: `cross_source_emergence` — same theme from ≥ 3 distinct sources in < 3h
- Mode 2: `unusual_repetition` — entity 5× above rolling 24h baseline in 1h
- Mode 3: `ecosystem_linkage` — new entity alongside ≥ 2 established graph entities
- Signals carry confidence (0–1), 24h TTL, article samples, `isEarlySignal` flag for feed badge

### Task D — Narrative Relationship Engine (`narrativeRelationshipEngine.ts`)
- Edge types: `entity_overlap` · `temporal_comovement` · `entity_chain` · `causal_inference`
- Ecosystem detection via union-find on edges with strength ≥ 0.25
- 6h graph cache to avoid recompute on every request

### Task F — Intelligence Briefing Mode (`/api/intelligence/briefing`)
- Strategic synthesis: major developments, accelerating narratives, signals, rising entities, influencers, ecosystems, system momentum

### Task G — Narrative Health Monitor
- Backend: `/api/admin/narratives` + `/stats` + `/:id/health`
- Frontend: `/admin/narratives` — momentum bars, lifecycle metrics, per-narrative health

### Task H — Entity Influence System (`entityInfluence.ts`)
- Components: breadth (0–35) + depth (0–25) + velocity (0–20) + spread (0–15) + centrality (0–5)
- Tiers: `dominant (75+)` · `major (50+)` · `moderate (25+)` · `minor (<25)`
- Influence direction: `expanding` · `stable` · `contracting`

### Task I — User Intelligence Profile (`userIntelligenceProfile.ts`)
- Synthesises: adaptive engine edges + entity adaptation boosts + entity memory + interest graph
- Outputs: primary/secondary interests, entity focus areas, blind spots, reading pattern, trend preference, profile strength (0–100)

### Task J — Feed Evolution Visualization
- Frontend: `/debug/feed-evolution` — live intelligence picture with system momentum, ecosystem snapshot, signal panel

### Task K — Agent Orchestration Layer v1 (`multiAgentPrep.ts`)
- Three new agent roles: `proactive` · `early_signal` · `ecosystem`
- `ProactiveTrigger` interface with 5 trigger types and priority bands
- `evaluateProactiveTrigger()` — LLM-free activation gate
- `buildSharedMemory()` — Sprint 11 context for agent distribution

### Task L — Documentation
- `docs/PROACTIVE_INTELLIGENCE.md` — complete Sprint 11 architecture reference
- Updated `CHANGELOG.md`, `ARCHITECTURE.md`, `INTELLIGENCE_MEMORY.md`

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

---

## Sprint 14 — Persistent Infrastructure & Identity Foundation

**Date:** 2026-06-16  
**Theme:** Move from Replit-dependent volatile state to a persistent, deployable intelligence platform.

### New Files

**`lib/db/src/schema/`** (11 tables — Tasks A)
- `userProfiles.ts`, `userPreferences.ts`, `savedBriefings.ts`, `feedbackEvents.ts`, `deliveryHistory.ts`, `deliveryQueue.ts`, `narrativeThreads.ts`, `entityMemoryEntries.ts`, `analyticsSnapshots.ts`, `workerCheckpoints.ts`, `systemConfig.ts`
- All pushed to PostgreSQL via `pnpm --filter @workspace/db run push`

**`artifacts/api-server/src/services/storage/`** (Task B)
- `IRepository.ts` — generic CRUD interface (findById, findMany, upsert, delete, count)
- `memoryAdapter.ts` — in-process Map; zero-dep fallback when DB absent
- `pgAdapter.ts` — Drizzle ORM wrapper; activated when `DATABASE_URL` is present

**`artifacts/api-server/src/repositories/`** (Task B)
- `userProfileRepository.ts`, `userPreferencesRepository.ts`, `savedBriefingRepository.ts`, `feedbackRepository.ts`, `deliveryQueueRepository.ts`

**`artifacts/api-server/src/routes/identity.ts`** (Task C)
- 7 endpoints for anonymous profile sync, onboarding, feedback, and briefing persistence
- Manual validation (no zod dependency) matching existing route style

**`artifacts/api-server/src/routes/economics.ts`** (Task H)
- `GET /api/economics/summary` — token budget usage + cost estimate
- `POST /api/economics/reset` — reset counters for current period

**`artifacts/api-server/src/services/delivery/deliveryQueue.ts`** (Task E)
- DB-backed outbox: enqueue → send → ack/nack flow
- In-memory fallback when DB unavailable
- Persist-before-send pattern: DB write precedes every Telegram call

**`artifacts/api-server/src/workers/`** (Task G)
- `baseWorker.ts` — setInterval with per-tick error isolation
- `retryWorker.ts` — re-queues failed deliveries (60 s interval)
- `narrativeWorker.ts` — refreshes narrative threads (30 min interval)
- `analyticsWorker.ts` — writes daily snapshots (15 min interval)
- `workerRegistry.ts` — starts/stops all workers on server boot

**`artifacts/api-server/src/services/infra/startupRecovery.ts`** (Task K)
- DB health check on boot (with latency logging)
- Recovers stale in-flight delivery queue items
- Graceful degradation to memory mode if DB unreachable

**`deployment/`** (Task F)
- `Dockerfile`, `docker-compose.yml`, `.env.example`
- `railway.toml`, `render.yaml`, `fly.toml` — platform-specific configs

**`artifacts/newsroom/src/pages/onboarding.tsx`** (Task I)
- 4-step founding-member signup flow
- Steps: Welcome → Topics → Delivery → Confirm
- Writes profile via `/api/identity/sync` + `/api/identity/:id/onboarding`

**`artifacts/newsroom/src/pages/admin/economics.tsx`** (Task H)
- Token budget usage bars per mode (Default / Executive / Intelligence)
- Cost estimate table, model breakdown, period reset button

**New docs** (Task J/L)
- `docs/PERSISTENT_INFRASTRUCTURE.md` — storage layer design + migration guide
- `docs/IDENTITY_FOUNDATION.md` — anonymous identity + onboarding design
- `docs/DEPLOYMENT_GUIDE.md` — Railway / Render / Fly.io deployment instructions
- `docs/CLOSED_ALPHA_PLAN.md` — founding-member rollout strategy

### Modified Files

**`artifacts/api-server/src/index.ts`** — calls `runStartupRecovery()` and `startAllWorkers()` on boot  
**`artifacts/api-server/src/routes/index.ts`** — registers identity and economics routers  
**`artifacts/newsroom/src/App.tsx`** — adds `/onboarding` and `/admin/economics` routes  
**`artifacts/newsroom/src/pages/home.tsx`** — defensive `Array.isArray` guard on topics query data  
**`artifacts/api-server/src/services/intelligence/longTermMemory.ts`** — `getMigrationStatus()` updated to Phase 2 (PostgreSQL active)

### Bug Fixes

- `home.tsx`: `topics?.map is not a function` — pre-existing crash when React Query returned a stale non-array cache hit. Fixed with `Array.isArray(topicsRaw)` guard.
- `identity.ts`: Build failure — `zod/v4` not installed in `@workspace/api-server`. Replaced with manual type-guard validation matching existing route style.

### Architecture Decisions

1. **Graceful degradation over hard fail:** Missing `DATABASE_URL` degrades to in-memory adapters without crashing — identical API surface.
2. **Repository pattern isolates DB access:** Consumers never touch Drizzle directly; adapter swap requires zero consumer changes.
3. **Workers are isolated per-tick:** Each tick wrapped in try/catch; one broken worker cannot kill others or the main process.
4. **Identity is anonymous-first:** Profile keyed on client-generated UUID (localStorage). Authenticated migration is purely additive.
5. **Persist-before-send:** Delivery queue entry is committed to DB before Telegram is called — no silent message loss on crash.

### Known Limitations (Sprint 14)

- User preferences table is defined but not yet wired to the delivery scheduler (uses env-var config today).
- Analytics snapshots are written but not yet surfaced on a dedicated page beyond the economics route.
- Worker checkpoints are stored but no admin page shows worker health yet.
- Onboarding writes to DB but the frontend does not yet read back a persisted profile on subsequent sessions.


---

## Sprint 17 — Intelligence Efficiency & Source Expansion (June 2026)

**Theme**: Transform from a smart intelligence platform into efficient, scalable intelligence infrastructure — token economy optimization, AI cost control, source expansion, intelligence caching, runtime independence, and signal ingestion architecture.

### New Features

#### 3-Layer AI Pipeline (Task A + J + B)
- **AI Pipeline** — routes intelligence work through cheap (Layer 1), mid (Layer 2), and premium (Layer 3) tiers
- **Degradation Engine** — 5-level system (0=normal → 4=emergency) with auto-evaluation + manual override
- **Token Governor** — hard-limit budget enforcement with per-feature tracking and pressure levels
- Auto-triggers degradation when token budget pressure reaches 75%/85%/95%/98%

#### Intelligence Cache (Task C)
- 5 typed cache categories: `briefing`, `narrative`, `insights`, `signal_score`, `source_health`
- TTL-based with stale-with-grace (15-min grace window to prevent stampedes)
- LRU eviction at 500 entries
- Hit ratio analytics + admin visibility

#### Source Expansion Foundation (Tasks D + E + F)
- **Unified Source Contract** (`ISourceAdapter`) — all sources produce `NormalizedArticle` with confidence metadata
- **Reddit Adapter** — monitors 10 subreddits (investing, MachineLearning, CryptoCurrency, geopolitics, etc.) via public JSON API (no auth needed)
- **Twitter/X Adapter** — architecture ready; enabled only when `TWITTER_BEARER_TOKEN` is set; includes trend acceleration detection

#### Compression Engine V2 (Task G)
- 5 delivery tiers: `full` → `standard` → `compact` → `minimal` → `emergency`
- Profile auto-selected based on degradation level + token pressure + signal mode
- Information-density compression algorithm (scores sentences by numbers, action verbs, entities)
- Signal density analytics: `retainedRatio` shows what fraction of content was preserved

#### Runtime Separation (Task H)
- Full classification of all INFOX services by persistence requirement and sleep safety
- P0 services at risk during Replit sleep: Delivery Scheduler + Narrative Memory
- 3-phase migration plan: QStash scheduler → PostgreSQL checkpoints → Redis cache
- `recordRuntimePing()` detects sleep gaps

#### User-Owned AI Provider Model (Task M)
- Session tier abstraction: anonymous / free / standard / premium
- Per-tier entitlements: daily token budgets, feature flags, BYOK capability
- `checkEntitlement()` — feature gate for premium insights, Telegram, scheduling, custom topics
- Architecture ready for Stripe-backed tier upgrades (Sprint 18+)

### New Admin API Routes (all under `/api/admin/`)

| Route | Method | Description |
|-------|--------|-------------|
| `/admin/degradation` | GET | Degradation level + history |
| `/admin/degradation` | POST | Set level manually (0–4) |
| `/admin/degradation` | DELETE | Clear manual override |
| `/admin/token-governor` | GET | Budget snapshot + pressure level |
| `/admin/intelligence-cache` | GET | Cache stats + entries |
| `/admin/sources` | GET | Source adapter health checks |
| `/admin/runtime` | GET | Runtime stats + migration plan |
| `/admin/pipeline` | GET | AI pipeline stats + session info |

### New Documentation
- `docs/AI_PIPELINE.md` — 3-layer pipeline architecture
- `docs/TOKEN_GOVERNOR.md` — budget enforcement + pressure levels
- `docs/SOURCE_EXPANSION.md` — Reddit/Twitter adapter architecture
- `docs/DEGRADATION_STRATEGY.md` — 5-level degradation system
- `docs/CACHING_STRATEGY.md` — Intelligence cache design
- `docs/RUNTIME_SEPARATION.md` — Sleep safety classification + migration plan
- `docs/COMPRESSION_ENGINE.md` — Adaptive delivery compression
- `docs/USER_AI_PROVIDER_MODEL.md` — Session tiers + BYOK architecture

### Files Added
**New services:**
- `artifacts/api-server/src/services/intelligence/aiPipeline.ts`
- `artifacts/api-server/src/services/intelligence/degradationEngine.ts`
- `artifacts/api-server/src/services/intelligence/tokenGovernor.ts`
- `artifacts/api-server/src/services/cache/intelligenceCache.ts`
- `artifacts/api-server/src/services/sources/sourceAdapter.ts`
- `artifacts/api-server/src/services/sources/redditSourceAdapter.ts`
- `artifacts/api-server/src/services/sources/twitterSignalAdapter.ts`
- `artifacts/api-server/src/services/delivery/compressionEngine.ts`
- `artifacts/api-server/src/services/runtime/runtimeSeparation.ts`
- `artifacts/api-server/src/services/auth/userSession.ts`

**New routes:**
- `artifacts/api-server/src/routes/efficiencyAdmin.ts`

**Updated:**
- `artifacts/api-server/src/routes/index.ts` — added efficiencyAdminRouter

---

## Sprint 16 — Strategic Intelligence Layer (June 2026)

**Theme**: Transform from "AI summarises news" → "AI helps users understand what matters and what to do next."

### New Features

#### Signal Mode System
- 3-mode control: **Safe** (multi-source verified), **Balanced** (default), **Raw Signal** (max speed)
- `/settings/signal-mode` — settings page with mode cards, risk indicators, pros/cons
- `/api/signal-mode` GET/POST — sync mode between client and server
- LocalStorage persistence (`ai-newsroom:signal-mode`) + server-side state

#### Strategic Intelligence Services
- **Priority Hierarchy** — 5-tier article classification: `critical` / `high` / `medium` / `context` / `noise`
- **Confidence Scoring** — 0–100 score per article/cluster + 5 signal classes: experimental → early_signal → developing → confirmed → established
- **Strategic Context** — personalised "why this matters" explanation, narrative positioning, second-order implications
- **Action Insight** — strategic implications (3–5 bullets), watch entities, urgency level (watch/prepare/act)

#### Briefing Formatter V3
6-section premium structure:
1. Headline Signal
2. Why This Matters (strategic context)
3. Key Signals (priority-ranked)
4. Strategic Watchlist (action insights)
5. Confidence Tier badge
6. Estimated read time

#### System Intelligence Dashboard (`/admin/system-intelligence`)
- Top 10 narratives by maturity + mention count
- Top 10 accelerating entities by 24h velocity
- Signal/noise ratio gauge
- Narrative maturity distribution (progress bars)
- Delivery success rate
- AI token consumption estimates
- Adaptation signals (top boosted/suppressed entities)

### New Routes
- `GET /api/signal-mode` — current mode + config
- `POST /api/signal-mode` — set mode
- `GET /api/signal-mode/configs` — all mode definitions
- `GET /api/admin/system-intelligence` — full intelligence observability

### New Pages
- `/settings/signal-mode` — Signal Mode configuration
- `/admin/system-intelligence` — System Intelligence dashboard

### New Documentation
- `docs/SIGNAL_MODES.md` — Signal Mode user guide
- `docs/CONFIDENCE_SYSTEM.md` — Confidence scoring deep dive
- `docs/ACTIONABLE_INTELLIGENCE.md` — Action insight architecture
- `docs/STRATEGIC_CONTEXT.md` — Strategic context personalisation

### Files Changed
**New services:**
- `artifacts/api-server/src/services/intelligence/signalModeEngine.ts`
- `artifacts/api-server/src/services/intelligence/priorityHierarchy.ts`
- `artifacts/api-server/src/services/intelligence/confidenceScoring.ts`
- `artifacts/api-server/src/services/intelligence/strategicContext.ts`
- `artifacts/api-server/src/services/intelligence/actionInsight.ts`
- `artifacts/api-server/src/services/delivery/briefingFormatterV3.ts`

**New routes:**
- `artifacts/api-server/src/routes/signalMode.ts`
- `artifacts/api-server/src/routes/systemIntelligence.ts`

**New frontend:**
- `artifacts/newsroom/src/pages/settings/signal-mode.tsx`
- `artifacts/newsroom/src/pages/admin/system-intelligence.tsx`
- `artifacts/newsroom/src/lib/signalMode.ts`

**Updated:**
- `artifacts/api-server/src/routes/index.ts` — added signalModeRouter + systemIntelligenceRouter
- `artifacts/newsroom/src/App.tsx` — added /settings/signal-mode + /admin/system-intelligence routes
- `artifacts/newsroom/src/pages/settings/index.tsx` — Signal Mode nav item
- `docs/ARCHITECTURE.md` — Sprint 16 section

## Sprint 18 — Multi-Source Intelligence & Token Sustainability

**Date:** June 16, 2026  
**Theme:** Cross-platform signal expansion, native Thai quality, and long-term token economics

### Summary

Sprint 18 introduces 8 new services and 4 frontend features that make INFOX cost-sustainable at scale, truly Thai-first in output quality, and multi-platform in signal sourcing. All 13 tasks (A–M) completed.

### New Backend Services

**A — Thai Localization Engine** (`thaiLocalizationEngine.ts`)
- Thai ratio analysis, English leakage detection, confidence scoring (native/acceptable/degraded/poor/failed)
- Prompt-injection enforcement, partial repair, preserved brand-name list (40+ brands)
- `GET /api/admin/localization` for stats

**B — Source Trust Engine** (`sourceTrustEngine.ts`)
- Per-source trust score (0–100) with 6 weighted sub-scores
- Clickbait pattern detection (14+ patterns), crypto noise detection, misinformation flagging
- Stability classes: tier_one/reliable/mixed/unreliable/toxic
- Temporal decay, `GET /api/admin/source-trust`

**C — Multi-Platform Adapters** (`platformAdapters.ts`)
- YouTube Channel adapter (RSS, no key required): CNBC, Bloomberg, Lex Fridman, YC, MIT
- Reddit Expansion: 15 new subreddits (r/SecurityAnalysis, r/singularity, r/LocalLLaMA, etc.)
- TikTok, Facebook, Instagram stubs (architecture ready, activate with API keys)
- `GET /api/admin/platform-adapters` for health

**F — Token Survival Engine** (`tokenSurvivalEngine.ts`)
- 5 survival modes: normal/efficient/frugal/survival/emergency
- Memoization (content-hash dedup, 30min/2hr TTL), duplicate suppression (15min window)
- Signal escalation gate, prompt shrinking, waste event tracking
- `GET /api/admin/token-survival`

**G — Source Priority Orchestrator** (`sourcePriorityOrchestrator.ts`)
- 8-factor source ranking: trust, recency, specialization, acceleration, cross-confirmation, geopolitical, market sensitivity, tier bonus
- Hard exclusion for toxic sources (trust class = toxic)
- `GET /api/admin/source-priority`

**H — Compression Engine Upgrade** (`compressionEngine.ts`)
- 5 persona density modes: executive (3 bullets/15s), investor (5/30s), operator (5/45s), analyst (full), delta_only (new developments only)
- `compressForPersona()`, `extractDeltaOnly()` functions

**I — Signal Memory Optimizer** (`signalMemoryOptimizer.ts`)
- Memory health report (healthy/degraded/critical/overflow)
- Age scoring (0–100 per narrative), strategic retention (war, election, recession never age out)
- Compression planning: archive dormant, merge 65%+ similar
- `GET /api/admin/signal-memory`

**J — BYOK Preparation** (`byokPreparation.ts`)
- Full architecture: BYOKSlot, BYOKProfile, BYOKEntitlement, ProviderRoutingDecision types
- Entitlement tiers: anonymous/free/standard/premium
- Key registration intent + revocation + routing decision
- Sprint 19 will add live validation + billing
- `GET /api/admin/byok`

**K — Deployment Hardening** (`deploymentHardening.ts`)
- Environment validation, runtime detection (Replit/Docker/Railway/Render/Fly.io)
- Deployment readiness score (0–100), portability audit
- `GET /api/admin/deployment-readiness`, `GET /api/admin/sprint18`

### Frontend Changes

**D — Signal Card Visual Hierarchy** (`signal-card.tsx`)
- `SignalCard` component: 5 tiers with urgency glow, confidence ribbon, momentum badge
- `BreakingSignalBanner` with animated pulse
- `SignalFeed` with hierarchy-based grouping

**E — Telegram Preview V3** (`delivery-preview-v3.tsx`)
- 3 density modes: Express (5s), Compact (15s), Standard (30s)
- Side-by-side comparison view
- Topic selector (AI/Economy samples)
- `/settings/delivery/preview-v3` route

**L — Visual & Accessibility Cleanup** (`index.css`)
- `animate-pulse-slow`, `animate-glow-breaking`, `animate-glow-critical` keyframes
- WCAG AA contrast utility classes
- Thin scrollbar styling, focus ring accessibility
- Thai typography: `.thai-text`, `.thai-headline` (Sarabun font, optimized line-height)
- Skeleton shimmer animation, mobile 44px touch targets

### New Pages
- `/settings/delivery/preview-v3` — Telegram Preview V3
- `/admin/source-trust` — Source Trust Engine dashboard

### New Settings Nav Items
- Telegram Preview V3 (NEW badge)
- Source Trust Engine (NEW badge)

### New Documentation
- `docs/THAI_LOCALIZATION.md`
- `docs/SOURCE_TRUST_SYSTEM.md`
- `docs/TOKEN_SURVIVAL.md`
- `docs/MULTI_SOURCE_INTELLIGENCE.md`
- `docs/VISUAL_HIERARCHY.md`

### New Admin Routes
All mounted at `/api/admin/...`:
- `localization` — Thai localization stats
- `source-trust` — Source trust profiles
- `source-trust/decay` — Trigger decay
- `token-survival` — Survival mode + memo stats
- `source-priority` — Orchestration snapshot
- `signal-memory` — Memory optimization report
- `byok` — BYOK architecture status
- `platform-adapters` — Platform adapter health
- `deployment-readiness` — Deployment readiness
- `sprint18` — Full Sprint 18 summary

### Files Changed

**New services:**
- `artifacts/api-server/src/services/intelligence/thaiLocalizationEngine.ts`
- `artifacts/api-server/src/services/intelligence/sourceTrustEngine.ts`
- `artifacts/api-server/src/services/intelligence/tokenSurvivalEngine.ts`
- `artifacts/api-server/src/services/intelligence/sourcePriorityOrchestrator.ts`
- `artifacts/api-server/src/services/intelligence/signalMemoryOptimizer.ts`
- `artifacts/api-server/src/services/sources/platformAdapters.ts`
- `artifacts/api-server/src/services/delivery/previewDeliveryV3.ts`
- `artifacts/api-server/src/services/auth/byokPreparation.ts`
- `artifacts/api-server/src/services/infra/deploymentHardening.ts`

**Updated services:**
- `artifacts/api-server/src/services/delivery/compressionEngine.ts` — persona density modes

**New routes:**
- `artifacts/api-server/src/routes/sprint18Admin.ts`

**Updated routes:**
- `artifacts/api-server/src/routes/index.ts` — added sprint18AdminRouter

**New frontend:**
- `artifacts/newsroom/src/components/ui/signal-card.tsx`
- `artifacts/newsroom/src/pages/settings/delivery-preview-v3.tsx`
- `artifacts/newsroom/src/pages/admin/source-trust.tsx`

**Updated frontend:**
- `artifacts/newsroom/src/App.tsx` — 2 new routes
- `artifacts/newsroom/src/pages/settings/index.tsx` — 2 new nav items
- `artifacts/newsroom/src/index.css` — Sprint 18 animations + accessibility

**New docs:**
- `docs/THAI_LOCALIZATION.md`
- `docs/SOURCE_TRUST_SYSTEM.md`
- `docs/TOKEN_SURVIVAL.md`
- `docs/MULTI_SOURCE_INTELLIGENCE.md`
- `docs/VISUAL_HIERARCHY.md`

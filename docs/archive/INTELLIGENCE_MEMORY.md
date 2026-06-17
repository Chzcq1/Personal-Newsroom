# INTELLIGENCE_MEMORY.md — Sprint 10 Adaptive Intelligence System

> **Status:** Sprint 10 — June 2026  
> **Purpose:** Documents the adaptive learning, entity extraction, narrative memory, semantic clustering, feedback loops, and long-term memory architecture.

---

## Overview

Sprint 10 transforms INFOX from a contextually-aware system (Sprint 9) into an adaptively-learning one. The system now:

- **Learns** from user behavior over time
- **Remembers** narrative threads across sessions
- **Understands** entities through alias normalization
- **Clusters** semantically using entity overlap, not just title words
- **Adapts** the feed ranking based on engagement signals
- **Autocorrects** by automatically reducing weight for ignored content

---

## 1. Adaptive Interest Engine (`services/intelligence/adaptiveInterestEngine.ts`)

### Purpose
Dynamically learns entity relationship edges from user behavior — supplementing the static `INTEREST_GRAPH` with observed patterns.

### How it works

**Edge learning:** When a user engages with an article that mentions multiple entities (e.g., MicroStrategy AND Bitcoin AND Coinbase), the system infers a relationship between those entities and records a learned edge with an initial confidence score.

**Confidence scoring:**
| Engagement type | Confidence increment |
|---|---|
| `complete_read` | +0.15 |
| `save` | +0.12 |
| `feedback_positive` | +0.18 |
| `open` | +0.06 |
| `feedback_negative` | -0.20 |

**Decay:** Learned edges decay by 0.05/day of inactivity. Edges below 0.02 effective confidence are pruned. This prevents stale patterns from persisting indefinitely.

**Expansion clusters:** When multiple entities repeatedly co-occur in reads, the system detects "expansion clusters" — auto-inferred concept groups like "Institutional Bitcoin Infrastructure" (MicroStrategy + Coinbase + Bitcoin ETF).

### Public API
```typescript
recordEngagement(entities, type, articleText?)  // log engagement
getLearnedEdges(entityId)                        // edges from this entity
getAdaptiveWeight(from, to)                      // static + learned weight
getExpansionClusters()                           // auto-detected clusters
getAdaptiveSummary()                             // debug snapshot
```

### Storage
In-memory. Interface-compatible with PostgreSQL (see Section 7).  
Max 300 learned edges, 500 engagement history records (ring buffers).

---

## 2. Entity Extraction Pipeline (`services/intelligence/entityExtractor.ts`)

### Purpose
Real entity extraction from article text — replaces simple capitalized-word heuristics with alias-normalized canonical entity recognition.

### Features

**Alias dictionary:** 100+ alias mappings covering:
- Aliases → canonical IDs (e.g., "Fed" / "FOMC" / "Jerome Powell" → `FederalReserve`)
- Paraphrase normalization (e.g., "ChatGPT" → `OpenAI`)
- Ticker symbols (e.g., "NVDA" → `Nvidia`)

**Entity types:** `company | person | government | product | cryptocurrency | institution | index | event | concept`

**Two-pass extraction:**
1. Pass 1: Alias dictionary matching (high confidence: 0.8)
2. Pass 2: Capitalized proper noun detection for unknowns (lower confidence: 0.5, requires 2+ article appearances)

**Paraphrase detection:** Used by narrative clustering to group "Fed raises rates" and "Federal Reserve hikes interest rates" into the same cluster.

### Public API
```typescript
extractEntities(text)                           // single article
extractCorpusEntities(articles)                 // corpus frequency map
areSameEntity(text1, text2)                    // entity overlap check
getCanonicalEntityId(mention)                   // alias → canonical ID
```

---

## 3. Narrative Memory System (`services/intelligence/narrativeMemory.ts`)

### Purpose
Persists narrative threads across sessions (14-day TTL). A "narrative thread" is a story arc that can span days or weeks with multiple source observations.

### Tracking fields per thread

| Field | Description |
|---|---|
| `canonicalHeadline` | Best representative headline |
| `theme` | 2-3 word theme label |
| `dominantEntity` | Primary entity driving the narrative |
| `relatedEntities` | Up to 8 co-occurring entities |
| `developments` | Up to 20 ordered observations |
| `totalMentions` | All-time article count |
| `mentionsLast24h` | Recent activity gauge |
| `maturity` | emerging → active → peaking → declining → resolved |
| `sentimentDirection` | positive / negative / mixed / neutral |
| `trendAcceleration` | Mentions velocity change |
| `milestones` | High-significance events (e.g. "Peak coverage") |

### Narrative matching
New clusters are matched to existing threads via:
1. **Jaccard similarity** on title tokens (threshold: 0.30)
2. **Dominant entity match** — same entity within 72 hours → same thread

### Maturity lifecycle
```
emerging (< 6h) → active → peaking (coverage accelerating) → declining → resolved (no activity)
```

### Public API
```typescript
recordNarrativeCluster(cluster, avgSignalScore)  // ingest from feed pipeline
getActiveNarratives(limit)                       // top N by maturity + score
getNarrativeById(id)                             // specific thread
getNarrativeTimeline(id)                         // ordered developments
getNarrativesForEntity(entityId)                 // threads for entity
getPersistentNarratives()                        // all (including resolved)
getNarrativeMemoryStats()                        // admin snapshot
```

---

## 4. Semantic Clustering Upgrade (`services/intelligence/narrativeCluster.ts`)

### What changed (Sprint 10 Task D)
Jaccard-only similarity → **combined semantic similarity**:

```
combinedSimilarity = Jaccard × 0.5 + entityOverlap × 0.5
```

**Entity overlap:** Two titles sharing canonical entity IDs are scored higher. "Federal Reserve announces rate decision" and "Fed holds rates steady" both extract `FederalReserve` → high entity overlap despite different wording.

**Paraphrase threshold:** Articles where `entityOverlap ≥ 0.5` use a lower clustering threshold (0.15 vs 0.25). Catches paraphrases like:
- "Fed raises rates" / "Federal Reserve hikes interest rates" → same cluster
- "Nvidia H200 chip" / "Jensen Huang announces new GPU" → same cluster

---

## 5. Feed Adaptation Engine (`services/intelligence/feedAdaptationEngine.ts`)

### Purpose
Adaptive ranking layer that re-weights articles based on user engagement history. Implements Tasks E (feed adaptation) and J (quality autocorrection).

### Engagement signals
| Signal | Source | Effect |
|---|---|---|
| `open` | Article click | +0.06/entity |
| `save` | Bookmark action | +0.12/entity |
| `complete_read` | Viewport 100% (extended) | +0.15/entity |
| `skip` | Scroll-past | -0.06/entity |
| `feedback_positive` | "High value" / "More like this" | +0.18–0.20/entity |
| `feedback_negative` | "Less like this" / "Irrelevant" | -0.20–0.25/entity |

### Boost multiplier
Each entity gets a `boostMultiplier` (0.3–2.0, default 1.0). Feed items are re-ranked by `relevanceScore × maxBoostAcrossMatchedEntities`.

**Decay:** Multipliers drift back toward 1.0 at 0.02/day. Prevents old preferences from locking in indefinitely.

### Autocorrection (Task J)
Entities with `ignores ≥ 3` and `engagements = 0` are flagged as autocorrection candidates:
- `suppress` — reduce ranking by 70%
- `reduce` — reduce ranking by 40%  
- `monitor` — flag for user review

Accessible at `GET /api/adaptive/autocorrect`.

---

## 6. Relevance Feedback System (`routes/adaptive.ts` + `my-feed.tsx`)

### UI (Task F)
Each feed card in detailed mode shows a feedback bar (visible on hover):

| Button | Type | Effect |
|---|---|---|
| ★ High value | `high_value` | +0.20 boost per entity |
| ✓ More | `more_like_this` | +0.18 boost per entity |
| ↓ Less | `less_like_this` | -0.20 penalty per entity |
| ✗ Irrelevant | `irrelevant` | -0.25 penalty per entity |

**Design principles:**
- No social mechanics (no public likes, no engagement scores)
- Feedback is purely private and local to this session
- One feedback per article (prevents toggle spam)
- No visible counters or gamification

### API Routes
```
POST /api/adaptive/feedback        — explicit feedback record
POST /api/adaptive/engagement      — implicit signal (open/save/skip)
GET  /api/adaptive/state           — full adaptation state
GET  /api/adaptive/autocorrect     — quality autocorrection hints
GET  /api/adaptive/summary?interests= — learned expansions
```

---

## 7. Long-Term Memory Foundation (`services/intelligence/longTermMemory.ts`)

### Purpose
Defines typed interfaces for all future persistence migration. Sprint 10 runs entirely in-memory. Sprint 11 activates PostgreSQL by setting `DATABASE_URL`.

### Storage phases

| Phase | Storage | Trigger |
|---|---|---|
| 1 (now) | In-memory + localStorage | Default |
| 2 | PostgreSQL via Replit DB | `DATABASE_URL` env var |
| 3 | PostgreSQL + pgvector | `VECTOR_SEARCH=true` |
| 4 | Multi-device distributed | Auth + user model |

### Defined schemas

**`entity_memory`** — structured entity tracking  
**`narrative_threads` + `narrative_developments`** — multi-day narrative arcs  
**`entity_adaptations` + `user_feedback`** — adaptation weights + feedback history  
**`briefing_embeddings`** — vector memory for semantic briefing search (Phase 3)

### Cross-session context
`CrossSessionContext` interface serializes all long-term memory into a portable session bundle. When PostgreSQL is active, this is reconstructed from the DB rather than in-memory stores.

---

## 8. Narrative Timeline View (`/narratives`)

A new page showing all active narrative threads with their development timelines.

**Features:**
- Filter by maturity: all / peaking / active / emerging
- Stats bar: counts by maturity + avg narrative lifespan
- Narrative card: headline, maturity badge, sentiment, 24h mentions, peak signal
- Timeline view: ordered developments with timestamps, sources, signal scores
- Related entity chips
- Milestone markers for significant events

**Routes:** `GET /api/narratives`, `GET /api/narratives/:id`, `GET /api/narratives/:id/timeline`

---

## 9. Entity Relationship Map (`/debug/entities`)

An enhanced debug view showing the full entity intelligence layer.

**Three tabs:**
1. **Entity Memory** — all tracked entities with mentions, trend direction, recent developments
2. **Learned Edges** — adaptive engine's learned relationships with confidence bars
3. **Expansion Clusters** — auto-detected concept clusters from reading behavior

**Routes:** `GET /api/adaptive/state`, `GET /api/debug/entities`

---

## 10. Agent Orchestration Preparation (`services/intelligence/multiAgentPrep.ts`)

### Sprint 10 additions (Task K)

**`SharedAgentMemory`** — snapshot of all long-term memory, distributed to agents before dispatch:
- `activeNarratives` — persistent narrative threads
- `risingEntities` — most active entities in entity memory
- `adaptationBoosts` — user preference weights per entity
- `expandedInterests` — current session interest expansion

**`AgentAnalysisRequestV2`** — extends Sprint 9's request with `sharedMemory` and `narrativeThread` fields.

**`OrchestratorState`** — tracks agent lifecycle: idle → collecting → analyzing → synthesizing.

**Narrative maturity gate** — `isAgentActivationReady()` now blocks agents from activating for `resolved` or `declining` narratives. Only `active` and `peaking` narratives warrant specialist analysis.

---

## Known Limitations

1. **In-memory only:** All adaptive state resets on server restart. Persistence requires Sprint 11's PostgreSQL migration.
2. **Single-user model:** Adaptation state is global (no per-user isolation). Multi-user support requires auth layer.
3. **Entity extraction coverage:** ~100 alias mappings. Unknown entities are detected but with lower confidence. Coverage grows as `ENTITY_ALIAS_MAP` is extended.
4. **Feedback loop latency:** Feedback affects ranking on the _next_ feed request. Current session feed is not re-ranked in real time.
5. **Clustering threshold sensitivity:** The combined Jaccard + entity overlap threshold (0.25 / 0.15 for paraphrases) was calibrated for financial/tech news. Different domains may need tuning.

---

## Recommended Sprint 11

**Focus: Persistence & Multi-User**

1. Activate `DATABASE_URL` → migrate all in-memory stores to PostgreSQL
2. Add Replit Auth → tie adaptation state to user identity
3. Vector embeddings for semantic briefing search (`VECTOR_SEARCH=true`)
4. Cross-session entity memory reconstruction from DB
5. Real-time feed re-ranking (WebSocket or SSE for live updates)
6. Activate Bull/Bear/Macro/Tech/Policy agents using `SharedAgentMemory` as context

---

*Last updated: Sprint 10 — June 2026*

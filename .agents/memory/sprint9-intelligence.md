---
name: Sprint 9 Contextual Intelligence
description: Architecture decisions and key constraints for the interest graph, relevance classifier, narrative clustering, entity memory, taste learning, and multi-agent prep built in Sprint 9.
---

## Key Architecture Decisions

### Interest Graph (interestGraph.ts)
- 47 nodes in INTEREST_GRAPH — static for now, Sprint 10+ work to make dynamic
- BFS expansion up to 2 hops: hop1 weight ×0.7, hop2 weight ×0.4
- `expandInterests(interests[])` returns a Map; call once per request, pass everywhere
- Feed.ts calls `expandInterests()` once then passes the same Map to both `classifyRelevance()` and `getGraphScore()` — do not call it multiple times

### Relevance Classifier (relevanceClassifier.ts)
- 4-tier: direct (combined ≥60 AND directScore ≥20) / contextual (≥30) / weak (≥10) / incidental (<10)
- Combined score = directKeyword(0–80) + graphScore(×60) + entityOverlap(0–30) + sourceModifier(0–15), then ×recencyMod
- interestKeywordMap built from INTEREST_DEFINITIONS in feedGenerator.ts — same keywords used by old system

### Narrative Clustering (narrativeCluster.ts)
- Jaccard similarity on title tokens (4+ char, stop words removed)
- CLUSTER_THRESHOLD = 0.25; MIN_CLUSTER_SIZE = 2
- Greedy single-linkage — does NOT detect paraphrase clusters (limitation)
- `agentContext.canBeSharedBetweenAgents` flag = multi-source AND avgScore > 30

### Entity Memory (entityMemory.ts)
- In-memory Map, 7-day TTL, 15 recent developments per entity
- Trend = rising if last24h/prior24h ≥1.5, declining if ≤0.5
- Auto-detects entities from INTEREST_GRAPH keywords on every article batch
- Resets on server restart — needs PostgreSQL when persistent auth is added

### Personal Context (personalContext.ts)
- Stateless per-request: no session storage, derives fresh from interest graph + taste signal + entity memory
- TasteSignal sent from client localStorage — backend applies boost/penalty without storing it
- Rising entity boost: +8 on top of graph weight boost

### Feed Quality Metrics (feedQualityMetrics.ts)
- Ring buffer 500 records; quality trend compares recent (last24h) vs older (last 20 before 24h cutoff)
- relevanceAccuracy = (direct + contextual) / total × 100

### Multi-Agent Prep (multiAgentPrep.ts)
- Architecture-only — no active agent calls; no AI tokens spent
- isAgentRelevant() gates: bull/bear = isMultiSource only; macro/tech/policy = keyword regex on cluster text
- AGENT_SYSTEM_PROMPTS ready for Sprint 10 orchestrator

### LocalStorage Keys (Sprint 9 additions)
- `ai-newsroom:taste-v1` — TasteEvent[] ring buffer (200 events)

### New API Routes
- GET /api/debug/relevance — overview (graph nodes, entity memory, story evolution)
- POST /api/debug/relevance/test — live relevance test
- GET /api/debug/graph/:interest — graph expansion for one interest
- GET /api/debug/entities — full entity memory snapshot
- GET /api/admin/feed-quality — quality metrics

**Why:** These decisions kept all Sprint 9 intelligence stateless server-side (except entity memory ring buffer) so the system works without a database. Migration path to PostgreSQL is clear when auth is added.

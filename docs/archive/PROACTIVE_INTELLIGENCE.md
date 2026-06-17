# Proactive Intelligence Engine — Sprint 11

## Overview

Sprint 11 adds the **Proactive Intelligence Engine** — a system that detects emerging trends, accelerating narratives, unusual ecosystem activity, and ecosystem shifts _before the user notices them_.

Instead of waiting for the user to search for a topic, INFOX now proactively monitors the information ecosystem and surfaces what matters most, earliest.

---

## Architecture

```
RSS Feed Ingestion
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                  PROACTIVE INTELLIGENCE LAYER                │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────┐               │
│  │ Trend Acceleration│   │ Early Signal     │               │
│  │ Engine (Task A)  │   │ Detector (Task B) │               │
│  └────────┬────────┘    └───────┬──────────┘               │
│           │                     │                            │
│           ▼                     ▼                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Narrative Relationship Engine (Task D)       │    │
│  │    (entity overlap · temporal comovement · chain)   │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│           ┌─────────────┼─────────────┐                     │
│           ▼             ▼             ▼                     │
│  ┌──────────────┐ ┌──────────┐ ┌──────────────────────┐    │
│  │Entity Influence│ │Narrative │ │User Intelligence     │    │
│  │System (Task H) │ │Health    │ │Profile (Task I)      │    │
│  └──────────────┘ │Monitor G │ └──────────────────────┘    │
│                   └──────────┘                               │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────┐
│  Orchestration Layer v1  │  (Task K — interfaces + activation gates only)
│  ProactiveTrigger queue  │
│  EarlySignalAgent        │
│  EcosystemAgent          │
└──────────────────────────┘
```

---

## Services

### A — Trend Acceleration Engine (`trendAcceleration.ts`)
Tracks narrative momentum using a 6-hour sliding window.

**Momentum score (0–100):**
| Range | Meaning |
|-------|---------|
| 80–100 | Peak acceleration — story is exploding |
| 60–80  | Accelerating — story is gaining momentum fast |
| 40–60  | Emerging/growing — story is building |
| 20–40  | Stable/slow — background noise |
| 0–20   | Dormant/declining |

**Classifications:** `emerging` · `accelerating` · `peak` · `declining` · `dormant`

**Velocity formula:**
```
velocity_W = mentions / WINDOW_HOURS     (6h window)
acceleration = (velocity_W - velocity_W-1) / velocity_W-1
```

---

### B — Early Signal Detector (`earlySignalDetector.ts`)
Detects weak signals before they become mainstream.

**Three detection modes:**

| Mode | Trigger |
|------|---------|
| `cross_source_emergence` | Same theme from ≥ 3 distinct sources in < 3h |
| `unusual_repetition` | Entity appears 5× above its rolling 24h baseline in 1h |
| `ecosystem_linkage` | New entity suddenly appears alongside ≥ 2 established entities |

Signals have:
- **Confidence score (0–1)** — decays without new evidence
- **24h TTL** — signals expire if not reinforced
- **`"Early Signal"` badge** — surfaced in the feed when confidence ≥ 0.4

---

### C — Narrative Momentum Scoring (upgrade to `narrativeMemory.ts`)
Each `NarrativeThread` gains:
- `trendAcceleration: number` — computed from mention velocity windows
- `mentionsLast24h` / `mentionsLast7d` — rolling windows
- `maturity` lifecycle: `emerging → active → peaking → declining → resolved`
- `peakScore` / `avgScore` — signal intensity tracking

---

### D — Narrative Relationship Engine (`narrativeRelationshipEngine.ts`)
Builds an ecosystem graph of connected narratives.

**Edge types:**
| Type | Detection |
|------|-----------|
| `entity_overlap` | Jaccard(entitySets) ≥ 0.2 or ≥ 2 shared entities |
| `temporal_comovement` | Recent developments within 6h of each other |
| `entity_chain` | 2-hop entity connection via bridge narrative |
| `causal_inference` | One narrative precedes another (future) |

**Ecosystem detection:** Union-Find on strong edges (strength ≥ 0.25). Ecosystems of ≥ 2 nodes are surfaced.

---

### F — Intelligence Briefing Mode (`/api/intelligence/briefing`)
A strategic analysis data endpoint that synthesizes:
- Major developments (peaking narratives)
- Accelerating trends (top 5 by momentum)
- Early signals (high-confidence)
- Rising entities (24h velocity)
- Top influencers (entity influence tier)
- Ecosystem snapshot (top 3 ecosystems)
- System momentum score (0–100 aggregate)

---

### G — Narrative Health Monitor (`/api/admin/narratives`)
Per-narrative health metrics:

| Metric | Description |
|--------|-------------|
| Momentum | 0–100 composite acceleration score |
| Velocity | Mentions/hour in current window |
| Acceleration | Delta vs prior 6h window |
| Persistence | Age-based persistence score |
| Spread | Unique source count in 24h |
| Saturation | Lifecycle saturation (% toward resolved) |

Frontend: `/admin/narratives`

---

### H — Entity Influence System (`entityInfluence.ts`)
Scores how much each entity _shapes_ other narratives and entities.

**Score components (0–100):**
| Component | Weight | Description |
|-----------|--------|-------------|
| Breadth | 0–35 | Unique entities connected in interest graph |
| Depth | 0–25 | Edge density relative to graph |
| Velocity | 0–20 | 24h vs 7d mention growth rate |
| Spread | 0–15 | Unique topics/narratives entity appears in |
| Centrality | 0–5 | Bridge score (betweenness approximation) |

**Tiers:** `dominant (75+)` · `major (50+)` · `moderate (25+)` · `minor (<25)`

---

### I — User Intelligence Profile (`userIntelligenceProfile.ts`)
Synthesises all behavioral signals into a unified user profile.

**Profile data:**
- `primaryInterests` — top 3 by engagement evidence
- `secondaryInterests` — topics 4–8
- `entityFocusAreas` — entities user engages with most
- `blindSpots` — graph neighbors of interests never engaged
- `readingPattern` — depth/frequency/feedback rate
- `trendPreference` — early signal vs peak narrative preference
- `profileStrength` — 0–100 data richness score

---

### J — Feed Evolution Visualization (`/debug/feed-evolution`)
Developer-facing page showing the live intelligence picture:
- System momentum gauge
- Major developments
- Accelerating narratives
- Early signals panel
- Rising entities
- Entity influence rankings
- Ecosystem connections

---

### K — Agent Orchestration Layer v1 (`multiAgentPrep.ts`)
Sprint 11 adds three new proactive agent roles:

| Role | Activated when |
|------|----------------|
| `proactive` | Narrative momentum ≥ 70 and accelerating |
| `early_signal` | ≥ 2 high-confidence signals burst in 2h |
| `ecosystem` | ≥ 3 narratives form ecosystem with avg strength ≥ 0.3 |

**Trigger types:**
- `momentum_spike` — critical-momentum narrative
- `early_signal_burst` — signal cluster
- `ecosystem_formation` — new connected ecosystem
- `entity_breakthrough` — entity jumps influence tier
- `blind_spot_alert` — user's blind spot is spiking

**Activation gate:** `evaluateProactiveTrigger()` runs without LLM calls and returns sorted `ProactiveTrigger[]` by priority.

---

## API Endpoints

| Route | Description |
|-------|-------------|
| `GET /api/intelligence/trends` | Full trend summary with classifications |
| `GET /api/intelligence/signals` | Active early signals |
| `GET /api/intelligence/signals/stats` | Signal system statistics |
| `GET /api/intelligence/relationships` | Narrative ecosystem graph |
| `GET /api/intelligence/relationships/:id` | Related narratives for one thread |
| `GET /api/intelligence/influence` | Entity influence map |
| `GET /api/intelligence/influence/:entityId` | Single entity influence score |
| `GET /api/intelligence/profile?interests=` | User intelligence profile |
| `GET /api/intelligence/briefing` | Full intelligence briefing data |
| `GET /api/admin/narratives` | Narrative health monitor |
| `GET /api/admin/narratives/stats` | Aggregate narrative statistics |
| `GET /api/admin/narratives/:id/health` | Single narrative health |

---

## Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| Narrative Health Monitor | `/admin/narratives` | Full narrative lifecycle dashboard |
| Feed Evolution | `/debug/feed-evolution` | Intelligence picture for the feed |

---

## Data Flow

```
1. RSS articles ingested via rssService
2. earlySignalDetector.detectSignals(articles) runs on every batch
3. entityMemory.recordEntityMentions(articles) records entity activity
4. narrativeCluster groups articles → narrativeMemory.recordNarrativeCluster
5. trendAcceleration.recordNarrativeMention seeds velocity windows
6. buildTrendSummary() computes momentum for all active threads
7. buildNarrativeGraph() finds ecosystem connections
8. buildInfluenceMap() scores entity influence
9. evaluateProactiveTrigger() decides if agent layer should activate
10. /api/intelligence/briefing synthesises all layers for the frontend
```

---

## Memory Architecture

All Sprint 11 services use **in-memory ring buffers** with TTL eviction:

| Service | TTL | Max entries |
|---------|-----|-------------|
| Trend velocity windows | Unbounded (ring buffer) | 500/narrative |
| Early signals | 24h | 100 signals |
| Narrative graph | 6h cache | All active threads |
| Entity influence | On-demand | All tracked entities |

---

## Integration with Previous Sprints

Sprint 11 builds on:
- **Sprint 9** — Interest graph (BFS expansion), entity memory, narrative clusters
- **Sprint 10** — Narrative memory (persistent threads), adaptive engine, entity extractor
- **Sprint 8** — Alert engine, delivery metrics
- **Sprint 7** — Bloomberg aesthetic, source branding

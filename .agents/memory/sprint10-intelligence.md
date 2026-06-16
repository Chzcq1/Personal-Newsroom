---
name: Sprint 10 Adaptive Intelligence
description: Adaptive interest engine, entity extraction, narrative memory, semantic clustering upgrade, feedback UI, new pages, long-term memory interfaces, agent contracts
---

## Key services added (`services/intelligence/`)

- `adaptiveInterestEngine.ts` — learns pairwise entity edges from engagement; confidence decay 0.05/day; max 300 edges
- `entityExtractor.ts` — 100+ alias mappings (e.g. "Fed" → FederalReserve); two-pass extraction; `areSameEntity()` used by clustering
- `narrativeMemory.ts` — 14-day thread persistence, max 150 threads; maturity: emerging→active→peaking→declining→resolved; `recordNarrativeCluster()` called from feed route
- `feedAdaptationEngine.ts` — Tasks E + J combined; `applyAdaptiveRanking()` and `getAutocorrectionSuggestions()`; boost range 0.3–2.0; decay 0.02/day

## Semantic clustering upgrade
`narrativeCluster.ts` now uses: `combinedSimilarity = Jaccard × 0.5 + entityOverlap × 0.5`
Paraphrase threshold = 0.15 (vs 0.25 default) when `entityOverlap ≥ 0.5`

## New routes
- `routes/adaptive.ts` — `/api/adaptive/feedback`, `/engagement`, `/state`, `/autocorrect`, `/summary`
- `routes/narratives.ts` — `/api/narratives`, `/:id`, `/:id/timeline`, `/entity/:id`, `/stats`
Both registered in `routes/index.ts`

## New frontend pages
- `pages/narratives.tsx` — `/narratives` — narrative timeline view, maturity filters, stats bar, detail drill-down
- `pages/debug/entities.tsx` — `/debug/entities` — 3 tabs: Entity Memory, Learned Edges, Expansion Clusters
Both registered in `App.tsx`

## Feedback UI (Task F)
`FeedbackBar` component in `my-feed.tsx` detailed mode (hover-revealed); 4 buttons: High value / More / Less / Irrelevant; POST to `/api/adaptive/feedback`; one feedback per article

## Agent orchestration (Task K)
`multiAgentPrep.ts` now imports `NarrativeThread` + `EntityMemoryEntry`; adds `SharedAgentMemory`, `AgentAnalysisRequestV2`, `OrchestratorState` interfaces; `isAgentActivationReady()` gates on narrative maturity

## Long-term memory (Task I)
`longTermMemory.ts` — architecture only; PostgreSQL schemas defined; `getMigrationStatus()`, `isPostgresAvailable()`; activated by setting `DATABASE_URL`

## Documentation
- `docs/INTELLIGENCE_MEMORY.md` (new) — full Sprint 10 reference
- `docs/ARCHITECTURE.md` — Sprint 10 section added
- `docs/AGENT_ARCHITECTURE.md` — Sprint 10 update section added
- `docs/CHANGELOG.md` — Sprint 10 entry prepended

**Why:** closing the behavior loop — system now learns from what users actually read, not just declared interests

---
name: Sprint 11 Proactive Intelligence
description: Trend acceleration, early signal detection, narrative relationships, entity influence, user profile — all in-memory services wired to /api/intelligence/* routes
---

# Sprint 11 — Proactive Intelligence Engine

## Interest graph structure
`INTEREST_GRAPH[key]` has shape `{ label, coreKeywords, related: GraphEdge[] }` where `GraphEdge = { target: string, weight: number }`. Never use `node.edges` — that property does not exist. Always use `node.related.map(e => e.target)`.

## Entity memory exports
Correct export is `getAllTrackedEntities()` from `entityMemory.ts`. There is no `getAllEntityMemory`.

## feedAdaptationEngine.getAdaptationState()
Returns `{ totalEntities, boosted, suppressed, neutral, totalFeedback, positiveFeedback, negativeFeedback, topBoosted: EntityAdaptation[], topSuppressed: EntityAdaptation[], autocorrectionCandidates }`. No `entityAdaptations` array directly — use `topBoosted` + `topSuppressed`.

## Services added
| Service | File | Key export |
|---------|------|-----------|
| Trend acceleration | `trendAcceleration.ts` | `buildTrendSummary()`, `computeNarrativeTrend()`, `recordNarrativeMention()` |
| Early signals | `earlySignalDetector.ts` | `detectSignals()`, `getActiveSignals()`, `isEarlySignalArticle()` |
| Narrative graph | `narrativeRelationshipEngine.ts` | `buildNarrativeGraph()`, `getRelatedNarratives()` |
| Entity influence | `entityInfluence.ts` | `buildInfluenceMap()`, `computeEntityInfluence()` |
| User profile | `userIntelligenceProfile.ts` | `buildIntelligenceProfile(declaredInterests[])` |

## Routes added
- `proactiveIntelligence.ts` → `/api/intelligence/*` (7 endpoints)
- `adminNarratives.ts` → `/api/admin/narratives/*` (3 endpoints)
Both registered in `routes/index.ts`.

## Frontend pages added
- `/admin/narratives` → `pages/admin/narratives.tsx` — Narrative Health Monitor
- `/debug/feed-evolution` → `pages/debug/feed-evolution.tsx` — Feed Evolution Intelligence
Both registered in `App.tsx`.

## Empty state behavior
Intelligence services start empty on every server restart (in-memory). Data populates after the personal feed is loaded (`/my-feed`) which triggers entity extraction, narrative clustering, and signal detection. This is expected behavior — not a bug.

## multiAgentPrep.ts
Sprint 11 adds `ProactiveTrigger` interface, `evaluateProactiveTrigger()`, 3 new agent roles (`proactive`, `early_signal`, `ecosystem`), and `buildSharedMemory()`. File was rewritten to remove duplicate `isAgentRelevant` function (was defined twice in Sprint 10 version — TypeScript would reject it).

## summaryService.ts crash fix
Added `.catch()` to the `.then()` chain on `providerPromise` in `getProvider()`. Without this, a missing AI provider token caused an unhandled promise rejection that crashed Node 20. The fix also resets `providerPromise = null` on failure so the next request retries.

**Why:** Node 20 treats unhandled promise rejections as fatal by default. The `.then()` without `.catch()` on a rejected promise creates an unhandled rejection even if `await getProvider()` downstream catches it.

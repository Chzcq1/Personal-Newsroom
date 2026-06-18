---
name: Sprint 29 Real-Time Trend Intelligence
description: Entity graph, trend fusion, feed momentum boost, trend cards, discovery engine, feed memory
---

# Sprint 29 — Real-Time Trend Intelligence

## What was built

### New services (backend)
- `services/trendGraph/entityRelations.ts` — 34 entity nodes, 197 bidirectional edges (Nvidia→AI→GPU→OpenAI etc.)
- `services/trendGraph/entityGraph.ts` — BFS expansion with hop decay; `expandEntity(id, depth)`, `expandEntities(ids)`, `getRelatedEntities(ids)`, `scoreTextAgainstGraph(text, map)`
- `services/trendGraph/trendFusion.ts` — `matchArticleToTrends()`, `buildTrendMeta()`, `buildDiscoveryInjections()`, `fuseByEntityGraph()`
- `services/feedMemory.ts` — lightweight ring-buffer engagement tracking; `recordFeedEvent()`, `predictEngagement()`, `getMemoryStats()`

### Upgraded services (backend)
- `services/socialAdapters/googleTrendsAdapter.ts` — added `getDailyTrends(geo)`, `getRealtimeTrends(geo)`, `getTrendingSearchesByRegion(regions[])`, keyword extraction
- `services/socialAdapters/redditAdapter.ts` — added keyword velocity tracking, subreddit acceleration, cross-subreddit detection; `getMomentumKeywords()`, `getCrossSubredditTrends()`

### New/upgraded routes
- `routes/feed.ts` — added `trendMeta: TrendMeta | null` to `PersonalFeedItem`; cross-references articles with `getRecentTrends(100)` + `matchArticleToTrends()`; applies momentum boost to `boostedScore` (+max 30 pts); added `POST /feed/memory` and `GET /feed/memory/stats`
- `routes/trends.ts` — added `GET /trends/daily`, `GET /trends/daily/multi`, `GET /trends/momentum`, `GET /trends/graph`, `GET /trends/discovery`

### Frontend
- `pages/my-feed.tsx` — added `TrendMeta` type to `FeedItem`; new `TrendMetaBar` component (gradient momentum bar + platform spread + region flags + whyTrending); `FeedCard` uses real trendMeta when available, falls back to derived signal score; summary row shows `🔥 N trending` count

## Key contracts

### TrendMeta shape
```typescript
{
  momentumScore: number;      // 0-100
  momentumLabel: "exploding" | "rising" | "stable" | "fading";
  platforms: string[];        // from active trend sources
  regions: string[];          // "Thailand", "Global", etc.
  whyTrending: string;        // human-readable "Trending on reddit · Fed in focus"
  discussionCount: number;    // total engagement from matched trends
  adjacentEntities: string[]; // entity graph neighbors
  matchedTrends: number;      // how many active trends matched
}
```

### Matching threshold
- `matchArticleToTrends()` returns match if `totalScore >= 0.18`
- Score = wordOverlap(0-0.5) + entityTagOverlap(0-N*0.2) + topicMatch(0.2) + graphBonus(0-0.15)
- Momentum boost: `topMatchScore * 30` added to boostedScore

## What to know
- Token safety: all trend intelligence is rule-based, zero LLM calls
- Reddit keyword velocity tracking resets every 15 min (window rotation)
- Discovery descriptions in Thai in `entityGraph.ts` → `DISCOVERY_DESCRIPTIONS`
- The trend cache is populated by the 15-min worker; on fresh start it's empty until first worker run or manual POST /trends/ingest
- Entity graph edge count: 34 nodes, 197 edges (bidirectional = counted both ways)

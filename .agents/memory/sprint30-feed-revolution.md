---
name: Sprint 30 Feed Revolution
description: Trend-first feed architecture bugs, fixes, and performance decisions
---

## Key Bugs Fixed

**groupKey mismatch**: `trendGroups.get(keyword)!` must be `trendGroups.get(groupKey)!` because the Map key changed to `${topicId}:${keyword}` but the get() still used old `keyword` variable.

**Loop variable shadowing**: The `for (const [keyword, group] of trendGroups)` loop — `keyword` is the full groupKey string (`ai:ai`), NOT the entity keyword. Always use `group.keyword` for title/hook/personalization. Rename the loop variable to `_groupKey` to avoid confusion.

**TREND_MATCH_THRESHOLD removed**: Was deleted from feedAssembler constants but left as a reference in the filter. Replacement: `matchArticleToTrends` already filters internally at 0.18; just use all returned matches.

**BottomNav import**: `BottomNav` uses named export (`export function BottomNav()`), not default. Import must be `import { BottomNav } from "@/components/BottomNav"`.

## Architecture Decisions

**Article cache** (5-min TTL per topic): Added in-memory `articleCache` Map in `feedAssembler.ts`. Cold load: ~3.5s. Warm load: ~1ms. Without this, every page load fetches all RSS feeds live.

**Startup trend warm-up**: Added `ingestAllProviders()` call (non-blocking) in `index.ts` after server starts. Without this, after every API server restart, `activeTrends: 0` and all cards become article-type (no trend grouping possible). Logs: `[Startup] Trend cache warmed`.

**Deduplication**: Same keyword can appear across multiple topicIds (e.g., `ai:ai`, `stocks:ai`, `technology:ai` all humanize to "Artificial Intelligence"). Deduplicate by `trendKeyword.toLowerCase()` after building trend cards, keeping highest personalScore card and merging articles from duplicates.

**How to apply**: Any time feedAssembler is modified, check (1) groupKey vs keyword variable name, (2) deduplication is downstream of grouping, (3) cache TTL is 5min matching RSS freshness.

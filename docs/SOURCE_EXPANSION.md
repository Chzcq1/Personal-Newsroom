# Source Expansion Foundation

Sprint 17 prepares INFOX for ingestion beyond RSS feeds. The architecture is ready for Reddit, Twitter/X, YouTube transcripts, SEC filings, and research papers.

## The Problem

RSS-only coverage has structural gaps:

- **Speed**: RSS feeds lag 15–60 minutes behind live social signals
- **Coverage**: Many early signals originate on Reddit/Twitter before they reach press
- **Breadth**: SEC filings and research papers never appear in RSS

## Architecture

### Unified Source Contract

All source adapters implement `ISourceAdapter`:

```typescript
interface ISourceAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly tier: "A" | "B" | "C" | "unverified";
  readonly isEnabled: boolean;

  fetch(topics: string[]): Promise<NormalizedArticle[]>;
  health(): Promise<{ ok: boolean; latencyMs: number; reason?: string }>;
}
```

### Normalized Article

Every adapter produces `NormalizedArticle` with unified fields:

| Field | Description |
|-------|-------------|
| `id` | Stable dedup ID (`source::hash`) |
| `title` | Article/post title |
| `summary` | Max 600 chars |
| `url` | Canonical URL |
| `source` | Adapter ID: `reddit`, `rss`, `twitter` |
| `sourceName` | Human label: `r/investing`, `Reuters` |
| `language` | `th` \| `en` \| `other` |
| `topicTags` | Normalised topic tags |
| `entityTags` | Extracted entity names |
| `signalScore` | 0–100 pre-LLM heuristic |
| `confidence` | Source confidence metadata |

### Source Confidence

```typescript
interface SourceConfidence {
  tier: "A" | "B" | "C" | "unverified";
  reliability: number;          // 0–1
  latencyMs: number;
  isMultiSource: boolean;
  sourceCount: number;
  engagementSignal?: number;   // upvotes/likes normalised 0–100
}
```

## Implemented Adapters

### Reddit Source Adapter (Sprint 17 Task E)
- Monitors 10 subreddits: investing, wallstreetbets, stocks, MachineLearning, CryptoCurrency, geopolitics, technology, worldnews, economics, artificial
- Uses Reddit's public JSON API (no auth required)
- Filters by: minimum score, minimum comments, noise patterns
- Engagement signal: log-scale normalisation of `score + num_comments`
- Tier: B (quality subreddits) or C (speculative subreddits)

### Twitter/X Signal Adapter (Sprint 17 Task F)
- Architecture ready — requires `TWITTER_BEARER_TOKEN` environment variable
- Currently: disabled (returns empty array when no token)
- When enabled: searches recent tweets with engagement filters
- Tracks trending entities via `AccelerationWindow` (mentions/hour velocity)
- Tier: A/B/C based on author follower count

## Planned Adapters (Future Sprints)

| Source | Status | Notes |
|--------|--------|-------|
| YouTube transcripts | Planned | Requires YouTube Data API v3 |
| SEC/EDGAR filings | Planned | Public API — no auth required |
| Research papers (arXiv) | Planned | Public API |
| TikTok metadata | Planned | Complex — TikTok API restrictions |
| Facebook public pages | Planned | Requires Graph API token |

## Aggregate Ingestion

`fetchFromAllSources(topics)` fetches from all enabled adapters in parallel, merges results, and deduplicates by URL:

```typescript
const { articles, adapterStats } = await fetchFromAllSources(["ai", "crypto"]);
```

## Files

- Unified contract: `artifacts/api-server/src/services/sources/sourceAdapter.ts`
- Reddit adapter: `artifacts/api-server/src/services/sources/redditSourceAdapter.ts`
- Twitter adapter: `artifacts/api-server/src/services/sources/twitterSignalAdapter.ts`
- Admin route: `GET /api/admin/sources`

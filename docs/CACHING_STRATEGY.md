# Intelligence Caching Strategy

Sprint 17 introduces **Intelligence Cache** — a typed, TTL-based, LRU-evicting cache for AI-generated content. The goal: never pay twice for the same intelligence.

## Cache Types and TTLs

| Type | Key Pattern | TTL | Description |
|------|------------|-----|-------------|
| `briefing` | `briefing:topic:mode:lang` | 30 min | Full briefing content |
| `narrative` | `narrative:cluster-id` | 60 min | Narrative cluster summary |
| `insights` | `insights:topic:period` | 45 min | Strategic insight blocks |
| `signal_score` | `signal:article-hash` | 15 min | Pre-computed signal scores |
| `source_health` | `source:id` | 5 min | Source reliability snapshot |

## Stale-With-Grace

Every cache entry has two expiry times:

- **TTL** (`expiresAt`): The time after which content is officially stale
- **Grace period** (`staleUntil`): 15 extra minutes during which stale content can still be served while a background refresh runs

This pattern prevents cache stampedes when many users request the same briefing simultaneously.

## LRU Eviction

The cache is capped at 500 entries. When the limit is reached, the least-recently-used entry is evicted. The LRU order is tracked via `lastAccessedAt` on every `get()` call.

## Hit Ratio Analytics

The cache tracks:
- `hits` — how many times valid cached content was returned
- `misses` — how many times the cache was empty (LLM call needed)
- `staleHits` — how many times stale-with-grace content was served
- `evictions` — how many LRU evictions occurred

Available via `GET /api/admin/intelligence-cache`.

## Estimated Token Savings

Based on average briefing size (3,000 tokens) and a 30-minute TTL with 5 users/day per topic:
- Without cache: 5 × 3,000 = **15,000 tokens/topic/day**
- With cache (avg 60% hit rate): 2 × 3,000 = **6,000 tokens/topic/day**
- **Saving: ~60% on repeated briefing requests**

## Usage

```typescript
import { cacheGet, cacheSet, invalidateCluster } from
  "@/services/cache/intelligenceCache";

// Read
const cached = cacheGet("briefing", key);
if (cached) return cached.value;

// Write
cacheSet("briefing", key, { content, signalScore: 75 });

// Invalidate (when narrative cluster updates)
invalidateCluster("narrative-cluster-abc");
```

## Files

- Cache: `artifacts/api-server/src/services/cache/intelligenceCache.ts`
- Admin route: `GET /api/admin/intelligence-cache`

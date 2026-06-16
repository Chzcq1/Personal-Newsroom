// ============================================================
// INTELLIGENCE CACHE — Sprint 17 Task C
//
// Caches expensive intelligence outputs so they are not
// regenerated on every request.
//
// Cached: narrative summaries · confidence analysis ·
//         strategic context · action insights · Telegram briefings
//
// Cache key includes: signal mode · personality · language ·
//                     maturity level · topic cluster
// ============================================================

// ── Types ──────────────────────────────────────────────────────

export type CachedIntelligenceType =
  | "narrative_summary"
  | "confidence_analysis"
  | "strategic_context"
  | "action_insight"
  | "telegram_briefing"
  | "topic_cluster";

export interface IntelligenceCacheKey {
  type: CachedIntelligenceType;
  clusterKey: string;          // normalised cluster/narrative ID
  signalMode: string;          // safe | balanced | raw
  personality?: string;        // default | tech | economic | executive
  language?: string;           // th | en
  maturityStage?: string;      // emerging | active | peaking | declining
}

export interface IntelligenceCacheEntry<T = unknown> {
  key: string;
  data: T;
  type: CachedIntelligenceType;
  createdAt: number;
  expiresAt: number;
  hits: number;
  staleSince?: number;         // when it became stale (for refresh support)
}

// ── TTL policies (ms) ─────────────────────────────────────────

const TTL_POLICIES: Record<CachedIntelligenceType, number> = {
  narrative_summary:  30 * 60 * 1000,  // 30 min — narratives evolve slowly
  confidence_analysis: 15 * 60 * 1000, // 15 min — confidence data is fresher
  strategic_context:  45 * 60 * 1000,  // 45 min — strategic context is stable
  action_insight:     20 * 60 * 1000,  // 20 min — action insights change with news
  telegram_briefing:  60 * 60 * 1000,  // 60 min — full briefings are expensive
  topic_cluster:      10 * 60 * 1000,  // 10 min — topic clusters refresh often
};

const STALE_GRACE_MS = 5 * 60 * 1000; // allow stale serving for 5 min while refreshing

// ── State ──────────────────────────────────────────────────────

interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  evictions: number;
  writes: number;
}

const cache = new Map<string, IntelligenceCacheEntry>();
const stats: CacheStats = { hits: 0, misses: 0, staleHits: 0, evictions: 0, writes: 0 };

const MAX_ENTRIES = 500;

// ── Key builder ───────────────────────────────────────────────

function buildKey(keyObj: IntelligenceCacheKey): string {
  const parts = [
    keyObj.type,
    keyObj.clusterKey.toLowerCase().replace(/\s+/g, "-").slice(0, 80),
    keyObj.signalMode,
    keyObj.personality ?? "default",
    keyObj.language ?? "th",
    keyObj.maturityStage ?? "any",
  ];
  return parts.join("::");
}

// ── Eviction ──────────────────────────────────────────────────

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt + STALE_GRACE_MS) {
      cache.delete(key);
      stats.evictions++;
    }
  }
}

function evictLRU(): void {
  // Remove the entry with the oldest createdAt
  let oldest: [string, IntelligenceCacheEntry] | null = null;
  for (const entry of cache.entries()) {
    if (!oldest || entry[1].createdAt < oldest[1].createdAt) {
      oldest = entry;
    }
  }
  if (oldest) {
    cache.delete(oldest[0]);
    stats.evictions++;
  }
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Store intelligence output in cache.
 */
export function cacheIntelligence<T>(
  keyObj: IntelligenceCacheKey,
  data: T,
): void {
  evictExpired();
  if (cache.size >= MAX_ENTRIES) evictLRU();

  const key = buildKey(keyObj);
  const now = Date.now();
  const ttl = TTL_POLICIES[keyObj.type];

  cache.set(key, {
    key,
    data,
    type: keyObj.type,
    createdAt: now,
    expiresAt: now + ttl,
    hits: 0,
  });

  stats.writes++;
}

/**
 * Retrieve cached intelligence.
 * Returns null on cache miss.
 * Returns stale data (with staleSince set) if within grace period.
 */
export function getCachedIntelligence<T>(
  keyObj: IntelligenceCacheKey,
): { data: T; isStale: boolean } | null {
  const key = buildKey(keyObj);
  const entry = cache.get(key) as IntelligenceCacheEntry<T> | undefined;

  if (!entry) {
    stats.misses++;
    return null;
  }

  const now = Date.now();

  if (now > entry.expiresAt + STALE_GRACE_MS) {
    // Fully expired — beyond grace period
    cache.delete(key);
    stats.misses++;
    return null;
  }

  entry.hits++;

  if (now > entry.expiresAt) {
    // Stale but within grace period
    entry.staleSince = entry.staleSince ?? entry.expiresAt;
    stats.staleHits++;
    return { data: entry.data, isStale: true };
  }

  stats.hits++;
  return { data: entry.data, isStale: false };
}

/**
 * Invalidate a specific cache key.
 */
export function invalidateCacheKey(keyObj: IntelligenceCacheKey): void {
  const key = buildKey(keyObj);
  cache.delete(key);
}

/**
 * Invalidate all cache entries for a given cluster key.
 */
export function invalidateCluster(clusterKey: string): void {
  const normalised = clusterKey.toLowerCase().replace(/\s+/g, "-").slice(0, 80);
  for (const key of cache.keys()) {
    if (key.includes(`::${normalised}::`)) {
      cache.delete(key);
    }
  }
}

/**
 * Get cache statistics for observability.
 */
export function getIntelligenceCacheStats(): {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  staleHits: number;
  evictions: number;
  writes: number;
  hitRatio: number;
  byType: Record<CachedIntelligenceType, number>;
} {
  evictExpired();

  const total = stats.hits + stats.misses;
  const hitRatio = total > 0 ? stats.hits / total : 0;

  const byType: Record<string, number> = {};
  for (const entry of cache.values()) {
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;
  }

  return {
    size: cache.size,
    maxSize: MAX_ENTRIES,
    hits: stats.hits,
    misses: stats.misses,
    staleHits: stats.staleHits,
    evictions: stats.evictions,
    writes: stats.writes,
    hitRatio: Math.round(hitRatio * 100) / 100,
    byType: byType as Record<CachedIntelligenceType, number>,
  };
}

/**
 * Full cache list for admin inspection.
 */
export function getCacheEntries(): Array<{
  key: string;
  type: string;
  createdAt: string;
  expiresAt: string;
  hits: number;
  isStale: boolean;
}> {
  evictExpired();
  const now = Date.now();
  return [...cache.values()].map((e) => ({
    key: e.key,
    type: e.type,
    createdAt: new Date(e.createdAt).toISOString(),
    expiresAt: new Date(e.expiresAt).toISOString(),
    hits: e.hits,
    isStale: now > e.expiresAt,
  }));
}

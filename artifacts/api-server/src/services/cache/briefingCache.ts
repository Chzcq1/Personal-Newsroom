// ============================================================
// BRIEFING CACHE — Sprint 5 Task A
//
// Global in-memory cache. Same topic + same hour = same briefing.
// Cache duration: 60 minutes.
// Key: "{topicId}:{YYYY-MM-DD-HH}"
//
// Metrics tracked:
//   hits    — requests served from cache
//   misses  — requests that required fresh AI generation
// ============================================================

import { logger } from "../../lib/logger.js";

const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

interface CacheEntry {
  briefing: string;
  generatedAt: Date;
  expiresAt: Date;
  topicId: string;
  articleCount: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  currentEntries: number;
}

// ── In-memory store ──────────────────────────────────────────

const store = new Map<string, CacheEntry>();
let totalHits = 0;
let totalMisses = 0;

// ── Key generation ───────────────────────────────────────────

function hourKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const h = String(now.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${d}-${h}`;
}

function cacheKey(topicId: string): string {
  return `${topicId}:${hourKey()}`;
}

// ── Eviction ─────────────────────────────────────────────────

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt.getTime() < now) {
      store.delete(key);
    }
  }
}

// ── Public API ───────────────────────────────────────────────

/**
 * Returns cached briefing if it exists and has not expired.
 * Returns null on cache miss.
 */
export function getCachedBriefing(topicId: string): CacheEntry | null {
  evictExpired();
  const key = cacheKey(topicId);
  const entry = store.get(key);

  if (entry && entry.expiresAt.getTime() > Date.now()) {
    totalHits++;
    logger.info({ topicId, key, generatedAt: entry.generatedAt }, "Briefing cache HIT");
    return entry;
  }

  totalMisses++;
  logger.info({ topicId, key }, "Briefing cache MISS");
  return null;
}

/**
 * Store a fresh briefing in the cache for the current hour.
 */
export function cacheBriefing(
  topicId: string,
  briefing: string,
  articleCount: number,
): void {
  evictExpired();
  const key = cacheKey(topicId);
  const now = new Date();
  const entry: CacheEntry = {
    briefing,
    generatedAt: now,
    expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
    topicId,
    articleCount,
  };
  store.set(key, entry);
  logger.info({ topicId, key, expiresAt: entry.expiresAt }, "Briefing cached");
}

/**
 * Returns cache hit rate and current entry count.
 */
export function getCacheMetrics(): CacheMetrics {
  evictExpired();
  const total = totalHits + totalMisses;
  return {
    hits: totalHits,
    misses: totalMisses,
    hitRate: total === 0 ? 0 : Math.round((totalHits / total) * 100),
    currentEntries: store.size,
  };
}

/**
 * Returns all active cache entries (for admin dashboard).
 */
export function getCacheEntries(): Array<{
  topicId: string;
  generatedAt: string;
  expiresAt: string;
  articleCount: number;
}> {
  evictExpired();
  return Array.from(store.values()).map((e) => ({
    topicId: e.topicId,
    generatedAt: e.generatedAt.toISOString(),
    expiresAt: e.expiresAt.toISOString(),
    articleCount: e.articleCount,
  }));
}

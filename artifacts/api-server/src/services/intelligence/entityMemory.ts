// ============================================================
// ENTITY MEMORY SYSTEM — Sprint 9 Task G
//
// Persistent entity tracking layer.
// Extends Sprint 8 storyEvolution with:
//   - Trend direction (up / down / stable)
//   - Recent development log per entity
//   - Related entity network snapshot
//   - Appearance frequency across sessions
//
// Entities are auto-detected from article titles.
// Tracked entities: any node in INTEREST_GRAPH + watchlist terms.
//
// Storage: in-memory. Sprint 9 migration path → PostgreSQL.
// TTL: 7 days per entity (168h).
// ============================================================

import { INTEREST_GRAPH } from "./interestGraph.js";
import { logger } from "../../lib/logger.js";
import type { RssArticle } from "../news/rssService.js";

export type TrendDirection = "rising" | "stable" | "declining";

export interface EntityMemoryEntry {
  entityId: string;
  label: string;
  mentions: number;
  mentionsLast24h: number;
  mentionsLast7d: number;
  trendDirection: TrendDirection;
  recentDevelopments: Array<{
    headline: string;
    source: string | null;
    recordedAt: string;
    relevance: "high" | "medium" | "low";
  }>;
  relatedEntities: string[];
  firstSeen: string;
  lastSeen: string;
  expiresAt: string;
}

// ── Store ────────────────────────────────────────────────────

const ENTITY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_DEVELOPMENTS_PER_ENTITY = 15;

const entityStore = new Map<string, EntityMemoryEntry>();

// Mention history for trend calculation (timestamp array)
const mentionHistory = new Map<string, number[]>(); // entityId → timestamps

// ── Helpers ──────────────────────────────────────────────────

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of entityStore.entries()) {
    if (new Date(entry.expiresAt).getTime() < now) {
      entityStore.delete(key);
      mentionHistory.delete(key);
    }
  }
}

function calculateTrend(timestamps: number[]): TrendDirection {
  const now = Date.now();
  const last24h = timestamps.filter((t) => t >= now - 86_400_000).length;
  const prior24h = timestamps.filter(
    (t) => t >= now - 172_800_000 && t < now - 86_400_000,
  ).length;

  if (prior24h === 0) return last24h > 0 ? "rising" : "stable";
  const ratio = last24h / prior24h;
  if (ratio >= 1.5) return "rising";
  if (ratio <= 0.5) return "declining";
  return "stable";
}

function detectRelevance(
  article: RssArticle,
  entityId: string,
): "high" | "medium" | "low" {
  const title = article.title.toLowerCase();
  const node = INTEREST_GRAPH[entityId];
  if (!node) return "low";

  const keywordHits = node.coreKeywords.filter((kw) =>
    title.includes(kw.toLowerCase()),
  ).length;

  if (keywordHits >= 2) return "high";
  if (keywordHits === 1) return "medium";
  return "low";
}

// ── Entity extraction ─────────────────────────────────────────

function detectEntitiesInArticle(article: RssArticle): string[] {
  const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
  const found: string[] = [];

  for (const [entityId, node] of Object.entries(INTEREST_GRAPH)) {
    for (const kw of node.coreKeywords) {
      if (text.includes(kw.toLowerCase())) {
        found.push(entityId);
        break;
      }
    }
  }

  return found;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Record entity mentions from a batch of articles.
 * Automatically detects entities via INTEREST_GRAPH keywords.
 */
export function recordEntityMentions(articles: RssArticle[]): void {
  evictExpired();
  const now = Date.now();
  const expire = new Date(now + ENTITY_TTL_MS).toISOString();

  for (const article of articles) {
    const entities = detectEntitiesInArticle(article);

    for (const entityId of entities) {
      const node = INTEREST_GRAPH[entityId];
      if (!node) continue;

      const history = mentionHistory.get(entityId) ?? [];
      history.push(now);
      // Prune old entries (>7 days)
      const pruned = history.filter((t) => t >= now - ENTITY_TTL_MS);
      mentionHistory.set(entityId, pruned);

      const existing = entityStore.get(entityId);
      const last24h = pruned.filter((t) => t >= now - 86_400_000).length;
      const last7d = pruned.length;
      const trend = calculateTrend(pruned);
      const relevance = detectRelevance(article, entityId);

      if (existing) {
        existing.mentions += 1;
        existing.mentionsLast24h = last24h;
        existing.mentionsLast7d = last7d;
        existing.trendDirection = trend;
        existing.lastSeen = new Date(now).toISOString();
        existing.expiresAt = expire;

        // Add development if not already recorded
        const isDupe = existing.recentDevelopments.some(
          (d) => d.headline === article.title,
        );
        if (!isDupe) {
          existing.recentDevelopments.push({
            headline: article.title,
            source: article.source ?? null,
            recordedAt: new Date(now).toISOString(),
            relevance,
          });
          // Keep newest MAX_DEVELOPMENTS_PER_ENTITY
          if (existing.recentDevelopments.length > MAX_DEVELOPMENTS_PER_ENTITY) {
            existing.recentDevelopments.shift();
          }
        }
      } else {
        entityStore.set(entityId, {
          entityId,
          label: node.label,
          mentions: 1,
          mentionsLast24h: last24h,
          mentionsLast7d: last7d,
          trendDirection: trend,
          recentDevelopments: [{
            headline: article.title,
            source: article.source ?? null,
            recordedAt: new Date(now).toISOString(),
            relevance,
          }],
          relatedEntities: node.related.map((e) => e.target),
          firstSeen: new Date(now).toISOString(),
          lastSeen: new Date(now).toISOString(),
          expiresAt: expire,
        });
        logger.debug({ entityId }, "Entity memory: new entity tracked");
      }
    }
  }
}

/**
 * Get memory entry for a specific entity.
 */
export function getEntityMemory(entityId: string): EntityMemoryEntry | null {
  evictExpired();
  return entityStore.get(entityId) ?? null;
}

/**
 * Get all tracked entities, sorted by recent activity.
 */
export function getAllTrackedEntities(): EntityMemoryEntry[] {
  evictExpired();
  return [...entityStore.values()].sort(
    (a, b) => b.mentionsLast24h - a.mentionsLast24h,
  );
}

/**
 * Get entity context string for a set of interests (for AI injection).
 */
export function getEntityContextForInterests(interests: string[]): string {
  evictExpired();
  const relevant = interests
    .map((i) => entityStore.get(i))
    .filter(Boolean) as EntityMemoryEntry[];

  if (relevant.length === 0) return "";

  const lines = ["[Entity Memory]"];
  for (const entry of relevant.slice(0, 5)) {
    const trend = entry.trendDirection === "rising" ? "↑" : entry.trendDirection === "declining" ? "↓" : "→";
    lines.push(`${entry.label} ${trend} (${entry.mentionsLast24h} mentions/24h)`);
    const latestDev = entry.recentDevelopments[entry.recentDevelopments.length - 1];
    if (latestDev) {
      lines.push(`  Latest: ${latestDev.headline}`);
    }
  }

  return lines.join("\n");
}

/**
 * Get rising entities (trend: rising + high 24h activity).
 */
export function getRisingEntities(limit = 5): EntityMemoryEntry[] {
  evictExpired();
  return [...entityStore.values()]
    .filter((e) => e.trendDirection === "rising" && e.mentionsLast24h >= 2)
    .sort((a, b) => b.mentionsLast24h - a.mentionsLast24h)
    .slice(0, limit);
}

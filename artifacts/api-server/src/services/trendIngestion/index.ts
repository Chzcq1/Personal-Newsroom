// ============================================================
// TREND INGESTION SERVICE — Sprint 26
//
// Ingests real-time trends from multiple providers and
// normalizes them into a unified TrendItem format stored in DB.
//
// Architecture:
//   - TrendIngestionProvider interface for all sources
//   - Real providers: Reddit RSS, YouTube RSS, Google News RSS
//   - Mock adapters: Twitter/X, TikTok, Instagram, Facebook
//   - Worker runs every 15 minutes
//   - DB: trend_items table (24h TTL)
// ============================================================

import { db } from "@workspace/db";
import { trendItems } from "@workspace/db/schema";
import { lt } from "drizzle-orm";
import { RedditProvider } from "./providers/redditProvider.js";
import { YouTubeProvider } from "./providers/youtubeProvider.js";
import { GoogleNewsProvider } from "./providers/googleNewsProvider.js";
import { TwitterProvider } from "./providers/twitterProvider.js";
import { SocialProvider } from "./providers/socialProvider.js";
import { logger } from "../../lib/logger.js";

// ── Normalized TrendItem ────────────────────────────────────

export interface TrendItem {
  id: string;
  source: "reddit" | "youtube" | "googlenews" | "twitter" | "tiktok" | "instagram" | "facebook";
  title: string;
  summary: string | null;
  url: string;
  entityTags: string[];
  topicTags: string[];
  publishedAt: string | null;
  engagementScore: number;
  sourceTrustScore: number;
  language: string;
}

// ── Provider interface ──────────────────────────────────────

export interface TrendIngestionProvider {
  readonly name: string;
  readonly enabled: boolean;
  ingest(): Promise<TrendItem[]>;
}

// ── All providers ───────────────────────────────────────────

const PROVIDERS: TrendIngestionProvider[] = [
  new RedditProvider(),
  new YouTubeProvider(),
  new GoogleNewsProvider(),
  new TwitterProvider(),
  new SocialProvider(),
];

// ── In-memory cache (for fast API access between DB writes) ─

let cachedItems: TrendItem[] = [];
let lastIngestAt = 0;

// ── Core ingestion logic ────────────────────────────────────

export async function ingestAllProviders(): Promise<{
  ingested: number;
  bySource: Record<string, number>;
  errors: string[];
}> {
  const bySource: Record<string, number> = {};
  const errors: string[] = [];
  const allItems: TrendItem[] = [];

  await Promise.allSettled(
    PROVIDERS.filter((p) => p.enabled).map(async (provider) => {
      try {
        const items = await provider.ingest();
        bySource[provider.name] = items.length;
        allItems.push(...items);
        logger.debug({ provider: provider.name, count: items.length }, "[TrendIngestion] Provider ingested");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${provider.name}: ${msg}`);
        bySource[provider.name] = 0;
        logger.warn({ provider: provider.name, err: msg }, "[TrendIngestion] Provider failed");
      }
    }),
  );

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const deduped = allItems.filter((item) => {
    if (seenUrls.has(item.url)) return false;
    seenUrls.add(item.url);
    return true;
  });

  // Persist to DB
  let dbSaved = 0;
  if (db && deduped.length > 0) {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const rows = deduped.map((item) => ({
        id: item.id,
        source: item.source,
        title: item.title,
        summary: item.summary ?? null,
        url: item.url,
        entityTags: JSON.stringify(item.entityTags),
        topicTags: JSON.stringify(item.topicTags),
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
        engagementScore: item.engagementScore,
        sourceTrustScore: item.sourceTrustScore,
        language: item.language,
        expiresAt,
      }));

      for (const row of rows) {
        try {
          await db.insert(trendItems).values(row).onConflictDoNothing();
          dbSaved++;
        } catch {
          // Skip duplicate
        }
      }

      // Cleanup expired rows
      await db.delete(trendItems).where(lt(trendItems.expiresAt, new Date()));
    } catch (err) {
      logger.warn({ err }, "[TrendIngestion] DB persistence failed, using in-memory only");
    }
  }

  // Update in-memory cache
  cachedItems = deduped;
  lastIngestAt = Date.now();

  logger.info(
    { ingested: deduped.length, dbSaved, bySource },
    "[TrendIngestion] Ingestion complete",
  );

  return { ingested: deduped.length, bySource, errors };
}

// ── Read functions (used by routes) ─────────────────────────

export function getRecentTrends(limit = 50): TrendItem[] {
  return cachedItems.slice(0, limit);
}

export function getTrendsByTopicTag(tag: string, limit = 20): TrendItem[] {
  return cachedItems
    .filter((item) => item.topicTags.some((t) => t.toLowerCase().includes(tag.toLowerCase())))
    .slice(0, limit);
}

export function getTrendsByEntityTag(entity: string, limit = 20): TrendItem[] {
  return cachedItems
    .filter((item) =>
      item.entityTags.some((e) => e.toLowerCase().includes(entity.toLowerCase())),
    )
    .slice(0, limit);
}

export function getTrendsBySource(source: string, limit = 20): TrendItem[] {
  return cachedItems.filter((item) => item.source === source).slice(0, limit);
}

export function getIngestionStatus() {
  const bySource: Record<string, number> = {};
  for (const item of cachedItems) {
    bySource[item.source] = (bySource[item.source] ?? 0) + 1;
  }
  return {
    totalItems: cachedItems.length,
    lastIngestAt: lastIngestAt > 0 ? new Date(lastIngestAt).toISOString() : null,
    bySource,
    providers: PROVIDERS.map((p) => ({ name: p.name, enabled: p.enabled })),
  };
}

// ============================================================
// MULTI-PLATFORM SIGNAL ADAPTERS — Sprint 18 Task C
//
// Architecture for cross-platform intelligence expansion.
// All adapters follow ISourceAdapter contract from Sprint 17.
// Disabled safely when API tokens are absent.
//
// Platforms:
//   - TikTok Trends (public trending API architecture)
//   - Facebook Pages (public page feed architecture)
//   - Instagram Public (hashtag/explore architecture)
//   - YouTube Channels (RSS-based, no auth required)
//   - Reddit Expansion (additional subreddits)
//
// Status: Architecture-first. Adapters return [] when disabled.
// Full activation requires platform-specific API tokens.
// ============================================================

import { logger } from "../../lib/logger.js";
import type { ISourceAdapter, NormalizedArticle, SourceConfidence } from "./sourceAdapter.js";

// ── Platform feature flags ────────────────────────────────────

export function isPlatformEnabled(platform: string): boolean {
  const flags: Record<string, boolean> = {
    tiktok: !!process.env.TIKTOK_API_KEY,
    facebook: !!process.env.FACEBOOK_PAGE_TOKEN,
    instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN,
    youtube: true,  // YouTube RSS requires no auth
    reddit_expanded: true,  // Public JSON API, no auth
  };
  return flags[platform] ?? false;
}

// ── Shared helpers ────────────────────────────────────────────

function buildId(source: string, identifier: string): string {
  // Non-crypto dedup hash
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `${source}::${Math.abs(hash).toString(36)}`;
}

function buildConfidence(
  tier: "A" | "B" | "C" | "unverified",
  reliability: number,
  latencyMs: number
): SourceConfidence {
  return {
    tier,
    reliability,
    latencyMs,
    isMultiSource: false,
    sourceCount: 1,
  };
}

// ── Engagement scoring (0–100) ────────────────────────────────

function normalizeEngagement(raw: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(100, Math.round((Math.log1p(raw) / Math.log1p(max)) * 100));
}

// ============================================================
// YOUTUBE CHANNEL ADAPTER
// Uses public RSS feeds — no API key required
// ============================================================

const YOUTUBE_CHANNELS: Record<string, { channelId: string; topicTags: string[] }> = {
  "CNBC Television": { channelId: "UCvJJ_dzjViJCoLf5uKUTwoA", topicTags: ["finance", "economy", "stocks"] },
  "Bloomberg Television": { channelId: "UCIALMKvObZNtJ6AmdCLP7Lg", topicTags: ["finance", "stocks"] },
  "Lex Fridman": { channelId: "UCSHZKyawb77ixDdsGog4iWA", topicTags: ["ai", "technology"] },
  "Y Combinator": { channelId: "UCcefcZRL2oaA_uBNeo5UOWg", topicTags: ["technology", "startups"] },
  "MIT OpenCourseWare": { channelId: "UCEBb1b_L6zDS3xTUrIALZOw", topicTags: ["technology", "ai"] },
};

export class YouTubeChannelAdapter implements ISourceAdapter {
  readonly id = "youtube";
  readonly displayName = "YouTube Channels";
  readonly tier: "B" = "B";
  readonly isEnabled = true; // RSS requires no auth

  async fetch(topics: string[]): Promise<NormalizedArticle[]> {
    const start = Date.now();
    const articles: NormalizedArticle[] = [];

    const relevantChannels = Object.entries(YOUTUBE_CHANNELS).filter(([, config]) =>
      topics.some((t) => config.topicTags.includes(t))
    );

    for (const [channelName, config] of relevantChannels) {
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${config.channelId}`;
        const res = await fetch(rssUrl, {
          signal: AbortSignal.timeout(5000),
          headers: { Accept: "application/atom+xml" },
        });
        if (!res.ok) continue;

        const xml = await res.text();
        const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

        for (const entry of entries.slice(0, 5)) {
          const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
          const linkMatch = entry.match(/href="([^"]+)"/);
          const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
          const viewMatch = entry.match(/yt:viewCount>(\d+)/);

          if (!titleMatch || !linkMatch) continue;

          const title = titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
          const url = linkMatch[1];
          const publishedAt = publishedMatch?.[1] ?? new Date().toISOString();
          const views = parseInt(viewMatch?.[1] ?? "0", 10);

          articles.push({
            id: buildId("youtube", url),
            title,
            summary: `Video from ${channelName}`,
            url,
            source: "youtube",
            sourceName: channelName,
            publishedAt,
            fetchedAt: new Date().toISOString(),
            language: "en",
            topicTags: config.topicTags,
            entityTags: [],
            signalScore: Math.min(50, normalizeEngagement(views, 1_000_000)),
            confidence: buildConfidence("B", 0.75, Date.now() - start),
            raw: { views },
          });
        }
      } catch (err) {
        logger.debug({ channelName, err }, "[YouTube] Feed fetch failed");
      }
    }

    logger.debug({ count: articles.length, latencyMs: Date.now() - start }, "[YouTube] Fetched");
    return articles;
  }

  async health(): Promise<{ ok: boolean; latencyMs: number; reason?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(
        "https://www.youtube.com/feeds/videos.xml?channel_id=UCvJJ_dzjViJCoLf5uKUTwoA",
        { signal: AbortSignal.timeout(5000) }
      );
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, reason: String(err) };
    }
  }
}

// ============================================================
// REDDIT EXPANSION ADAPTER
// Adds more subreddits beyond the Sprint 17 base set
// ============================================================

const EXPANDED_SUBREDDITS: Record<string, string[]> = {
  // Finance expansion
  "r/SecurityAnalysis": ["finance", "stocks"],
  "r/personalfinance": ["finance", "economy"],
  "r/Bogleheads": ["finance", "stocks"],
  "r/options": ["stocks", "finance"],
  "r/wallstreetbets": ["stocks"],
  // AI/Tech expansion
  "r/singularity": ["ai", "technology"],
  "r/LocalLLaMA": ["ai", "technology"],
  "r/OpenAI": ["ai"],
  "r/StableDiffusion": ["ai", "technology"],
  "r/programming": ["technology"],
  // Geopolitics/Economy
  "r/worldnews": ["geopolitics", "politics"],
  "r/Economics": ["economy"],
  "r/energy": ["energy", "economy"],
  // Thai-relevant
  "r/Thailand": ["thai", "geopolitics"],
  "r/ASEAN": ["geopolitics", "economy"],
};

export class RedditExpansionAdapter implements ISourceAdapter {
  readonly id = "reddit_expanded";
  readonly displayName = "Reddit (Expanded)";
  readonly tier: "C" = "C";
  readonly isEnabled = true;

  async fetch(topics: string[]): Promise<NormalizedArticle[]> {
    const start = Date.now();
    const articles: NormalizedArticle[] = [];

    const relevantSubs = Object.entries(EXPANDED_SUBREDDITS).filter(([, tags]) =>
      topics.some((t) => tags.includes(t))
    );

    // Limit to 5 subs per call to avoid rate limiting
    const selected = relevantSubs.slice(0, 5);

    for (const [subreddit, topicTags] of selected) {
      const subName = subreddit.replace("r/", "");
      try {
        const url = `https://www.reddit.com/r/${subName}/hot.json?limit=10`;
        const res = await fetch(url, {
          headers: { "User-Agent": "INFOX-NewsBot/1.0" },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) continue;

        const data = (await res.json()) as {
          data?: {
            children?: Array<{
              data: {
                title: string;
                selftext: string;
                url: string;
                created_utc: number;
                score: number;
                num_comments: number;
                permalink: string;
                over_18: boolean;
              };
            }>;
          };
        };

        const posts = data?.data?.children ?? [];
        for (const { data: post } of posts.slice(0, 5)) {
          if (post.over_18) continue; // Skip NSFW
          const engagementSignal = normalizeEngagement(
            post.score + post.num_comments * 3,
            50_000
          );

          articles.push({
            id: buildId("reddit_expanded", post.permalink),
            title: post.title,
            summary: post.selftext?.slice(0, 300) || post.title,
            url: `https://reddit.com${post.permalink}`,
            source: "reddit_expanded",
            sourceName: subreddit,
            publishedAt: new Date(post.created_utc * 1000).toISOString(),
            fetchedAt: new Date().toISOString(),
            language: "en",
            topicTags,
            entityTags: [],
            signalScore: Math.round(40 + engagementSignal * 0.3),
            confidence: {
              tier: "C",
              reliability: 0.55,
              latencyMs: Date.now() - start,
              isMultiSource: false,
              sourceCount: 1,
              engagementSignal,
            },
            raw: { score: post.score, comments: post.num_comments },
          });
        }
      } catch (err) {
        logger.debug({ subreddit, err }, "[Reddit:Expanded] Fetch failed");
      }
    }

    logger.debug({ count: articles.length, latencyMs: Date.now() - start }, "[Reddit:Expanded] Fetched");
    return articles;
  }

  async health(): Promise<{ ok: boolean; latencyMs: number; reason?: string }> {
    const start = Date.now();
    try {
      const res = await fetch("https://www.reddit.com/r/worldnews/hot.json?limit=1", {
        headers: { "User-Agent": "INFOX-NewsBot/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, reason: String(err) };
    }
  }
}

// ============================================================
// TIKTOK TRENDS ADAPTER (Architecture Stub)
// Requires: TIKTOK_API_KEY
// ============================================================

export class TikTokTrendsAdapter implements ISourceAdapter {
  readonly id = "tiktok";
  readonly displayName = "TikTok Trends";
  readonly tier: "C" = "C";
  readonly isEnabled = isPlatformEnabled("tiktok");

  async fetch(topics: string[]): Promise<NormalizedArticle[]> {
    if (!this.isEnabled) {
      logger.debug("[TikTok] Adapter disabled — set TIKTOK_API_KEY to enable");
      return [];
    }

    // Architecture stub — will be implemented when API key is available
    // TikTok Research API: https://developers.tiktok.com/products/research-api/
    logger.debug("[TikTok] Fetch called but full implementation pending API activation");
    return [];
  }

  async health(): Promise<{ ok: boolean; latencyMs: number; reason?: string }> {
    return {
      ok: false,
      latencyMs: 0,
      reason: this.isEnabled
        ? "TikTok API implementation pending"
        : "TIKTOK_API_KEY not set",
    };
  }
}

// ============================================================
// FACEBOOK PAGES ADAPTER (Architecture Stub)
// Requires: FACEBOOK_PAGE_TOKEN (Meta Graph API)
// ============================================================

export class FacebookPagesAdapter implements ISourceAdapter {
  readonly id = "facebook";
  readonly displayName = "Facebook Pages";
  readonly tier: "C" = "C";
  readonly isEnabled = isPlatformEnabled("facebook");

  async fetch(topics: string[]): Promise<NormalizedArticle[]> {
    if (!this.isEnabled) {
      logger.debug("[Facebook] Adapter disabled — set FACEBOOK_PAGE_TOKEN to enable");
      return [];
    }

    // Architecture stub — Meta Graph API v19
    // GET /{page-id}/posts?fields=message,created_time,shares&access_token={token}
    logger.debug("[Facebook] Fetch called but full implementation pending API activation");
    return [];
  }

  async health(): Promise<{ ok: boolean; latencyMs: number; reason?: string }> {
    return {
      ok: false,
      latencyMs: 0,
      reason: this.isEnabled
        ? "Facebook API implementation pending"
        : "FACEBOOK_PAGE_TOKEN not set",
    };
  }
}

// ============================================================
// INSTAGRAM SIGNALS ADAPTER (Architecture Stub)
// Requires: INSTAGRAM_ACCESS_TOKEN (Instagram Basic Display API)
// ============================================================

export class InstagramSignalsAdapter implements ISourceAdapter {
  readonly id = "instagram";
  readonly displayName = "Instagram Signals";
  readonly tier: "C" = "C";
  readonly isEnabled = isPlatformEnabled("instagram");

  async fetch(topics: string[]): Promise<NormalizedArticle[]> {
    if (!this.isEnabled) {
      logger.debug("[Instagram] Adapter disabled — set INSTAGRAM_ACCESS_TOKEN to enable");
      return [];
    }

    // Architecture stub — Instagram Basic Display API
    // GET /me/media?fields=id,caption,timestamp,media_type
    logger.debug("[Instagram] Fetch called but full implementation pending API activation");
    return [];
  }

  async health(): Promise<{ ok: boolean; latencyMs: number; reason?: string }> {
    return {
      ok: false,
      latencyMs: 0,
      reason: this.isEnabled
        ? "Instagram API implementation pending"
        : "INSTAGRAM_ACCESS_TOKEN not set",
    };
  }
}

// ── Velocity/trend tracking ────────────────────────────────────

export interface PlatformTrendSignal {
  platform: string;
  keyword: string;
  velocityScore: number;   // 0–100: how fast engagement is growing
  engagementTotal: number;
  sampleSize: number;
  capturedAt: string;
  topicTags: string[];
  narrativeLinks: string[];
}

const trendBuffer: PlatformTrendSignal[] = [];
const MAX_TREND_BUFFER = 200;

export function recordTrendSignal(signal: PlatformTrendSignal): void {
  trendBuffer.push(signal);
  if (trendBuffer.length > MAX_TREND_BUFFER) trendBuffer.shift();
}

export function getRecentTrends(limit = 20): PlatformTrendSignal[] {
  return trendBuffer.slice(-limit).reverse();
}

// ── Platform adapter registry ─────────────────────────────────

const platformAdapters: ISourceAdapter[] = [
  new YouTubeChannelAdapter(),
  new RedditExpansionAdapter(),
  new TikTokTrendsAdapter(),
  new FacebookPagesAdapter(),
  new InstagramSignalsAdapter(),
];

export function getPlatformAdapters(): ISourceAdapter[] {
  return platformAdapters;
}

export function getEnabledPlatformAdapters(): ISourceAdapter[] {
  return platformAdapters.filter((a) => a.isEnabled);
}

export async function getPlatformAdapterHealth(): Promise<
  Array<{ id: string; name: string; enabled: boolean; health: Awaited<ReturnType<ISourceAdapter["health"]>> }>
> {
  return Promise.all(
    platformAdapters.map(async (a) => ({
      id: a.id,
      name: a.displayName,
      enabled: a.isEnabled,
      health: await a.health().catch(() => ({ ok: false, latencyMs: 0, reason: "Health check threw" })),
    }))
  );
}

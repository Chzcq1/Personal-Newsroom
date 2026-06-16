// ============================================================
// REDDIT SOURCE ADAPTER — Sprint 17 Task E
//
// Monitors subreddits for early-trend signals.
// Uses Reddit's public JSON API (no auth required for read-only).
// Focus: AI · Crypto · Markets · Geopolitics · Technology
// ============================================================

import type { ISourceAdapter, NormalizedArticle, SourceConfidence } from "./sourceAdapter.js";
import { normaliseId, normaliseTags } from "./sourceAdapter.js";

// ── Subreddit configuration ────────────────────────────────────

interface SubredditConfig {
  subreddit: string;
  topic: string;
  minScore: number;       // minimum Reddit score to include
  minComments: number;    // minimum comment count (engagement signal)
  trustTier: "B" | "C";  // Reddit is never Tier A
}

const SUBREDDIT_CONFIGS: SubredditConfig[] = [
  { subreddit: "investing",        topic: "markets",    minScore: 100, minComments: 10,  trustTier: "B" },
  { subreddit: "wallstreetbets",   topic: "markets",    minScore: 500, minComments: 50,  trustTier: "C" },
  { subreddit: "stocks",           topic: "markets",    minScore: 100, minComments: 5,   trustTier: "B" },
  { subreddit: "economics",        topic: "economy",    minScore: 50,  minComments: 5,   trustTier: "B" },
  { subreddit: "MachineLearning",  topic: "ai",         minScore: 50,  minComments: 5,   trustTier: "B" },
  { subreddit: "artificial",       topic: "ai",         minScore: 30,  minComments: 3,   trustTier: "C" },
  { subreddit: "CryptoCurrency",   topic: "crypto",     minScore: 200, minComments: 20,  trustTier: "C" },
  { subreddit: "geopolitics",      topic: "geopolitics",minScore: 50,  minComments: 5,   trustTier: "B" },
  { subreddit: "technology",       topic: "tech",       minScore: 100, minComments: 10,  trustTier: "B" },
  { subreddit: "worldnews",        topic: "world",      minScore: 200, minComments: 20,  trustTier: "B" },
];

// ── Noise patterns to filter ───────────────────────────────────

const NOISE_PATTERNS = [
  /\b(daily discussion|weekend|weekly thread|megathread)\b/i,
  /\b(meme|shitpost|rant|vent|unpopular opinion)\b/i,
  /\b(moon|lambo|100x|degen|ape|yolo|wsb)\b/i,
  /\[deleted\]/i,
];

// ── Sentiment hints ────────────────────────────────────────────

function extractSentiment(title: string, selftext: string): "positive" | "negative" | "neutral" {
  const text = `${title} ${selftext}`.toLowerCase();
  const positive = /\b(surge|rally|gain|breakout|record|bull|rise|jump)\b/.test(text);
  const negative = /\b(crash|dump|collapse|fall|drop|sell.off|bear|plunge)\b/.test(text);
  if (positive && !negative) return "positive";
  if (negative && !positive) return "negative";
  return "neutral";
}

// ── Engagement normalisation (0–100) ──────────────────────────

function normaliseEngagement(score: number, comments: number): number {
  // Log-scale normalisation capped at 100
  const raw = Math.log10(Math.max(score, 1)) * 20 + Math.log10(Math.max(comments, 1)) * 15;
  return Math.min(100, Math.round(raw));
}

// ── Reddit public JSON fetch ───────────────────────────────────

interface RedditPost {
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  score: number;
  num_comments: number;
  created_utc: number;
  is_self: boolean;
  domain: string;
  author: string;
}

async function fetchSubreddit(config: SubredditConfig): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${config.subreddit}/hot.json?limit=25`;
  const res = await fetch(url, {
    headers: { "User-Agent": "INFOX-NewsSignalBot/1.0" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Reddit API ${res.status} for r/${config.subreddit}`);
  const json = await res.json() as { data: { children: Array<{ data: RedditPost }> } };
  return json.data.children.map((c) => c.data);
}

// ── Adapter implementation ─────────────────────────────────────

export class RedditSourceAdapter implements ISourceAdapter {
  readonly id = "reddit";
  readonly displayName = "Reddit Signal Ingestion";
  readonly tier = "C" as const;
  readonly isEnabled: boolean;

  constructor() {
    // Enable by default — uses public API, no auth required
    this.isEnabled = true;
  }

  async fetch(topics: string[]): Promise<NormalizedArticle[]> {
    const topicSet = new Set(topics.map((t) => t.toLowerCase()));

    // Filter subreddit configs to those relevant to requested topics
    const relevantConfigs = SUBREDDIT_CONFIGS.filter(
      (c) =>
        topicSet.size === 0 ||
        topicSet.has(c.topic) ||
        topicSet.has("all"),
    );

    const results = await Promise.allSettled(
      relevantConfigs.map((config) => this.fetchSubredditNormalized(config)),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<NormalizedArticle[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);
  }

  private async fetchSubredditNormalized(config: SubredditConfig): Promise<NormalizedArticle[]> {
    const start = Date.now();
    try {
      const posts = await fetchSubreddit(config);
      const latencyMs = Date.now() - start;

      return posts
        .filter((post) => {
          if (post.score < config.minScore) return false;
          if (post.num_comments < config.minComments) return false;
          if (NOISE_PATTERNS.some((p) => p.test(post.title))) return false;
          return true;
        })
        .map((post): NormalizedArticle => {
          const engagement = normaliseEngagement(post.score, post.num_comments);
          const confidence: SourceConfidence = {
            tier: config.trustTier,
            reliability: config.trustTier === "B" ? 0.65 : 0.45,
            latencyMs,
            isMultiSource: false,
            sourceCount: 1,
            engagementSignal: engagement,
          };

          return {
            id: normaliseId("reddit", post.permalink),
            title: post.title,
            summary: post.selftext.slice(0, 600) || `High-engagement Reddit post — ${post.num_comments} comments, score ${post.score}`,
            url: `https://www.reddit.com${post.permalink}`,
            source: "reddit",
            sourceName: `r/${config.subreddit}`,
            publishedAt: new Date(post.created_utc * 1000).toISOString(),
            fetchedAt: new Date().toISOString(),
            language: "en",
            topicTags: normaliseTags([config.topic]),
            entityTags: [],
            signalScore: Math.min(100, Math.round(engagement * 0.6 + (post.score > 1000 ? 20 : 0))),
            confidence,
            raw: process.env["NODE_ENV"] === "development" ? post : undefined,
          };
        });
    } catch {
      return [];
    }
  }

  async health(): Promise<{ ok: boolean; latencyMs: number; reason?: string }> {
    const start = Date.now();
    try {
      const res = await fetch("https://www.reddit.com/r/investing/hot.json?limit=1", {
        headers: { "User-Agent": "INFOX-NewsSignalBot/1.0" },
        signal: AbortSignal.timeout(5_000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, reason: String(err) };
    }
  }
}

export const redditAdapter = new RedditSourceAdapter();

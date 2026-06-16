// ============================================================
// TWITTER / X SIGNAL ADAPTER — Sprint 17 Task F
//
// Architecture-only implementation. Prepares the ingestion
// contract for future Twitter/X API integration.
//
// DO NOT scrape aggressively. This adapter uses mock ingestion
// to validate the pipeline architecture. Real API calls require
// a Twitter API v2 bearer token.
// ============================================================

import type { ISourceAdapter, NormalizedArticle, SourceConfidence } from "./sourceAdapter.js";
import { normaliseId, normaliseTags } from "./sourceAdapter.js";

// ── Twitter signal types ───────────────────────────────────────

export interface TwitterSignal {
  tweetId: string;
  text: string;
  authorHandle: string;
  authorFollowers: number;
  retweetCount: number;
  likeCount: number;
  createdAt: string;
  entities: { hashtags: string[]; mentions: string[]; urls: string[] };
  lang: string;
}

export interface TrendingEntity {
  entityName: string;
  mentionCount: number;
  velocityScore: number;   // mentions/hour in the last 3 hours vs. baseline
  sentiment: "positive" | "negative" | "neutral";
  associatedHashtags: string[];
  firstSeen: string;
}

// ── Influential account tiers ──────────────────────────────────

const INFLUENTIAL_TIERS = {
  A: { minFollowers: 1_000_000, weight: 1.0 },
  B: { minFollowers: 100_000,   weight: 0.7 },
  C: { minFollowers: 10_000,    weight: 0.4 },
};

// ── Signal acceleration detection ─────────────────────────────

interface AccelerationWindow {
  entityName: string;
  counts: number[];         // mention counts per 15-min window (last 4 = 1 hour)
  baseline: number;         // average hourly count over the last 24h
}

const accelerationWindows = new Map<string, AccelerationWindow>();

function detectAcceleration(entityName: string, newMentions: number): number {
  const existing = accelerationWindows.get(entityName);
  if (!existing) {
    accelerationWindows.set(entityName, {
      entityName,
      counts: [newMentions],
      baseline: newMentions,
    });
    return 0;
  }

  existing.counts.push(newMentions);
  if (existing.counts.length > 4) existing.counts.shift();

  const recent = existing.counts[existing.counts.length - 1] ?? 0;
  if (existing.baseline === 0) return 0;

  const acceleration = (recent - existing.baseline) / existing.baseline;
  return Math.round(acceleration * 100); // percentage change
}

// ── Mock ingestion for architecture validation ─────────────────

function generateMockSignals(): TwitterSignal[] {
  // In production: replace with real Twitter API v2 calls using bearer token
  // endpoint: GET /2/tweets/search/recent?query=...&max_results=100
  return [];
}

// ── Adapter implementation ─────────────────────────────────────

export class TwitterSignalAdapter implements ISourceAdapter {
  readonly id = "twitter";
  readonly displayName = "X / Twitter Signal Adapter";
  readonly tier = "B" as const;
  readonly isEnabled: boolean;

  private readonly bearerToken: string | null;

  constructor() {
    this.bearerToken = process.env["TWITTER_BEARER_TOKEN"] ?? null;
    // Enable only if bearer token is configured
    this.isEnabled = this.bearerToken !== null;
  }

  async fetch(_topics: string[]): Promise<NormalizedArticle[]> {
    if (!this.isEnabled) {
      // Return empty — adapter is architecture-ready but not configured
      return [];
    }

    // Production implementation:
    // 1. Build query: (topic1 OR topic2) lang:en -is:retweet has:links min_faves:50
    // 2. GET /2/tweets/search/recent with bearer token
    // 3. Filter by engagement, influential accounts, and noise patterns
    // 4. Extract trending entities using detectAcceleration()
    // 5. Normalize to NormalizedArticle[]

    const mockSignals = generateMockSignals();
    return this.normalizeSignals(mockSignals);
  }

  private normalizeSignals(signals: TwitterSignal[]): NormalizedArticle[] {
    return signals
      .filter((s) => s.retweetCount + s.likeCount > 50)
      .map((signal): NormalizedArticle => {
        const engagement = Math.min(100, Math.round(
          Math.log10(Math.max(signal.retweetCount + signal.likeCount, 1)) * 25,
        ));

        const authorTier =
          signal.authorFollowers >= INFLUENTIAL_TIERS.A.minFollowers ? "A"
          : signal.authorFollowers >= INFLUENTIAL_TIERS.B.minFollowers ? "B"
          : "C";

        const confidence: SourceConfidence = {
          tier: authorTier as "A" | "B" | "C",
          reliability: authorTier === "A" ? 0.75 : authorTier === "B" ? 0.60 : 0.40,
          latencyMs: 0,
          isMultiSource: false,
          sourceCount: 1,
          engagementSignal: engagement,
        };

        return {
          id: normaliseId("twitter", signal.tweetId),
          title: signal.text.slice(0, 120),
          summary: signal.text.slice(0, 600),
          url: `https://twitter.com/i/web/status/${signal.tweetId}`,
          source: "twitter",
          sourceName: `@${signal.authorHandle}`,
          publishedAt: signal.createdAt,
          fetchedAt: new Date().toISOString(),
          language: signal.lang === "th" ? "th" : "en",
          topicTags: normaliseTags(signal.entities.hashtags),
          entityTags: normaliseTags(signal.entities.mentions),
          signalScore: Math.min(100, engagement + (authorTier === "A" ? 20 : 0)),
          confidence,
        };
      });
  }

  async health(): Promise<{ ok: boolean; latencyMs: number; reason?: string }> {
    if (!this.isEnabled) {
      return { ok: false, latencyMs: 0, reason: "TWITTER_BEARER_TOKEN not configured" };
    }

    const start = Date.now();
    try {
      const res = await fetch("https://api.twitter.com/2/tweets/search/recent?query=test&max_results=10", {
        headers: { Authorization: `Bearer ${this.bearerToken}` },
        signal: AbortSignal.timeout(5_000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, reason: String(err) };
    }
  }

  /**
   * Get trending entities detected from recent signals.
   */
  getTrendingEntities(): TrendingEntity[] {
    return [...accelerationWindows.values()]
      .filter((w) => w.counts.length >= 2)
      .map((w): TrendingEntity => {
        const recent = w.counts[w.counts.length - 1] ?? 0;
        const velocity = detectAcceleration(w.entityName, recent);
        return {
          entityName: w.entityName,
          mentionCount: w.counts.reduce((a, b) => a + b, 0),
          velocityScore: velocity,
          sentiment: "neutral",
          associatedHashtags: [],
          firstSeen: new Date().toISOString(),
        };
      })
      .filter((e) => e.velocityScore > 20)
      .sort((a, b) => b.velocityScore - a.velocityScore)
      .slice(0, 10);
  }
}

export const twitterAdapter = new TwitterSignalAdapter();

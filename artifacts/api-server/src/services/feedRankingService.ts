// ============================================================
// FEED RANKING SERVICE — Sprint 22
//
// Ranks articles for a specific user profile using:
//   Interest Match  40%
//   Source Trust    20%
//   Signal Priority 20%
//   Recency         20%
//
// Two users with different interests receive a different order.
// ============================================================

import type { UserInterest } from "@workspace/db";

export interface RankableArticle {
  title: string;
  description?: string | null;
  source?: string | null;
  pubDate?: string | null;
  url: string;
  signalScore?: number; // 0–100, from existing signal pipeline
}

export interface RankedArticle extends RankableArticle {
  personalizedScore: number;
}

// ── Source trust table (Tier A = 1.0, B = 0.7, C = 0.4) ──────

const SOURCE_TRUST: Record<string, number> = {
  "Reuters": 1.0,
  "AP News": 1.0,
  "BBC": 0.95,
  "Financial Times": 0.95,
  "Wall Street Journal": 0.95,
  "Bloomberg": 0.9,
  "The Economist": 0.9,
  "Ars Technica": 0.85,
  "TechCrunch": 0.8,
  "The Verge": 0.8,
  "Wired": 0.8,
  "MIT Technology Review": 0.85,
  "CoinDesk": 0.75,
  "CoinTelegraph": 0.7,
};

function getSourceTrust(source: string | null | undefined): number {
  if (!source) return 0.5;
  const exact = SOURCE_TRUST[source];
  if (exact !== undefined) return exact;
  // Partial match fallback
  const lower = source.toLowerCase();
  for (const [key, val] of Object.entries(SOURCE_TRUST)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return 0.5;
}

// ── Recency score (0–1): decay over 72 hours ─────────────────

function getRecencyScore(pubDate: string | null | undefined, now: Date): number {
  if (!pubDate) return 0.5;
  try {
    const pub = new Date(pubDate);
    const ageMs = now.getTime() - pub.getTime();
    const ageHrs = ageMs / 3600000;
    if (ageHrs <= 1) return 1.0;
    if (ageHrs <= 6) return 0.9;
    if (ageHrs <= 12) return 0.8;
    if (ageHrs <= 24) return 0.65;
    if (ageHrs <= 48) return 0.45;
    if (ageHrs <= 72) return 0.3;
    return 0.15;
  } catch {
    return 0.5;
  }
}

// ── Interest match: keyword overlap with user's interests ─────

function getInterestMatch(
  article: RankableArticle,
  interests: UserInterest[],
): number {
  if (interests.length === 0) return 0.5;

  const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
  let bestScore = 0;

  for (const interest of interests) {
    const label = interest.interestLabel.toLowerCase();
    const words = label.split(/\s+/);
    const weight = (interest.weight ?? 50) / 100;

    // Full phrase match
    if (text.includes(label)) {
      bestScore = Math.max(bestScore, weight);
      continue;
    }
    // Partial word match
    const matched = words.filter((w: string) => w.length > 2 && text.includes(w));
    if (matched.length > 0) {
      const partialScore = (matched.length / words.length) * weight * 0.7;
      bestScore = Math.max(bestScore, partialScore);
    }
  }

  return Math.min(1.0, bestScore);
}

// ── Main ranking function ─────────────────────────────────────

export function rankArticles(
  articles: RankableArticle[],
  interests: UserInterest[],
): RankedArticle[] {
  const now = new Date();

  const scored: RankedArticle[] = articles.map((article) => {
    const interestMatch = getInterestMatch(article, interests);
    const sourceTrust = getSourceTrust(article.source);
    const signalPriority = (article.signalScore ?? 50) / 100;
    const recency = getRecencyScore(article.pubDate, now);

    const personalizedScore =
      interestMatch * 0.40 +
      sourceTrust * 0.20 +
      signalPriority * 0.20 +
      recency * 0.20;

    return { ...article, personalizedScore };
  });

  return scored.sort((a, b) => b.personalizedScore - a.personalizedScore);
}

// ── Feed quality metrics (Task H) ────────────────────────────

export interface FeedQualityMetrics {
  interestMatchRate: number;   // avg interest match score
  avgPersonalizedScore: number;
  topSourceTrustScore: number;
  recencyScore: number;
  topicsDistribution: Record<string, number>;
}

export function computeFeedQuality(
  articles: RankedArticle[],
  interests: UserInterest[],
): FeedQualityMetrics {
  if (articles.length === 0) {
    return {
      interestMatchRate: 0,
      avgPersonalizedScore: 0,
      topSourceTrustScore: 0,
      recencyScore: 0,
      topicsDistribution: {},
    };
  }

  const now = new Date();
  const n = articles.length;

  const avgPersonalizedScore = articles.reduce((s, a) => s + a.personalizedScore, 0) / n;
  const interestMatchRate = articles.reduce((s, a) => s + getInterestMatch(a, interests), 0) / n;
  const topSourceTrustScore = articles.reduce((s, a) => s + getSourceTrust(a.source), 0) / n;
  const recencyScore = articles.reduce((s, a) => s + getRecencyScore(a.pubDate, now), 0) / n;

  const topicsDistribution: Record<string, number> = {};
  for (const interest of interests) {
    const count = articles.filter((a) => {
      const text = `${a.title} ${a.description ?? ""}`.toLowerCase();
      return text.includes(interest.interestLabel.toLowerCase());
    }).length;
    if (count > 0) topicsDistribution[interest.interestLabel] = count;
  }

  return { interestMatchRate, avgPersonalizedScore, topSourceTrustScore, recencyScore, topicsDistribution };
}

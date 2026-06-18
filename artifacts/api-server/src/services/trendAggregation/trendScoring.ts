// ============================================================
// TREND SCORING ENGINE
// Sprint 28 — Product Realignment
//
// Ranks TrendEntity items by composite score.
// Priority: momentum > virality > user-match > recency > source quality
// ============================================================

import type { TrendEntity } from "./trendNormalizer.js";
import type { MomentumScore } from "./trendMomentum.js";

export interface ScoredTrend extends TrendEntity {
  trendScore: number;        // 0-100 final composite score
  momentum: MomentumScore;
  platformCoverage: number;  // how many distinct platforms cover this
  userMatchScore: number;    // 0-100 interest match
  recencyScore: number;      // 0-100 based on age
  sourceQualityScore: number;
}

// ── Scoring weights (sum = 1.0) ───────────────────────────────
const WEIGHTS = {
  momentum:      0.35,
  virality:      0.25,
  userMatch:     0.20,
  recency:       0.12,
  sourceQuality: 0.08,
} as const;

// ── Recency scoring ───────────────────────────────────────────

function scoreRecency(publishedAt: Date | null): number {
  if (!publishedAt) return 20;
  const ageMs = Date.now() - publishedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < 1)  return 100;
  if (ageHours < 3)  return 90;
  if (ageHours < 6)  return 80;
  if (ageHours < 12) return 65;
  if (ageHours < 24) return 50;
  if (ageHours < 48) return 30;
  return 10;
}

// ── Source quality scoring ────────────────────────────────────

const SOURCE_QUALITY: Record<string, number> = {
  // Tier A — high trust
  reuters: 95, bloomberg: 95, ft: 90, wsj: 90, bbc: 88, nytimes: 88,
  guardian: 85, economist: 90, "ars technica": 85, techcrunch: 80,
  // Tier B — medium trust
  reddit: 65, github: 75, youtube: 60, twitter: 55,
  // Default
  default: 50,
};

function scoreSource(source: string): number {
  const lower = source.toLowerCase();
  for (const [key, score] of Object.entries(SOURCE_QUALITY)) {
    if (lower.includes(key)) return score;
  }
  return SOURCE_QUALITY.default;
}

// ── User match scoring ────────────────────────────────────────

export function scoreUserMatch(entity: TrendEntity, interests: string[]): number {
  if (interests.length === 0) return 50;

  const text = `${entity.title} ${entity.description} ${entity.tags.join(" ")}`.toLowerCase();
  let matched = 0;

  for (const interest of interests) {
    if (text.includes(interest.toLowerCase())) matched++;
  }

  return Math.min(100, Math.round((matched / interests.length) * 100) + 10);
}

// ── Virality: cross-platform appearance ───────────────────────

export function scoreVirality(
  entity: TrendEntity,
  allEntities: TrendEntity[],
): number {
  // Count how many entities share the same tags (proxy for cross-platform coverage)
  if (entity.tags.length === 0) return 20;

  const relatedCount = allEntities.filter((e) => {
    if (e.id === entity.id) return false;
    return entity.tags.some((t) => e.tags.includes(t));
  }).length;

  return Math.min(100, 20 + relatedCount * 8);
}

// ── Composite scorer ──────────────────────────────────────────

export function scoreEntity(
  entity: TrendEntity,
  momentum: MomentumScore,
  allEntities: TrendEntity[],
  userInterests: string[],
): ScoredTrend {
  const momentumScore = momentum.score;
  const viralityScore = scoreVirality(entity, allEntities);
  const userMatchScore = scoreUserMatch(entity, userInterests);
  const recencyScore = scoreRecency(entity.publishedAt);
  const sourceQualityScore = scoreSource(entity.source);

  const trendScore = Math.round(
    momentumScore * WEIGHTS.momentum +
    viralityScore * WEIGHTS.virality +
    userMatchScore * WEIGHTS.userMatch +
    recencyScore * WEIGHTS.recency +
    sourceQualityScore * WEIGHTS.sourceQuality,
  );

  return {
    ...entity,
    trendScore,
    momentum,
    platformCoverage: 1, // updated by cluster step
    userMatchScore,
    recencyScore,
    sourceQualityScore,
  };
}

// ── Rank by trend score ───────────────────────────────────────

export function rankTrends(trends: ScoredTrend[]): ScoredTrend[] {
  return [...trends].sort((a, b) => b.trendScore - a.trendScore);
}

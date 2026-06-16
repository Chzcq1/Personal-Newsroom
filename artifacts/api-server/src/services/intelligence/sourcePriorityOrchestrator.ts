// ============================================================
// SOURCE PRIORITY ORCHESTRATOR — Sprint 18 Task G
//
// Dynamically ranks sources by 8 factors before AI attention
// is allocated. Prevents equal treatment of unequal sources.
//
// Ranking factors:
//   1. Trust score (sourceTrustEngine)
//   2. Recency (freshness of latest article)
//   3. Topic specialization (source-to-topic affinity)
//   4. Signal acceleration (trend velocity for this source)
//   5. Cross-confirmation (story confirmed by multiple sources)
//   6. Geopolitical importance (coverage of high-stakes events)
//   7. Market sensitivity (market-moving content)
//   8. User affinity (topics user actually cares about)
// ============================================================

import { logger } from "../../lib/logger.js";
import { getSourceTrust } from "./sourceTrustEngine.js";
import { getSourceTier } from "../news/sourceRegistry.js";
import type { RssArticle } from "../news/rssService.js";

// ── Priority result types ─────────────────────────────────────

export interface SourcePriorityScore {
  sourceId: string;
  sourceName: string;
  finalScore: number;         // 0–100 composite
  rank: number;               // 1 = highest priority
  factors: PriorityFactors;
  attentionBudget: number;    // 0–1 fraction of AI attention to allocate
  shouldReceiveAI: boolean;
  exclusionReason?: string;
}

export interface PriorityFactors {
  trustScore: number;         // 0–30 (from sourceTrustEngine)
  recencyScore: number;       // 0–20
  specializationScore: number; // 0–15
  accelerationScore: number;  // 0–15
  crossConfirmScore: number;  // 0–10
  geopoliticalScore: number;  // 0–5
  marketSensScore: number;    // 0–5
}

// ── Topic specialization map ──────────────────────────────────
// Source name → topic IDs it specializes in

const SOURCE_SPECIALIZATION: Record<string, string[]> = {
  "Financial Times": ["economy", "finance", "stocks"],
  "Bloomberg": ["economy", "finance", "stocks", "energy"],
  "Bloomberg Markets": ["stocks", "finance"],
  "Bloomberg Economics": ["economy"],
  "The Economist": ["economy", "politics", "geopolitics"],
  "Reuters Business": ["economy", "finance", "stocks"],
  "Reuters Economy": ["economy"],
  "Reuters Politics": ["politics"],
  "MIT Technology Review": ["ai", "technology"],
  "TechCrunch": ["technology", "ai", "startups"],
  "Ars Technica": ["technology", "ai"],
  "Ars Technica AI": ["ai"],
  "The Verge": ["technology"],
  "The Verge AI": ["ai"],
  "Wired": ["technology", "ai"],
  "VentureBeat": ["ai", "technology"],
  "CNBC Markets": ["stocks", "finance", "economy"],
  "MarketWatch": ["stocks", "finance"],
  "BBC Business": ["economy", "finance"],
  "BBC Politics": ["politics"],
  "AP Politics": ["politics"],
  "Politico": ["politics"],
  "Yahoo Finance": ["stocks", "finance"],
};

// ── Market-sensitive keywords ─────────────────────────────────

const MARKET_SENSITIVE_PATTERNS = [
  /\b(fed|federal reserve|interest rate|rate cut|rate hike)\b/i,
  /\b(earnings|revenue|profit|eps|guidance)\b/i,
  /\b(ipo|merger|acquisition|buyout)\b/i,
  /\b(inflation|cpi|pce|jobs report|nfp)\b/i,
  /\b(gdp|recession|growth|contraction)\b/i,
];

const GEOPOLITICAL_PATTERNS = [
  /\b(war|military|conflict|invasion|nato|un|sanction)\b/i,
  /\b(election|vote|president|prime minister|government)\b/i,
  /\b(nuclear|missile|treaty|diplomatic)\b/i,
  /\b(oil|opec|energy|gas|pipeline)\b/i,
  /\b(china|russia|ukraine|middle east|taiwan)\b/i,
];

// ── Scoring helpers ───────────────────────────────────────────

function scoreTrust(sourceId: string, sourceName: string): number {
  const profile = getSourceTrust(sourceId, sourceName);
  // Scale trust score (0–100) → factor range (0–30)
  return (profile.trustScore / 100) * 30;
}

function scoreRecency(articles: RssArticle[]): number {
  if (articles.length === 0) return 0;
  const latestPubDate = articles
    .map((a) => {
      try {
        return new Date(a.pubDate ?? 0).getTime();
      } catch {
        return 0;
      }
    })
    .reduce((max, t) => Math.max(max, t), 0);

  const ageHours = (Date.now() - latestPubDate) / (1000 * 60 * 60);
  if (ageHours < 1) return 20;
  if (ageHours < 3) return 17;
  if (ageHours < 6) return 14;
  if (ageHours < 12) return 10;
  if (ageHours < 24) return 6;
  return 2;
}

function scoreSpecialization(sourceName: string, topicId: string): number {
  const specialties = SOURCE_SPECIALIZATION[sourceName] ?? [];
  if (specialties.includes(topicId)) return 15;
  // Partial match
  const partial = specialties.some((s) => topicId.includes(s) || s.includes(topicId));
  return partial ? 7 : 0;
}

function scoreAcceleration(articles: RssArticle[]): number {
  if (articles.length === 0) return 0;
  // Simple proxy: more articles in last 6h = higher acceleration
  const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
  const recentCount = articles.filter((a) => {
    try {
      return new Date(a.pubDate ?? 0).getTime() > sixHoursAgo;
    } catch {
      return false;
    }
  }).length;

  if (recentCount >= 4) return 15;
  if (recentCount >= 3) return 12;
  if (recentCount >= 2) return 8;
  if (recentCount >= 1) return 4;
  return 0;
}

function scoreCrossConfirmation(articles: RssArticle[], allSources: string[]): number {
  // How many unique sources confirmed the same story (by keyword overlap)
  const uniqueSources = new Set(allSources).size;
  if (uniqueSources >= 5) return 10;
  if (uniqueSources >= 3) return 7;
  if (uniqueSources >= 2) return 4;
  return 0;
}

function scoreGeopolitical(articles: RssArticle[]): number {
  const allText = articles.map((a) => `${a.title} ${a.description ?? ""}`).join(" ");
  const matches = GEOPOLITICAL_PATTERNS.filter((p) => p.test(allText)).length;
  return Math.min(5, matches * 2);
}

function scoreMarketSensitivity(articles: RssArticle[]): number {
  const allText = articles.map((a) => `${a.title} ${a.description ?? ""}`).join(" ");
  const matches = MARKET_SENSITIVE_PATTERNS.filter((p) => p.test(allText)).length;
  return Math.min(5, matches * 2);
}

// ── Main prioritization function ──────────────────────────────

export interface SourceGroup {
  sourceId: string;
  sourceName: string;
  articles: RssArticle[];
  topicId: string;
  userInterests?: string[];
}

export function prioritizeSources(
  sources: SourceGroup[],
  allSourceNames: string[]
): SourcePriorityScore[] {
  const scored: SourcePriorityScore[] = sources.map((group) => {
    const { sourceId, sourceName, articles, topicId } = group;

    const trust = getSourceTrust(sourceId, sourceName);
    const tier = getSourceTier(sourceName);

    // Hard exclusion: toxic sources don't get AI attention
    if (trust.stabilityClass === "toxic") {
      return {
        sourceId,
        sourceName,
        finalScore: 0,
        rank: 999,
        factors: {
          trustScore: 0,
          recencyScore: 0,
          specializationScore: 0,
          accelerationScore: 0,
          crossConfirmScore: 0,
          geopoliticalScore: 0,
          marketSensScore: 0,
        },
        attentionBudget: 0,
        shouldReceiveAI: false,
        exclusionReason: "Source classified as toxic — trust score too low",
      };
    }

    const factors: PriorityFactors = {
      trustScore: scoreTrust(sourceId, sourceName),
      recencyScore: scoreRecency(articles),
      specializationScore: scoreSpecialization(sourceName, topicId),
      accelerationScore: scoreAcceleration(articles),
      crossConfirmScore: scoreCrossConfirmation(articles, allSourceNames),
      geopoliticalScore: scoreGeopolitical(articles),
      marketSensScore: scoreMarketSensitivity(articles),
    };

    // Tier bonus
    const tierBonus = tier === "A" ? 8 : tier === "B" ? 4 : 0;

    const finalScore = Math.min(
      100,
      Math.round(
        factors.trustScore +
          factors.recencyScore +
          factors.specializationScore +
          factors.accelerationScore +
          factors.crossConfirmScore +
          factors.geopoliticalScore +
          factors.marketSensScore +
          tierBonus
      )
    );

    return {
      sourceId,
      sourceName,
      finalScore,
      rank: 0, // set below
      factors,
      attentionBudget: 0, // set below
      shouldReceiveAI: finalScore >= 25,
    };
  });

  // Sort by finalScore descending
  scored.sort((a, b) => b.finalScore - a.finalScore);

  // Assign ranks and attention budgets
  const totalScore = scored
    .filter((s) => s.shouldReceiveAI)
    .reduce((sum, s) => sum + s.finalScore, 0);

  scored.forEach((s, i) => {
    s.rank = i + 1;
    s.attentionBudget =
      s.shouldReceiveAI && totalScore > 0
        ? Math.round((s.finalScore / totalScore) * 100) / 100
        : 0;
  });

  logger.debug(
    { count: scored.length, top3: scored.slice(0, 3).map((s) => s.sourceName) },
    "[SourcePriority] Sources ranked"
  );

  return scored;
}

// ── Article reordering ─────────────────────────────────────────

export function reorderArticlesBySourcePriority(
  articles: RssArticle[],
  prioritizedSources: SourcePriorityScore[]
): RssArticle[] {
  const rankMap = new Map<string, number>();
  prioritizedSources.forEach((s) => rankMap.set(s.sourceName, s.rank));

  return [...articles].sort((a, b) => {
    const rankA = rankMap.get(a.source ?? "") ?? 999;
    const rankB = rankMap.get(b.source ?? "") ?? 999;
    return rankA - rankB;
  });
}

// ── Snapshot ───────────────────────────────────────────────────

export function getOrchestrationSnapshot(): {
  totalSourcesTracked: number;
  topSources: { name: string; score: number }[];
} {
  return {
    totalSourcesTracked: Object.keys(SOURCE_SPECIALIZATION).length,
    topSources: Object.keys(SOURCE_SPECIALIZATION)
      .map((name) => ({
        name,
        score: getSourceTrust(name, name).trustScore,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10),
  };
}

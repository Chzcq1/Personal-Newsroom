// ============================================================
// SIGNAL PRIORITY ENGINE — Sprint 15 Task B
//
// Replaces the simple recency+quality sort in newsCollectorService
// with a 7-factor priority ranking system.
//
// Priority factors (in order of weight):
//   1. Impact           — market/geopolitical significance of event
//   2. Acceleration     — story gaining velocity (multi-source + freshness)
//   3. EntityImportance — high-weight named entities (CEO, market-mover)
//   4. NarrativePersistence — ongoing story across multiple sources
//   5. SourceTrust      — tier-weighted credibility (A=30, B=18, C=5)
//   6. RelevanceConfidence — precision filter score
//   7. Recency          — as tie-breaker, NOT primary driver
//
// Key principle: "The important things should surface automatically."
// NOT: chronological RSS reader.
//
// Architecture: pure functions, no side effects, no I/O.
// ============================================================

import { getSourceTier } from "../news/sourceRegistry.js";
import type { RssArticle } from "../news/rssService.js";
import type { PrecisionScore } from "./precisionFilter.js";

// ── Impact keywords (severity-weighted) ──────────────────────

const CRITICAL_IMPACT_TERMS = [
  "rate cut", "rate hike", "federal reserve", "fed decision",
  "emergency", "crisis", "crash", "collapse", "meltdown",
  "nuclear", "military", "war", "conflict", "invasion",
  "record high", "record low", "all-time", "historic",
  "acquisition", "merger", "ipo", "$1 billion", "$10 billion",
  "ban", "sanctions", "regulation", "lawsuit",
  "breakthrough", "launched", "unveiled", "released",
];

const HIGH_IMPACT_TERMS = [
  "earnings", "quarterly", "revenue", "profit", "loss",
  "inflation", "recession", "gdp", "unemployment", "cpi",
  "summit", "agreement", "treaty", "election",
  "layoffs", "hiring freeze", "restructuring",
  "funding round", "valuation", "partnership",
  "update", "version", "open source", "open-sourced",
  "court", "investigation", "probe", "fined",
  "surge", "plunge", "rally", "soar", "tumble",
];

const MEDIUM_IMPACT_TERMS = [
  "product launch", "new model", "new feature", "announced",
  "study", "research", "report", "analysis", "forecast",
  "interview", "comment", "said", "noted",
  "shares", "stock", "market cap",
];

// ── Named entity importance heuristics ───────────────────────

const HIGH_IMPORTANCE_ENTITIES = [
  // Market movers
  "nvidia", "apple", "microsoft", "google", "meta", "amazon",
  "tesla", "openai", "anthropic", "deepmind",
  // Market institutions
  "federal reserve", "fed", "sec", "imf", "world bank",
  "goldman sachs", "jpmorgan", "blackrock",
  // People
  "elon musk", "sam altman", "jensen huang", "jerome powell",
  "sundar pichai", "satya nadella", "mark zuckerberg",
];

// ── Factor 1: Impact Score (0–30) ────────────────────────────

function scoreImpact(article: RssArticle): number {
  const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
  let score = 0;

  for (const term of CRITICAL_IMPACT_TERMS) {
    if (text.includes(term)) {
      score += 10;
      if (score >= 30) return 30;
    }
  }
  for (const term of HIGH_IMPACT_TERMS) {
    if (text.includes(term)) {
      score += 5;
      if (score >= 30) return 30;
    }
  }
  for (const term of MEDIUM_IMPACT_TERMS) {
    if (text.includes(term)) {
      score += 2;
      if (score >= 30) return 30;
    }
  }

  return Math.min(score, 30);
}

// ── Factor 2: Story Acceleration (0–20) ──────────────────────
//
// A story is "accelerating" when:
//   - Multiple sources cover it within a short window
//   - Source diversity is high (not just same outlet rehashing)

function scoreAcceleration(
  article: RssArticle,
  allArticles: RssArticle[],
): number {
  if (allArticles.length < 2) return 0;

  const titleWords = article.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
  if (titleWords.length < 3) return 0;
  const coreWords = titleWords.slice(0, 6);

  const confirming = allArticles.filter((other) => {
    if (other.url === article.url) return false;
    if (other.source === article.source) return false;
    const otherText = other.title.toLowerCase();
    return coreWords.filter((w) => otherText.includes(w)).length >= 3;
  });

  const uniqueSources = new Set(confirming.map((a) => a.source)).size;
  const hasRecentConfirmation = confirming.some((a) => {
    if (!a.pubDate) return false;
    const ageHours = (Date.now() - new Date(a.pubDate).getTime()) / 3_600_000;
    return ageHours <= 3;
  });

  if (uniqueSources === 0) return 0;
  if (uniqueSources === 1) return hasRecentConfirmation ? 8 : 5;
  if (uniqueSources === 2) return hasRecentConfirmation ? 14 : 10;
  return hasRecentConfirmation ? 20 : 16; // 3+ sources
}

// ── Factor 3: Entity Importance (0–20) ───────────────────────

function scoreEntityImportance(article: RssArticle): number {
  const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
  let score = 0;
  let hits = 0;

  for (const entity of HIGH_IMPORTANCE_ENTITIES) {
    if (text.includes(entity)) {
      // Title hit is worth more than description hit
      const titleHit = article.title.toLowerCase().includes(entity);
      score += titleHit ? 8 : 4;
      hits++;
      if (hits >= 3 || score >= 20) return 20;
    }
  }

  return Math.min(score, 20);
}

// ── Factor 4: Narrative Persistence (0–15) ───────────────────
//
// Stories that reference an ongoing narrative get a bonus.
// Heuristic: articles referencing time-markers, sequels, or
// ongoing conflicts have higher persistence value.

const PERSISTENCE_MARKERS = [
  "continues", "ongoing", "still", "remains", "persists",
  "following last", "after the", "amid the", "since the",
  "escalation", "tensions", "week after", "month after",
  "update:", "latest:", "breaking:", "developing:",
  "as of", "now says", "further",
];

function scoreNarrativePersistence(article: RssArticle): number {
  const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
  let hits = 0;
  for (const marker of PERSISTENCE_MARKERS) {
    if (text.includes(marker)) {
      hits++;
      if (hits >= 3) break;
    }
  }
  return hits === 0 ? 0 : hits === 1 ? 5 : hits === 2 ? 10 : 15;
}

// ── Factor 5: Source Trust (0–30) ────────────────────────────

function scoreSourceTrust(article: RssArticle): number {
  const tier = getSourceTier(article.source);
  switch (tier) {
    case "A": return 30;
    case "B": return 18;
    default:  return 5;
  }
}

// ── Factor 6: Relevance Confidence (0–20) ────────────────────
//
// Converts the precision filter's 0–100 score into 0–20 points.

function scoreRelevanceConfidence(precisionScore?: PrecisionScore): number {
  if (!precisionScore) return 10; // neutral if not scored
  return Math.round((precisionScore.totalScore / 100) * 20);
}

// ── Factor 7: Recency (0–15) — tie-breaker ───────────────────

function scoreRecency(article: RssArticle): number {
  if (!article.pubDate) return 5;
  const ageHours = (Date.now() - new Date(article.pubDate).getTime()) / 3_600_000;
  if (ageHours <= 1) return 15;
  if (ageHours <= 3) return 12;
  if (ageHours <= 6) return 9;
  if (ageHours <= 12) return 6;
  if (ageHours <= 24) return 3;
  return 1;
}

// ── Priority Score ────────────────────────────────────────────

export interface PriorityScore {
  total: number;              // 0–150 composite
  breakdown: {
    impact: number;
    acceleration: number;
    entityImportance: number;
    narrativePersistence: number;
    sourceTrust: number;
    relevanceConfidence: number;
    recency: number;
  };
  priorityLabel: "critical" | "high" | "medium" | "low";
}

const PRIORITY_THRESHOLDS = {
  critical: 100,
  high: 70,
  medium: 40,
};

function labelFromTotal(total: number): PriorityScore["priorityLabel"] {
  if (total >= PRIORITY_THRESHOLDS.critical) return "critical";
  if (total >= PRIORITY_THRESHOLDS.high) return "high";
  if (total >= PRIORITY_THRESHOLDS.medium) return "medium";
  return "low";
}

// ── Main scoring function ─────────────────────────────────────

export function scoreSignalPriority(
  article: RssArticle,
  allArticles: RssArticle[] = [],
  precisionScore?: PrecisionScore,
): PriorityScore {
  const impact            = scoreImpact(article);
  const acceleration      = scoreAcceleration(article, allArticles);
  const entityImportance  = scoreEntityImportance(article);
  const narrativePersistence = scoreNarrativePersistence(article);
  const sourceTrust       = scoreSourceTrust(article);
  const relevanceConfidence = scoreRelevanceConfidence(precisionScore);
  const recency           = scoreRecency(article);

  const total =
    impact + acceleration + entityImportance + narrativePersistence +
    sourceTrust + relevanceConfidence + recency;

  return {
    total,
    breakdown: {
      impact,
      acceleration,
      entityImportance,
      narrativePersistence,
      sourceTrust,
      relevanceConfidence,
      recency,
    },
    priorityLabel: labelFromTotal(total),
  };
}

// ── Article with priority ─────────────────────────────────────

export interface PrioritizedArticle extends RssArticle {
  priorityScore: PriorityScore;
  precisionScore?: PrecisionScore;
}

/**
 * Rank articles by signal priority.
 * The "important things surface automatically" principle.
 *
 * Pipeline:
 *   1. Score each article with the 7-factor model
 *   2. Sort by priority total (descending)
 *   3. Bias: critical/high articles always come first
 *      even if they are slightly older
 */
export function rankBySignalPriority(
  articles: RssArticle[],
  precisionScores?: Map<string, PrecisionScore>,
): PrioritizedArticle[] {
  const scored: PrioritizedArticle[] = articles.map((a) => ({
    ...a,
    precisionScore: precisionScores?.get(a.url),
    priorityScore: scoreSignalPriority(a, articles, precisionScores?.get(a.url)),
  }));

  // Sort: critical first, then by total score
  scored.sort((a, b) => {
    const labelOrder: Record<PriorityScore["priorityLabel"], number> = {
      critical: 3, high: 2, medium: 1, low: 0,
    };
    const labelDiff =
      labelOrder[b.priorityScore.priorityLabel] -
      labelOrder[a.priorityScore.priorityLabel];
    if (labelDiff !== 0) return labelDiff;
    return b.priorityScore.total - a.priorityScore.total;
  });

  return scored;
}

/**
 * Filter articles below the minimum priority threshold.
 * Always keeps at least `minArticles`.
 */
export function filterLowPriority(
  articles: RssArticle[],
  precisionScores?: Map<string, PrecisionScore>,
  minArticles = 3,
): PrioritizedArticle[] {
  const ranked = rankBySignalPriority(articles, precisionScores);
  const highPriority = ranked.filter((a) => a.priorityScore.priorityLabel !== "low");

  if (highPriority.length >= minArticles) return highPriority;
  return ranked.slice(0, Math.max(minArticles, highPriority.length));
}

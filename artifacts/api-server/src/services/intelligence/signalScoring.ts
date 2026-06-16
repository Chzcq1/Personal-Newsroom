// ============================================================
// SIGNAL SCORING — Sprint 8 Task H
//
// Scores article importance to separate signal from noise.
//
// Factors:
//   - Source quality (Tier A/B/C)
//   - Multi-source confirmation (same story from multiple sources)
//   - Watchlist relevance (user-defined entities)
//   - Trend momentum (recency + frequency of topic)
//   - Geopolitical/economic significance (keyword heuristics)
//
// Low-signal articles (score < LOW_SIGNAL_THRESHOLD) are flagged
// and can be filtered from digests or ranked to the bottom.
//
// Architecture: pure functions, no side effects, no I/O.
// ============================================================

import { getSourceTier } from "../news/sourceRegistry.js";
import type { RssArticle } from "../news/rssService.js";

export interface SignalScore {
  total: number;
  breakdown: {
    sourceQuality: number;
    multiSourceConfirmation: number;
    watchlistRelevance: number;
    trendMomentum: number;
    geopoliticalSignificance: number;
    recency: number;
  };
  isHighSignal: boolean;
  isLowSignal: boolean;
  signalLabel: "critical" | "high" | "medium" | "low";
}

// ── Thresholds ───────────────────────────────────────────────

const HIGH_SIGNAL_THRESHOLD = 70;
const LOW_SIGNAL_THRESHOLD = 20;
const CRITICAL_SIGNAL_THRESHOLD = 100;

// ── Geopolitical / Economic significance keywords ────────────
// These indicate macroeconomic or systemic significance

const HIGH_SIGNIFICANCE_TERMS = [
  // Market events
  "rate hike", "rate cut", "interest rate", "federal reserve", "fed rate",
  "central bank", "inflation", "recession", "gdp", "unemployment",
  // AI/Tech breakthroughs
  "breakthrough", "launches", "released", "raises $", "billion", "acquisition",
  "acquires", "merger", "ipo", "regulation", "ban", "sanctions",
  // Geopolitical
  "war", "conflict", "sanctions", "election", "crisis", "collapse",
  "summit", "treaty", "agreement", "nuclear", "military",
  // Market moves
  "surge", "plunge", "crash", "rally", "soar", "tumble", "%", "record high",
  "record low", "all-time", "historic",
];

const MEDIUM_SIGNIFICANCE_TERMS = [
  "earnings", "revenue", "profit", "loss", "quarterly", "forecast",
  "layoffs", "hiring", "partnership", "deal", "investment", "funding",
  "product launch", "update", "new model", "version", "open source",
  "court", "lawsuit", "investigation", "probe",
];

// ── Source quality scoring ───────────────────────────────────

function scoreSourceQuality(article: RssArticle): number {
  const tier = getSourceTier(article.source);
  switch (tier) {
    case "A": return 25;
    case "B": return 15;
    case "C": return 5;
    default: return 0;
  }
}

// ── Recency scoring ──────────────────────────────────────────

function scoreRecency(article: RssArticle): number {
  if (!article.pubDate) return 0;
  const ageHours = (Date.now() - new Date(article.pubDate).getTime()) / 3_600_000;
  if (ageHours <= 1) return 30;
  if (ageHours <= 3) return 25;
  if (ageHours <= 6) return 18;
  if (ageHours <= 12) return 12;
  if (ageHours <= 24) return 6;
  return 0;
}

// ── Geopolitical/economic significance ──────────────────────

function scoreGeopoliticalSignificance(article: RssArticle): number {
  const text = `${article.title} ${article.description ?? ""}`.toLowerCase();

  let score = 0;
  for (const term of HIGH_SIGNIFICANCE_TERMS) {
    if (text.includes(term)) {
      score += 8;
      if (score >= 24) break; // cap at 3 high matches
    }
  }
  for (const term of MEDIUM_SIGNIFICANCE_TERMS) {
    if (text.includes(term)) {
      score += 3;
      if (score >= 24) break;
    }
  }

  return Math.min(score, 24);
}

// ── Watchlist relevance ──────────────────────────────────────

function scoreWatchlistRelevance(
  article: RssArticle,
  watchlist: string[],
): number {
  if (watchlist.length === 0) return 0;
  const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
  const hits = watchlist.filter((term) => text.includes(term.toLowerCase())).length;
  return Math.min(hits * 15, 30);
}

// ── Multi-source confirmation ────────────────────────────────
// Detects if similar articles exist in the article set (same story, different source)

function scoreMultiSourceConfirmation(
  article: RssArticle,
  allArticles: RssArticle[],
): number {
  const titleWords = article.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
  if (titleWords.length < 3) return 0;

  const coreWords = titleWords.slice(0, 6); // first 6 significant words
  let confirmations = 0;

  for (const other of allArticles) {
    if (other.url === article.url) continue;
    if (other.source === article.source) continue;
    const otherText = other.title.toLowerCase();
    const matches = coreWords.filter((w) => otherText.includes(w)).length;
    if (matches >= 3) {
      confirmations++;
    }
  }

  if (confirmations === 0) return 0;
  if (confirmations === 1) return 10;
  if (confirmations === 2) return 18;
  return 25; // 3+ confirmations = high signal
}

// ── Trend momentum ───────────────────────────────────────────
// Simple heuristic: length and specificity of article title/description

function scoreTrendMomentum(article: RssArticle): number {
  const title = article.title ?? "";
  const desc = article.description ?? "";

  let score = 0;

  // Articles with numbers/specifics are higher signal
  if (/\d+/.test(title)) score += 5;
  // Named entities (capitalized words) signal specificity
  const capitalizedWords = (title.match(/\b[A-Z][a-zA-Z]{2,}\b/g) ?? []).length;
  score += Math.min(capitalizedWords * 2, 10);
  // Description length indicates depth
  if (desc.length > 200) score += 5;

  return Math.min(score, 15);
}

// ── Main scoring function ────────────────────────────────────

/**
 * Score a single article for signal quality.
 * Optionally provide allArticles for multi-source confirmation.
 */
export function scoreSignal(
  article: RssArticle,
  allArticles: RssArticle[] = [],
  watchlist: string[] = [],
): SignalScore {
  const sourceQuality = scoreSourceQuality(article);
  const recency = scoreRecency(article);
  const geopoliticalSignificance = scoreGeopoliticalSignificance(article);
  const watchlistRelevance = scoreWatchlistRelevance(article, watchlist);
  const multiSourceConfirmation = scoreMultiSourceConfirmation(article, allArticles);
  const trendMomentum = scoreTrendMomentum(article);

  const total =
    sourceQuality +
    recency +
    geopoliticalSignificance +
    watchlistRelevance +
    multiSourceConfirmation +
    trendMomentum;

  const isHighSignal = total >= HIGH_SIGNAL_THRESHOLD;
  const isLowSignal = total < LOW_SIGNAL_THRESHOLD;

  let signalLabel: SignalScore["signalLabel"];
  if (total >= CRITICAL_SIGNAL_THRESHOLD) signalLabel = "critical";
  else if (total >= HIGH_SIGNAL_THRESHOLD) signalLabel = "high";
  else if (total >= LOW_SIGNAL_THRESHOLD) signalLabel = "medium";
  else signalLabel = "low";

  return {
    total,
    breakdown: {
      sourceQuality,
      multiSourceConfirmation,
      watchlistRelevance,
      trendMomentum,
      geopoliticalSignificance,
      recency,
    },
    isHighSignal,
    isLowSignal,
    signalLabel,
  };
}

/**
 * Score all articles and return them sorted by signal (highest first).
 * Low-signal articles are placed last.
 */
export function rankBySignal(
  articles: RssArticle[],
  watchlist: string[] = [],
): Array<RssArticle & { signalScore: SignalScore }> {
  const scored = articles.map((a) => ({
    ...a,
    signalScore: scoreSignal(a, articles, watchlist),
  }));

  scored.sort((a, b) => b.signalScore.total - a.signalScore.total);

  return scored;
}

/**
 * Filter out low-signal articles from a set.
 * Always keeps at least `minArticles` even if all are low-signal.
 */
export function filterLowSignal(
  articles: RssArticle[],
  minArticles = 3,
  watchlist: string[] = [],
): RssArticle[] {
  const ranked = rankBySignal(articles, watchlist);
  const highSignal = ranked.filter((a) => !a.signalScore.isLowSignal);

  if (highSignal.length >= minArticles) return highSignal;
  return ranked.slice(0, Math.max(minArticles, highSignal.length));
}

// ============================================================
// STRATEGIC CONTEXT ENGINE — Sprint 16 Task C
//
// Generates personalised "Why This Matters To YOU" explanations
// for narratives and articles.
//
// NO additional AI calls — uses heuristic matching against:
//   - User interests (declared + adaptive)
//   - Watchlist entities
//   - Narrative memory (recurring threads)
//   - Entity memory (trending + focus)
//
// Output examples:
//   "You follow Nvidia and AI infrastructure. This development
//    may affect GPU supply chains over the next 2–4 weeks."
//
//   "This matches your Bitcoin ETF watchlist and has accelerated
//    across 4 financial sources in the last 3 hours."
//
// Architecture: pure functions, no I/O, no side effects.
// ============================================================

import type { RssArticle } from "../news/rssService.js";
import type { ConfidenceScore } from "./confidenceScoring.js";
import { INTEREST_GRAPH } from "./interestGraph.js";

// ── Types ─────────────────────────────────────────────────────

export interface StrategicContext {
  whyItMatters: string;           // personalised 1–2 sentence explanation
  relevanceReason: string;        // short tag: "Matches watchlist", "Trending entity"
  matchedUserInterests: string[]; // user interests that triggered this
  matchedWatchlist: string[];     // watchlist items matched
  timeHorizon: string;            // "next 24h" / "next 2–4 weeks" / "long-term"
  strategicWeight: "critical" | "high" | "medium" | "low";
  watchEntities: string[];        // "Watch: TSMC, Nvidia supply chain"
}

// ── Interest label map ────────────────────────────────────────

const INTEREST_LABELS: Record<string, string> = {
  ai: "AI & machine learning",
  technology: "technology",
  stocks: "financial markets",
  economy: "macroeconomics",
  politics: "politics & policy",
  crypto: "cryptocurrency",
  climate: "climate & energy",
};

// ── Time horizon heuristics ───────────────────────────────────

function inferTimeHorizon(text: string): string {
  const lower = text.toLowerCase();
  if (/\btoday\b|hour|breaking|emergency|immediate/.test(lower)) return "next 24 hours";
  if (/\bweek\b|short-term|near-term|upcoming/.test(lower)) return "next 1–2 weeks";
  if (/\bmonth\b|quarter|q[1-4]\b|earnings/.test(lower)) return "next 1–3 months";
  if (/\byear\b|annual|long-term|structural/.test(lower)) return "next 6–12 months";
  return "next 2–4 weeks";
}

// ── Entity extraction from article ───────────────────────────

function extractMentionedInterestEntities(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const [id, node] of Object.entries(INTEREST_GRAPH)) {
    if (node.coreKeywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      matched.push(id);
    }
  }
  return matched;
}

// ── Watchlist matching ────────────────────────────────────────

function matchWatchlist(text: string, watchlist: string[]): string[] {
  const lower = text.toLowerCase();
  return watchlist.filter((w) => lower.includes(w.toLowerCase()));
}

// ── Strategic weight from confidence + interest overlap ───────

function inferStrategicWeight(
  interestOverlap: number,
  watchlistHits: number,
  confidence: ConfidenceScore,
): StrategicContext["strategicWeight"] {
  if (watchlistHits > 0 && confidence.total >= 60) return "critical";
  if (watchlistHits > 0 || (interestOverlap >= 2 && confidence.total >= 50)) return "high";
  if (interestOverlap >= 1 && confidence.total >= 30) return "medium";
  return "low";
}

// ── "Watch entities" suggestion ───────────────────────────────

function suggestWatchEntities(
  matchedInterests: string[],
  text: string,
): string[] {
  const suggestions: string[] = [];
  const lower = text.toLowerCase();

  const SECTOR_WATCH_MAP: Record<string, string[]> = {
    ai: ["OpenAI", "Anthropic", "Nvidia", "AI cloud providers"],
    technology: ["Microsoft", "Apple", "Google", "Meta"],
    stocks: ["S&P 500", "Federal Reserve", "interest rates"],
    economy: ["CPI", "Federal Reserve", "Treasury yields"],
    crypto: ["Bitcoin ETF", "SEC crypto policy", "Coinbase"],
    climate: ["energy transition", "carbon credits", "EVs"],
    politics: ["SEC regulations", "trade policy", "geopolitical risk"],
  };

  // Sector-based suggestions
  for (const interest of matchedInterests) {
    const watchItems = SECTOR_WATCH_MAP[interest] ?? [];
    for (const item of watchItems.slice(0, 2)) {
      if (!suggestions.includes(item) && !lower.includes(item.toLowerCase())) {
        suggestions.push(item);
      }
    }
  }

  // Specific entity co-occurrence hints
  if (lower.includes("nvidia") && !lower.includes("tsmc")) suggestions.push("TSMC supply chain");
  if (lower.includes("fed") || lower.includes("interest rate")) suggestions.push("10-year Treasury yield");
  if (lower.includes("openai") || lower.includes("gpt")) suggestions.push("AI compute costs");
  if (lower.includes("bitcoin") && lower.includes("etf")) suggestions.push("BlackRock BTC ETF flows");

  return [...new Set(suggestions)].slice(0, 4);
}

// ── Why-it-matters text builder ───────────────────────────────

function buildWhyItMatters(
  matchedInterests: string[],
  matchedWatchlist: string[],
  timeHorizon: string,
  confidence: ConfidenceScore,
  articleTitle: string,
): string {
  if (matchedWatchlist.length > 0) {
    const wl = matchedWatchlist.slice(0, 2).join(" and ");
    const confirmation =
      confidence.sourceAgreementCount >= 3
        ? `has been confirmed across ${confidence.sourceAgreementCount} sources`
        : confidence.isMultiSource
        ? "has multi-source confirmation"
        : "is an early signal";
    return `This ${confirmation} and directly matches your watchlist: ${wl}. Horizon: ${timeHorizon}.`;
  }

  if (matchedInterests.length >= 2) {
    const interests = matchedInterests
      .slice(0, 2)
      .map((i) => INTEREST_LABELS[i] ?? i)
      .join(" and ");
    return `You follow ${interests}. This development may have cascading effects over the ${timeHorizon}.`;
  }

  if (matchedInterests.length === 1) {
    const interest = INTEREST_LABELS[matchedInterests[0]] ?? matchedInterests[0];
    return `Relevant to your ${interest} focus. Signal confidence: ${confidence.signalClassConfig.label}. Horizon: ${timeHorizon}.`;
  }

  // Fallback — signal quality based
  if (confidence.total >= 70) {
    return `High-confidence signal (${confidence.total}/100) with ${confidence.sourceAgreementCount} independent sources. Horizon: ${timeHorizon}.`;
  }

  return `Emerging signal — ${confidence.signalClassConfig.description}. Horizon: ${timeHorizon}.`;
}

function buildRelevanceReason(
  matchedInterests: string[],
  matchedWatchlist: string[],
  confidence: ConfidenceScore,
): string {
  if (matchedWatchlist.length > 0) return "Watchlist match";
  if (matchedInterests.length >= 2) return "Interest overlap";
  if (matchedInterests.length === 1) return `${INTEREST_LABELS[matchedInterests[0]] ?? matchedInterests[0]} signal`;
  if (confidence.total >= 70) return "High confidence";
  if (confidence.isMultiSource) return "Multi-source confirmed";
  return "Emerging signal";
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Generate a personalised strategic context for an article.
 *
 * @param article       The article to contextualise
 * @param interests     User's declared + adaptive interests
 * @param watchlist     User's explicit watchlist entities
 * @param confidence    Pre-computed confidence score for this article
 * @param allArticles   Full article corpus (for acceleration signals)
 */
export function buildStrategicContext(
  article: RssArticle,
  interests: string[],
  watchlist: string[],
  confidence: ConfidenceScore,
  allArticles: RssArticle[] = [],
): StrategicContext {
  const text = `${article.title} ${article.description ?? ""}`;

  const mentionedEntities = extractMentionedInterestEntities(text);
  const matchedInterests = interests.filter((i) => mentionedEntities.includes(i));
  const matchedWatchlist = matchWatchlist(text, watchlist);
  const timeHorizon = inferTimeHorizon(text);
  const strategicWeight = inferStrategicWeight(
    matchedInterests.length,
    matchedWatchlist.length,
    confidence,
  );

  return {
    whyItMatters: buildWhyItMatters(
      matchedInterests,
      matchedWatchlist,
      timeHorizon,
      confidence,
      article.title,
    ),
    relevanceReason: buildRelevanceReason(matchedInterests, matchedWatchlist, confidence),
    matchedUserInterests: matchedInterests,
    matchedWatchlist,
    timeHorizon,
    strategicWeight,
    watchEntities: suggestWatchEntities(matchedInterests, text),
  };
}

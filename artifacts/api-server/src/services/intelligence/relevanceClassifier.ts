// ============================================================
// SEMANTIC RELEVANCE CLASSIFIER — Sprint 9 Task B
//
// Classifies articles into 4 relevance tiers:
//   "direct"      — matches core interest keywords directly
//   "contextual"  — matches graph-related entities (1–2 hops)
//   "weak"        — partial or low-weight graph match
//   "incidental"  — only topic-level match, no interest signal
//
// Combines:
//   1. Direct keyword score (feedGenerator INTEREST_DEFINITIONS)
//   2. Interest graph score (interestGraph.ts)
//   3. Entity overlap (named entity presence)
//   4. Source quality modifier
//   5. Recency modifier
//
// Output:
//   RelevanceClassification — used for ranking + filtering + display
// ============================================================

import {
  expandInterests,
  getGraphScore,
  type ExpandedEntity,
} from "./interestGraph.js";
import { getSourceTier } from "../news/sourceRegistry.js";
import type { RssArticle } from "../news/rssService.js";

export type RelevanceClass = "direct" | "contextual" | "weak" | "incidental";

export interface RelevanceClassification {
  class: RelevanceClass;
  combinedScore: number;          // 0–200 composite score
  directKeywordScore: number;     // raw interest keyword hits
  graphScore: number;             // 0.0–1.0 graph proximity
  entityOverlapScore: number;     // named entity overlap
  sourceModifier: number;         // source quality multiplier component
  matchedEntities: string[];      // graph-matched entity names
  directMatches: string[];        // interest keywords that hit directly
  explanation: string;            // human-readable "why" string
}

// ── Classifier thresholds ─────────────────────────────────────

const DIRECT_THRESHOLD = 60;     // combined score for "direct"
const CONTEXTUAL_THRESHOLD = 30; // for "contextual"
const WEAK_THRESHOLD = 10;       // for "weak"

// ── Named entity extraction ──────────────────────────────────
// Fast heuristic: capitalized consecutive words

function extractNamedEntities(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?\b/g) ?? [];
  return [...new Set(matches)].filter((m) => m.length > 2);
}

// ── Recency modifier ─────────────────────────────────────────

function getRecencyModifier(pubDate: string | null | undefined): number {
  if (!pubDate) return 1.0;
  const ageHours = (Date.now() - new Date(pubDate).getTime()) / 3_600_000;
  if (ageHours <= 2) return 1.3;
  if (ageHours <= 6) return 1.2;
  if (ageHours <= 12) return 1.1;
  if (ageHours <= 24) return 1.0;
  return 0.85;
}

// ── Source modifier ──────────────────────────────────────────

function getSourceModifier(source: string | null | undefined): number {
  const tier = getSourceTier(source);
  switch (tier) {
    case "A": return 15;
    case "B": return 8;
    default: return 0;
  }
}

// ── Direct keyword scoring ───────────────────────────────────

function scoreDirectKeywords(
  text: string,
  interests: string[],
  interestKeywordMap: Map<string, string[]>,
): { score: number; matches: string[] } {
  const lower = text.toLowerCase();
  const matches: string[] = [];
  let score = 0;

  for (const interest of interests) {
    const keywords = interestKeywordMap.get(interest) ?? [];
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += 20;
        if (!matches.includes(interest)) matches.push(interest);
        break;
      }
    }
  }

  return { score: Math.min(score, 80), matches };
}

// ── Main classifier ──────────────────────────────────────────

/**
 * Classify a single article's relevance to a set of user interests.
 *
 * @param article       — the article to classify
 * @param interests     — user's active interest keys
 * @param interestKeywordMap — pre-built map: interest → keyword list
 * @param expandedGraph — pre-computed interest graph expansion
 */
export function classifyRelevance(
  article: RssArticle,
  interests: string[],
  interestKeywordMap: Map<string, string[]>,
  expandedGraph: Map<string, ExpandedEntity>,
): RelevanceClassification {
  const text = `${article.title} ${article.description ?? ""}`;

  // 1. Direct keyword match
  const { score: directScore, matches: directMatches } = scoreDirectKeywords(
    text,
    interests,
    interestKeywordMap,
  );

  // 2. Interest graph score
  const { score: graphScoreRaw, matchedEntities } = getGraphScore(text, expandedGraph);
  const graphScore = graphScoreRaw * 60; // scale to 0–60

  // 3. Entity overlap: named entities in article that appear in interest labels
  const entities = extractNamedEntities(text);
  const interestLabels = interests.map((i) => i.toLowerCase());
  const entityHits = entities.filter((e) => interestLabels.some((l) => e.toLowerCase().includes(l))).length;
  const entityOverlapScore = Math.min(entityHits * 10, 30);

  // 4. Source modifier
  const sourceModifier = getSourceModifier(article.source);

  // 5. Recency modifier (multiplicative)
  const recencyMod = getRecencyModifier(article.pubDate);

  // Combined score (before recency)
  const baseScore = directScore + graphScore + entityOverlapScore + sourceModifier;
  const combinedScore = Math.round(baseScore * recencyMod);

  // 6. Determine class
  let cls: RelevanceClass;
  if (directScore >= 20 && combinedScore >= DIRECT_THRESHOLD) {
    cls = "direct";
  } else if (combinedScore >= CONTEXTUAL_THRESHOLD) {
    cls = "contextual";
  } else if (combinedScore >= WEAK_THRESHOLD) {
    cls = "weak";
  } else {
    cls = "incidental";
  }

  // 7. Build explanation
  const explanation = buildExplanation(
    cls,
    directMatches,
    matchedEntities,
    article.source,
    getSourceTier(article.source),
    article.pubDate,
  );

  return {
    class: cls,
    combinedScore,
    directKeywordScore: directScore,
    graphScore: Math.round(graphScoreRaw * 100) / 100,
    entityOverlapScore,
    sourceModifier,
    matchedEntities,
    directMatches,
    explanation,
  };
}

// ── Explanation builder (Task I) ─────────────────────────────

function buildExplanation(
  cls: RelevanceClass,
  directMatches: string[],
  graphEntities: string[],
  source: string | null | undefined,
  sourceTier: string,
  pubDate: string | null | undefined,
): string {
  const parts: string[] = [];

  if (cls === "direct") {
    if (directMatches.length > 0) {
      parts.push(`High relevance to your ${directMatches.join(" & ")} interest`);
    } else {
      parts.push("Directly relevant to your interests");
    }
  } else if (cls === "contextual") {
    if (graphEntities.length > 0) {
      // Map entity IDs to labels for display
      const labels = graphEntities.slice(0, 2).join(" & ");
      parts.push(`Contextually related: ${labels} ecosystem`);
    } else {
      parts.push("Contextually relevant to your profile");
    }
  } else if (cls === "weak") {
    parts.push("Loosely connected to your interests");
  } else {
    parts.push("General coverage");
  }

  // Add source quality signal
  if (sourceTier === "A" && source) {
    parts.push(`${source} (Tier A)`);
  }

  // Add recency signal
  if (pubDate) {
    const ageHours = (Date.now() - new Date(pubDate).getTime()) / 3_600_000;
    if (ageHours <= 2) parts.push("Breaking");
    else if (ageHours <= 6) parts.push("Recent");
  }

  return parts.join(" · ");
}

/**
 * Classify multiple articles and return sorted by combined score.
 */
export function classifyAndRankArticles(
  articles: RssArticle[],
  interests: string[],
  interestKeywordMap: Map<string, string[]>,
): Array<RssArticle & { relevance: RelevanceClassification }> {
  const expanded = expandInterests(interests);

  const classified = articles.map((a) => ({
    ...a,
    relevance: classifyRelevance(a, interests, interestKeywordMap, expanded),
  }));

  // Sort: direct > contextual > weak > incidental, then by combinedScore
  const classOrder: Record<RelevanceClass, number> = {
    direct: 4, contextual: 3, weak: 2, incidental: 1,
  };

  classified.sort((a, b) => {
    const classDiff = classOrder[b.relevance.class] - classOrder[a.relevance.class];
    if (classDiff !== 0) return classDiff;
    return b.relevance.combinedScore - a.relevance.combinedScore;
  });

  return classified;
}

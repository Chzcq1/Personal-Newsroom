// ============================================================
// NEWS COLLECTOR SERVICE — Aggregate, rank, and select articles
//
// Pipeline:
//   1. Fetch all RSS sources for the topic in parallel
//   2. Collect per-feed diagnostics (for debug panel)
//   3. Deduplicate by URL
//   4. Near-duplicate detection on titles (word-overlap)
//   5. Apply precision filter — removes crypto noise + weak matches
//   6. Rank by signal priority — 7-factor model (Sprint 15)
//      (replaces simple recency+quality sort)
//   7. Apply source diversity to final selection
//   8. Return top MAX_ARTICLES_FOR_AI
//
// Sprint 5: Source diversity factor + interest priority boost
// Sprint 6: Custom topics support
// Sprint 15: Precision filter (Task A) + Signal priority (Task B)
//
// Returns CollectionResult with articles, feed diagnostics,
// and per-article priority metadata for frontend signal badges.
// ============================================================

import { TOPIC_RSS_SOURCES } from "../../config/topics.js";
import { fetchFeed, type RssArticle, type FeedDiagnostic } from "./rssService.js";
import { getCustomTopicById } from "./customTopicsService.js";
import {
  applyPrecisionFilter,
  getTopicKeywordsForInterests,
  type ScoredWithPrecision,
} from "../intelligence/precisionFilter.js";
import {
  rankBySignalPriority,
  type PrioritizedArticle,
} from "../intelligence/signalPriorityEngine.js";
import { logger } from "../../lib/logger.js";

export type { FeedDiagnostic };

const MAX_ARTICLES_FOR_AI = 10;

// ── Source diversity scoring ──────────────────────────────────

function sourceDiversityPenalty(
  source: string | undefined,
  selectedSources: Map<string, number>,
): number {
  if (!source) return 0;
  const count = selectedSources.get(source) ?? 0;
  if (count === 0) return 0;
  if (count === 1) return 15;
  return 30;
}

// ── Jaccard similarity for near-duplicate detection ───────────

function titleSimilarity(a: string, b: string): number {
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\u0e00-\u0e7f\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );
  const setA = words(a);
  const setB = words(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  return intersection / (setA.size + setB.size - intersection);
}

// ── Types ─────────────────────────────────────────────────────

export interface ArticleWithPriority extends RssArticle {
  priorityLabel?: "critical" | "high" | "medium" | "low";
  priorityTotal?: number;
  precisionScore?: number;
  hitEntities?: string[];
  isCryptoDowngraded?: boolean;
}

export interface CollectionResult {
  articles: ArticleWithPriority[];
  feedDiagnostics: FeedDiagnostic[];
  totalConfigured: number;
  totalCollected: number;
  failedFeeds: number;
  suppressedCount: number;   // articles removed by precision filter
  cryptoDowngradedCount: number; // crypto articles downgraded
}

// ── Main Export ────────────────────────────────────────────

/**
 * Collect, filter, rank, and return the best articles for a topic.
 *
 * Sprint 15 pipeline: precision filter → signal priority ranking
 * replaces the simple recency+quality sort from earlier sprints.
 *
 * @param topicId   - Built-in or custom topic ID
 * @param interests - User interest keys for precision scoring
 */
export async function collectArticlesForTopic(
  topicId: string,
  interests: string[] = [],
): Promise<CollectionResult> {
  // Resolve sources: built-in first, then custom topics
  let sources = TOPIC_RSS_SOURCES[topicId];

  if (!sources || sources.length === 0) {
    const customTopic = getCustomTopicById(topicId);
    if (customTopic && customTopic.sources.length > 0) {
      sources = customTopic.sources;
      logger.info({ topicId, sourceCount: sources.length }, "Using custom topic sources");
    } else {
      logger.warn({ topicId }, "No RSS sources configured for topic");
      return {
        articles: [],
        feedDiagnostics: [],
        totalConfigured: 0,
        totalCollected: 0,
        failedFeeds: 0,
        suppressedCount: 0,
        cryptoDowngradedCount: 0,
      };
    }
  }

  logger.info({ topicId, sourceCount: sources.length }, "Fetching RSS sources");

  const feedResults = await Promise.allSettled(
    sources.map((src) => fetchFeed(src.url, src.name)),
  );

  let failedFeeds = 0;
  const allArticles: RssArticle[] = [];
  const feedDiagnostics: FeedDiagnostic[] = [];
  const seenUrls = new Set<string>();

  for (const result of feedResults) {
    if (result.status === "rejected") {
      failedFeeds++;
      continue;
    }

    const { articles, diagnostic } = result.value;
    feedDiagnostics.push(diagnostic);

    if (diagnostic.status === "failed") {
      failedFeeds++;
    }

    for (const article of articles) {
      if (!seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        allArticles.push(article);
      }
    }
  }

  if (allArticles.length === 0) {
    return {
      articles: [],
      feedDiagnostics,
      totalConfigured: sources.length,
      totalCollected: 0,
      failedFeeds,
      suppressedCount: 0,
      cryptoDowngradedCount: 0,
    };
  }

  // ── Step 1: Precision filter ─────────────────────────────────
  //
  // Remove crypto noise and weak-match articles.
  // Always keeps at least 4 articles even if all are suppressed.

  const topicKeywords = getTopicKeywordsForInterests(interests);
  const precisionFiltered: ScoredWithPrecision[] = applyPrecisionFilter(
    allArticles,
    interests,
    topicKeywords,
    4, // minArticles
  );

  const suppressedCount = allArticles.length - precisionFiltered.length;
  const cryptoDowngradedCount = precisionFiltered.filter(
    (a) => a.precisionScore.isCryptoDowngraded,
  ).length;

  // ── Step 2: Signal priority ranking ─────────────────────────
  //
  // Build precision score map for the priority engine
  const precisionMap = new Map(
    precisionFiltered.map((a) => [a.url, a.precisionScore]),
  );

  const prioritized: PrioritizedArticle[] = rankBySignalPriority(
    precisionFiltered,
    precisionMap,
  );

  // ── Step 3: Near-duplicate suppression + source diversity ────

  const selected: ArticleWithPriority[] = [];
  const selectedSources = new Map<string, number>();

  for (const article of prioritized) {
    // Near-duplicate check
    const isDuplicate = selected.some(
      (s) => titleSimilarity(s.title, article.title) > 0.65,
    );
    if (isDuplicate) continue;

    // Source diversity penalty (reduces score but doesn't hard-exclude)
    const penalty = sourceDiversityPenalty(article.source, selectedSources);
    const adjustedScore = article.priorityScore.total - penalty;

    // Always keep critical/high articles regardless of diversity penalty
    const isMustKeep = article.priorityScore.priorityLabel === "critical" ||
                       article.priorityScore.priorityLabel === "high";

    if (adjustedScore > 0 || isMustKeep) {
      selected.push({
        ...article,
        priorityLabel: article.priorityScore.priorityLabel,
        priorityTotal: article.priorityScore.total,
        precisionScore: article.precisionScore?.totalScore,
        hitEntities: article.precisionScore?.hitEntities,
        isCryptoDowngraded: article.precisionScore?.isCryptoDowngraded,
      });
      const src = article.source ?? "__unknown__";
      selectedSources.set(src, (selectedSources.get(src) ?? 0) + 1);
    }

    if (selected.length >= MAX_ARTICLES_FOR_AI) break;
  }

  logger.info(
    {
      topicId,
      sourceCount: sources.length,
      failedFeeds,
      totalCollected: allArticles.length,
      afterPrecision: precisionFiltered.length,
      suppressedCount,
      cryptoDowngradedCount,
      afterRanking: selected.length,
      interestsApplied: interests.length,
    },
    "Articles collected, filtered, and ranked",
  );

  return {
    articles: selected,
    feedDiagnostics,
    totalConfigured: sources.length,
    totalCollected: allArticles.length,
    failedFeeds,
    suppressedCount,
    cryptoDowngradedCount,
  };
}

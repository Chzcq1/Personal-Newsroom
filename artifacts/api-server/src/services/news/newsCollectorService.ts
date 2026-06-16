// ============================================================
// NEWS COLLECTOR SERVICE — Aggregate, rank, and select articles
//
// Pipeline:
//   1. Fetch all RSS sources for the topic in parallel
//   2. Collect per-feed diagnostics (for debug panel)
//   3. Deduplicate by URL
//   4. Near-duplicate detection on titles (word-overlap)
//   5. Score each article: recency + quality + source diversity (Task D)
//   6. Apply interest boost scoring if interests provided (Task E)
//   7. Sort by score descending, return top MAX_ARTICLES_FOR_AI
//
// Sprint 5 additions:
//   Task D — Source diversity factor: articles from already-used sources
//             receive a penalty to promote cross-source variety.
//   Task E — Interest priority: articles matching user interests receive
//             a boost, pushing them ahead of irrelevant content.
//
// Sprint 6 addition:
//   Custom topics — if no built-in RSS sources found, check
//   customTopicsService for user-defined topic sources.
//
// Returns CollectionResult with articles AND feed diagnostics.
// Diagnostics allow the API route to surface specific failure reasons
// instead of generic error messages.
//
// Logging contract:
//   INFO  — collection summary (topic, feedCount, total, selected, failedFeeds)
//   WARN  — individual feed failure (logged in rssService)
// ============================================================

import { TOPIC_RSS_SOURCES } from "../../config/topics.js";
import { fetchFeed, type RssArticle, type FeedDiagnostic } from "./rssService.js";
import { scoreArticleByInterests } from "./feedGenerator.js";
import { getCustomTopicById } from "./customTopicsService.js";
import { logger } from "../../lib/logger.js";

export type { FeedDiagnostic };

const MAX_ARTICLES_FOR_AI = 10;

// ── Scoring ────────────────────────────────────────────

function recencyScore(pubDate?: string): number {
  if (!pubDate) return 10;
  const ageHours = (Date.now() - new Date(pubDate).getTime()) / 3_600_000;
  if (ageHours <= 6) return 50;
  if (ageHours <= 24) return 40;
  if (ageHours <= 48) return 30;
  if (ageHours <= 168) return 20; // within one week
  return 10;
}

function qualityScore(article: RssArticle): number {
  if (!article.description) return 0;
  if (article.description.length > 150) return 30;
  return 15;
}

// Task D — Source diversity score
// Penalise articles from sources that are already well-represented.
// The penalty is applied during final selection, not during initial scoring.
function sourceDiversityPenalty(
  source: string | undefined,
  selectedSources: Map<string, number>,
): number {
  if (!source) return 0;
  const count = selectedSources.get(source) ?? 0;
  if (count === 0) return 0;
  if (count === 1) return 15; // second article from same source: -15
  return 30;                  // third+ article from same source: -30
}

// Jaccard similarity on word sets — used for near-duplicate detection
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

// ── Types ───────────────────────────────────────────────────

export interface CollectionResult {
  articles: RssArticle[];
  feedDiagnostics: FeedDiagnostic[];
  totalConfigured: number;
  totalCollected: number;
  failedFeeds: number;
}

// ── Main Export ────────────────────────────────────────────

/**
 * Collect, deduplicate, rank, and return the best articles for a topic.
 * Also returns per-feed diagnostics for error surfacing and the debug panel.
 *
 * Supports both built-in topics (from TOPIC_RSS_SOURCES) and custom topics
 * (from customTopicsService). Custom topics are checked when no built-in
 * sources exist for the topicId.
 *
 * @param topicId   - One of the topic IDs from TOPICS in config/topics.ts,
 *                    or a custom topic ID created via the Topics API.
 * @param interests - (Optional) User interest keys for boost scoring (Task E)
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

  // Base score: recency + quality
  const scored = allArticles.map((article) => ({
    article,
    baseScore: recencyScore(article.pubDate) + qualityScore(article),
    // Task E — interest boost
    interestBoost: interests.length > 0 ? scoreArticleByInterests(article, interests) : 0,
  }));

  // Sort by combined score (base + interest boost) descending
  scored.sort((a, b) => (b.baseScore + b.interestBoost) - (a.baseScore + a.interestBoost));

  // Near-duplicate suppression + source diversity (Task D)
  const selected: RssArticle[] = [];
  const selectedSources = new Map<string, number>();

  for (const { article, baseScore, interestBoost } of scored) {
    // Near-duplicate check
    const isDuplicate = selected.some(
      (s) => titleSimilarity(s.title, article.title) > 0.65,
    );
    if (isDuplicate) continue;

    // Apply source diversity penalty (Task D)
    const penalty = sourceDiversityPenalty(article.source, selectedSources);
    const finalScore = baseScore + interestBoost - penalty;

    // Always add interest-boosted articles; apply score threshold for others
    if (finalScore > 0 || interestBoost > 0) {
      selected.push(article);
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
      afterRanking: selected.length,
      interestsApplied: interests.length,
    },
    "Articles collected and ranked",
  );

  return {
    articles: selected,
    feedDiagnostics,
    totalConfigured: sources.length,
    totalCollected: allArticles.length,
    failedFeeds,
  };
}

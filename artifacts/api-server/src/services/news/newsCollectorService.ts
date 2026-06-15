// ============================================================
// NEWS COLLECTOR SERVICE — Aggregate, rank, and select articles
//
// Pipeline:
//   1. Fetch all RSS sources for the topic in parallel
//   2. Deduplicate by URL
//   3. Near-duplicate detection on titles (word-overlap)
//   4. Score each article: recency + quality
//   5. Sort by score descending, return top MAX_ARTICLES_FOR_AI
//
// Logging contract:
//   INFO  — collection summary (topic, feedCount, total, selected, failedFeeds)
//   WARN  — individual feed failure (logged in rssService)
// ============================================================

import { TOPIC_RSS_SOURCES } from "../../config/topics.js";
import { fetchFeed, type RssArticle } from "./rssService.js";
import { logger } from "../../lib/logger.js";

const MAX_ARTICLES_FOR_AI = 10;

// ── Scoring ────────────────────────────────────────────────

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

// ── Main Export ────────────────────────────────────────────

/**
 * Collect, deduplicate, rank, and return the best articles for a topic.
 *
 * @param topicId - One of the topic IDs from TOPICS in config/topics.ts
 */
export async function collectArticlesForTopic(
  topicId: string,
): Promise<RssArticle[]> {
  const sources = TOPIC_RSS_SOURCES[topicId];
  if (!sources || sources.length === 0) {
    logger.warn({ topicId }, "No RSS sources configured for topic");
    return [];
  }

  logger.info({ topicId, sourceCount: sources.length }, "Fetching RSS sources");

  const feedResults = await Promise.allSettled(
    sources.map((src) => fetchFeed(src.url, src.name)),
  );

  // Count feed failures for logging
  let failedFeeds = 0;
  const allArticles: RssArticle[] = [];
  const seenUrls = new Set<string>();

  for (const result of feedResults) {
    if (result.status === "rejected") {
      failedFeeds++;
      continue;
    }
    if (result.value.length === 0) {
      failedFeeds++;
    }
    for (const article of result.value) {
      if (!seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        allArticles.push(article);
      }
    }
  }

  // Score each article
  const scored = allArticles.map((article) => ({
    article,
    score: recencyScore(article.pubDate) + qualityScore(article),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Near-duplicate suppression — skip articles whose title is >65% similar
  // to an already-selected article
  const selected: RssArticle[] = [];
  for (const { article } of scored) {
    const isDuplicate = selected.some(
      (s) => titleSimilarity(s.title, article.title) > 0.65,
    );
    if (!isDuplicate) {
      selected.push(article);
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
    },
    "Articles collected and ranked",
  );

  return selected;
}

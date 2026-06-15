// ============================================================
// NEWS COLLECTOR SERVICE — Aggregate articles from all feeds for a topic
//
// Fetches all RSS feeds for a topic in parallel, deduplicates by URL,
// and returns a sorted, trimmed article list ready for AI summarization.
// ============================================================

import { TOPIC_RSS_FEEDS } from "../../config/topics.js";
import { fetchFeed, type RssArticle } from "./rssService.js";
import { logger } from "../../lib/logger.js";

const MAX_ARTICLES_FOR_AI = 12;

/**
 * Collect news articles for a topic from all configured RSS feeds.
 * Feeds are fetched in parallel; individual feed failures are silently skipped.
 *
 * @param topicId - One of the topic IDs from TOPICS in config/topics.ts
 * @returns Deduplicated, sorted articles (newest first), capped at MAX_ARTICLES_FOR_AI
 */
export async function collectArticlesForTopic(
  topicId: string,
): Promise<RssArticle[]> {
  const feedUrls = TOPIC_RSS_FEEDS[topicId];
  if (!feedUrls || feedUrls.length === 0) {
    logger.warn({ topicId }, "No RSS feeds configured for topic");
    return [];
  }

  logger.info({ topicId, feedCount: feedUrls.length }, "Fetching RSS feeds");

  const feedResults = await Promise.allSettled(
    feedUrls.map((url, i) => fetchFeed(url, `Source ${i + 1}`)),
  );

  const allArticles: RssArticle[] = [];
  const seenUrls = new Set<string>();

  for (const result of feedResults) {
    if (result.status !== "fulfilled") continue;
    for (const article of result.value) {
      if (!seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        allArticles.push(article);
      }
    }
  }

  allArticles.sort((a, b) => {
    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return dateB - dateA;
  });

  const trimmed = allArticles.slice(0, MAX_ARTICLES_FOR_AI);
  logger.info(
    { topicId, total: allArticles.length, returned: trimmed.length },
    "Articles collected",
  );

  return trimmed;
}

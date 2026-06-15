// ============================================================
// FEED ROUTE — Sprint 5 Task I
//
// POST /api/feed/personal
//   Body: { interests: string[], watchlist?: string[] }
//
// Returns a ranked personal feed with:
//   - Articles from all relevant topic feeds
//   - Relevance score per article
//   - Matched interests and watchlist keywords
//   - "Why selected" explanation for each article
// ============================================================

import { Router } from "express";
import { collectArticlesForTopic } from "../services/news/newsCollectorService.js";
import { INTEREST_DEFINITIONS, scoreArticleByInterests } from "../services/news/feedGenerator.js";
import { logger } from "../lib/logger.js";
import type { RssArticle } from "../services/news/rssService.js";

const router = Router();

interface PersonalFeedItem {
  title: string;
  url: string;
  description: string | null;
  pubDate: string | null;
  source: string | null;
  topicId: string;
  relevanceScore: number;
  matchedInterests: string[];
  matchedWatchlist: string[];
  selectionReason: string;
}

function buildSelectionReason(
  matchedInterests: string[],
  matchedWatchlist: string[],
  topicId: string,
): string {
  const parts: string[] = [];
  if (matchedInterests.length > 0) {
    parts.push(`Matched interest: ${matchedInterests.join(", ")}`);
  }
  if (matchedWatchlist.length > 0) {
    parts.push(`Matched watchlist: ${matchedWatchlist.join(", ")}`);
  }
  if (parts.length === 0) {
    parts.push(`From topic: ${topicId}`);
  }
  return parts.join(" · ");
}

function scoreAndAnnotate(
  article: RssArticle,
  topicId: string,
  interests: string[],
  watchlist: string[],
): PersonalFeedItem {
  const searchText = `${article.title} ${article.description ?? ""}`.toLowerCase();

  // Check which interests match
  const matchedInterests = interests.filter((interest) => {
    const def = INTEREST_DEFINITIONS[interest];
    if (!def) return false;
    return def.keywords.some((kw) => searchText.includes(kw.toLowerCase()));
  });

  // Check which watchlist keywords match
  const matchedWatchlist = watchlist.filter((term) =>
    searchText.includes(term.toLowerCase()),
  );

  // Score: interest boost + watchlist boost + base interest score
  const interestBoost = scoreArticleByInterests(article, interests);
  const watchlistBoost = matchedWatchlist.length * 30;
  const relevanceScore = interestBoost + watchlistBoost;

  return {
    title: article.title,
    url: article.url,
    description: article.description ?? null,
    pubDate: article.pubDate ?? null,
    source: article.source ?? null,
    topicId,
    relevanceScore,
    matchedInterests,
    matchedWatchlist,
    selectionReason: buildSelectionReason(matchedInterests, matchedWatchlist, topicId),
  };
}

router.post("/feed/personal", async (req, res) => {
  const { interests = [], watchlist = [] } = req.body as {
    interests?: string[];
    watchlist?: string[];
  };

  if (!Array.isArray(interests)) {
    res.status(400).json({ error: "interests must be an array" });
    return;
  }

  // Determine which topics to collect from
  const topicIds = new Set<string>();
  for (const interest of interests) {
    const def = INTEREST_DEFINITIONS[interest];
    if (def) {
      for (const id of def.topicIds) topicIds.add(id);
    }
  }

  // Default to all topics if no interests specified
  if (topicIds.size === 0) {
    ["ai", "technology", "stocks", "economy", "politics"].forEach((id) =>
      topicIds.add(id),
    );
  }

  logger.info(
    { interests, watchlist, topicIds: Array.from(topicIds) },
    "Generating personal feed",
  );

  try {
    const topicResults = await Promise.allSettled(
      Array.from(topicIds).map(async (topicId) => {
        const result = await collectArticlesForTopic(topicId);
        return { topicId, articles: result.articles };
      }),
    );

    const allItems: PersonalFeedItem[] = [];

    for (const result of topicResults) {
      if (result.status === "rejected") continue;
      const { topicId, articles } = result.value;
      for (const article of articles) {
        allItems.push(scoreAndAnnotate(article, topicId, interests, watchlist));
      }
    }

    // Remove URL duplicates
    const seenUrls = new Set<string>();
    const deduped = allItems.filter((item) => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    // Sort: matched items first (by score desc), then unmatched
    deduped.sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.json({
      items: deduped,
      totalArticles: deduped.length,
      topicsSearched: Array.from(topicIds),
      interestsApplied: interests,
      watchlistApplied: watchlist,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Personal feed generation failed");
    res.status(500).json({ error: "Failed to generate personal feed" });
  }
});

export default router;

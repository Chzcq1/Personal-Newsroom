// ============================================================
// FEED ROUTE — Sprint 6 Task C + Task D
//
// POST /api/feed/personal
//   Body: { interests: string[], watchlist?: string[] }
//
// Returns a ranked personal feed with true personalization:
//
// Scoring model (Sprint 6 upgrade):
//   Interest keyword match   +20 per interest (up to 3 matches = +60)
//   Watchlist exact match    +50 per term
//   Recency bonus            ≤2h +40, ≤6h +25, ≤12h +15, ≤24h +8
//   Source quality (Tier A)  +15 (FT, Bloomberg, Economist, MIT...)
//   Source quality (Tier B)  +8  (TechCrunch, Ars Technica, Verge...)
//
// Task D — Rich explanation: each article includes why it appeared
//   (interest match, watchlist hit, breaking timing, source tier)
// ============================================================

import { Router } from "express";
import { collectArticlesForTopic } from "../services/news/newsCollectorService.js";
import { INTEREST_DEFINITIONS, scoreArticleByInterests } from "../services/news/feedGenerator.js";
import { getSourceBonus, getSourceTier } from "../services/news/sourceRegistry.js";
import { logger } from "../lib/logger.js";
import type { RssArticle } from "../services/news/rssService.js";

const router = Router();

// ── Types ────────────────────────────────────────────────────

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
  recencyLabel: string;
  sourceTier: string;
  imageUrl: string | null;
}

// ── Scoring helpers ──────────────────────────────────────────

interface RecencyResult {
  bonus: number;
  label: string;
}

function getRecencyBonus(pubDate: string | null | undefined): RecencyResult {
  if (!pubDate) return { bonus: 0, label: "" };
  const ageHours = (Date.now() - new Date(pubDate).getTime()) / 3_600_000;
  if (ageHours <= 2) return { bonus: 40, label: "Breaking" };
  if (ageHours <= 6) return { bonus: 25, label: "Recent" };
  if (ageHours <= 12) return { bonus: 15, label: "" };
  if (ageHours <= 24) return { bonus: 8, label: "" };
  return { bonus: 0, label: "" };
}

/**
 * Build a human-readable explanation of why this article appeared.
 * Shown directly under each article in My Feed (Task D).
 */
function buildSelectionReason(
  matchedInterests: string[],
  matchedWatchlist: string[],
  recencyLabel: string,
  sourceTier: string,
  sourceName: string | null,
  topicId: string,
): string {
  const parts: string[] = [];

  if (matchedInterests.length > 0) {
    parts.push(`Matched: ${matchedInterests.join(", ")}`);
  }
  if (matchedWatchlist.length > 0) {
    parts.push(`Watchlist: ${matchedWatchlist.join(", ")}`);
  }
  if (recencyLabel) {
    parts.push(recencyLabel);
  }
  if (sourceTier === "A" && sourceName) {
    parts.push(`${sourceName} ★`);
  } else if (sourceTier === "B" && sourceName) {
    parts.push(sourceName);
  }

  if (parts.length === 0) {
    return `Topic: ${topicId}`;
  }
  return parts.join(" · ");
}

/**
 * Score and annotate one article for the personal feed.
 * Returns full metadata including score breakdown signals.
 */
function scoreAndAnnotate(
  article: RssArticle,
  topicId: string,
  interests: string[],
  watchlist: string[],
): PersonalFeedItem {
  const searchText = `${article.title} ${article.description ?? ""}`.toLowerCase();

  // 1. Interest matching (Task C) — up to 3 interests capped
  const matchedInterests = interests.filter((interest) => {
    const def = INTEREST_DEFINITIONS[interest];
    if (!def) return false;
    return def.keywords.some((kw) => searchText.includes(kw.toLowerCase()));
  });

  // 2. Watchlist matching — exact substring per term
  const matchedWatchlist = watchlist.filter((term) =>
    searchText.includes(term.toLowerCase()),
  );

  // 3. Calculate score components
  const interestBoost = scoreArticleByInterests(article, interests); // base keyword scoring
  const watchlistBoost = matchedWatchlist.length * 50;
  const { bonus: recencyBoost, label: recencyLabel } = getRecencyBonus(article.pubDate);
  const sourceBonus = getSourceBonus(article.source);
  const sourceTier = getSourceTier(article.source);

  const relevanceScore = interestBoost + watchlistBoost + recencyBoost + sourceBonus;

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
    recencyLabel,
    sourceTier,
    imageUrl: article.imageUrl ?? null,
    selectionReason: buildSelectionReason(
      matchedInterests,
      matchedWatchlist,
      recencyLabel,
      sourceTier,
      article.source ?? null,
      topicId,
    ),
  };
}

// ── Route ────────────────────────────────────────────────────

router.post("/feed/personal", async (req, res) => {
  const { interests = [], watchlist = [] } = req.body as {
    interests?: string[];
    watchlist?: string[];
  };

  if (!Array.isArray(interests)) {
    res.status(400).json({ error: "interests must be an array" });
    return;
  }

  // Determine which topics to collect based on interest definitions
  const topicIds = new Set<string>();
  for (const interest of interests) {
    const def = INTEREST_DEFINITIONS[interest];
    if (def) {
      for (const id of def.topicIds) topicIds.add(id);
    }
  }

  // Default: all topics if no interests specified or matched
  if (topicIds.size === 0) {
    ["ai", "technology", "stocks", "economy", "politics"].forEach((id) =>
      topicIds.add(id),
    );
  }

  logger.info(
    { interests, watchlistCount: watchlist.length, topicIds: Array.from(topicIds) },
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

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const deduped = allItems.filter((item) => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    // Sort: highest relevance first; within same score, most recent first
    deduped.sort((a, b) => {
      const scoreDiff = b.relevanceScore - a.relevanceScore;
      if (scoreDiff !== 0) return scoreDiff;
      const aMs = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const bMs = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return bMs - aMs;
    });

    logger.info(
      {
        totalItems: deduped.length,
        matched: deduped.filter((i) => i.relevanceScore > 0).length,
        topicsSearched: Array.from(topicIds),
      },
      "Personal feed generated",
    );

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

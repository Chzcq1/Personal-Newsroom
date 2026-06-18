// ============================================================
// FEED ROUTE — Sprint 9 Contextual Intelligence Layer
//
// Sprint 29 upgrade: Trend-first feed ranking.
//   • Cross-references articles with active trend cache
//   • Applies momentum boost to trending articles
//   • Attaches trendMeta (momentum bar, platform spread, region)
//
// POST /api/feed/personal
// POST /api/feed/memory          — record engagement event
//
// Pipeline:
//   1. Build PersonalContextProfile (interest graph expansion)
//   2. Collect articles from relevant topics
//   3. Record entity memory
//   4. Classify relevance (semantic, graph-aware, multi-factor)
//   5. Cross-reference with active trends (Sprint 29)
//   6. Apply quality filters
//   7. Sort by relevance class + boostedScore (trend-boosted)
//   8. Cluster narratives
//   9. Build enriched feed items with trendMeta
//  10. Record feed quality metrics
// ============================================================

import { Router } from "express";
import { collectArticlesForTopic } from "../services/news/newsCollectorService.js";
import { INTEREST_DEFINITIONS } from "../services/news/feedGenerator.js";
import { getSourceBonus, getSourceTier } from "../services/news/sourceRegistry.js";
import { expandInterests } from "../services/intelligence/interestGraph.js";
import {
  classifyRelevance,
  type RelevanceClassification,
} from "../services/intelligence/relevanceClassifier.js";
import {
  clusterNarratives,
  findClusterForArticle,
} from "../services/intelligence/narrativeCluster.js";
import {
  buildPersonalContext,
  applyContextBoost,
  type TasteSignal,
} from "../services/intelligence/personalContext.js";
import { recordEntityMentions } from "../services/intelligence/entityMemory.js";
import { scoreSignal } from "../services/intelligence/signalScoring.js";
import { recordFeedQuality } from "../services/analytics/feedQualityMetrics.js";
import {
  applyAdaptiveRanking,
  type AdaptationSignal,
} from "../services/intelligence/feedAdaptationEngine.js";
import { recordNarrativeCluster } from "../services/intelligence/narrativeMemory.js";
import { logger } from "../lib/logger.js";
import type { RssArticle } from "../services/news/rssService.js";
import { fetchFeed } from "../services/news/rssService.js";
import { getSourcesForEntities } from "../services/news/entityResolver.js";
// Sprint 29 — trend-first feed
import { getRecentTrends } from "../services/trendIngestion/index.js";
// Sprint 30 — trend-first feed assembler
import { assembleForUser } from "../services/feed/feedAssembler.js";
import { expandEntities } from "../services/trendGraph/entityGraph.js";
import {
  matchArticleToTrends,
  buildTrendMeta,
  type TrendMeta,
  type ArticleTrendMatch,
} from "../services/trendGraph/trendFusion.js";
import {
  recordFeedEvent,
  predictEngagement,
  getMemoryStats,
  type EngagementEvent,
} from "../services/feedMemory.js";

const router = Router();

// ── Types ────────────────────────────────────────────────────

export interface PersonalFeedItem {
  title: string;
  url: string;
  description: string | null;
  pubDate: string | null;
  source: string | null;
  topicId: string;
  relevanceScore: number;
  relevanceClass: "direct" | "contextual" | "weak" | "incidental";
  matchedInterests: string[];
  matchedWatchlist: string[];
  graphMatchedEntities: string[];
  selectionReason: string;
  recencyLabel: string;
  sourceTier: string;
  imageUrl: string | null;
  signalScore: number;
  narrativeClusterId: string | null;
  narrativeClusterHeadline: string | null;
  // Sprint 29 — trend intelligence overlay
  trendMeta: TrendMeta | null;
  // Debug info (always populated, shown in /debug/relevance)
  debug: {
    directKeywordScore: number;
    graphScore: number;
    entityOverlapScore: number;
    sourceModifier: number;
    signalBreakdown: {
      sourceQuality: number;
      recency: number;
      geopoliticalSignificance: number;
      watchlistRelevance: number;
      multiSourceConfirmation: number;
      trendMomentum: number;
    };
  };
}

// ── Quality filter ────────────────────────────────────────────

const CLICKBAIT_PATTERNS = [
  /you won't believe/i,
  /this one weird/i,
  /shocking/i,
  /mind-blowing/i,
  /\?{2,}/,
  /!!!+/,
  /^watch:/i,
  /^breaking!+$/i,
];

const MIN_DESCRIPTION_WORDS = 8;

function isLowQuality(
  article: RssArticle,
  relevance: RelevanceClassification,
  signalScore: number,
): boolean {
  if (relevance.class === "incidental" && signalScore < 15) return true;
  for (const pattern of CLICKBAIT_PATTERNS) {
    if (pattern.test(article.title)) return true;
  }
  const wordCount = (article.description ?? "").trim().split(/\s+/).length;
  if (wordCount < MIN_DESCRIPTION_WORDS && relevance.class === "incidental") return true;
  if (!article.description && relevance.class !== "direct") return true;
  return false;
}

// ── Recency helper ────────────────────────────────────────────

function getRecencyLabel(pubDate: string | null | undefined): string {
  if (!pubDate) return "";
  const ageHours = (Date.now() - new Date(pubDate).getTime()) / 3_600_000;
  if (ageHours <= 2) return "Breaking";
  if (ageHours <= 6) return "Recent";
  return "";
}

// ── Intelligent explanation builder ──────────────────────────

function buildIntelligentExplanation(
  relevance: RelevanceClassification,
  signalScore: number,
  watchlistMatches: string[],
  clusterHeadline: string | null,
  sourceTier: string,
  source: string | null,
  multiSourceConfirmed: boolean,
  trendMeta: TrendMeta | null,
): string {
  const parts: string[] = [];

  if (watchlistMatches.length > 0) {
    parts.push(`Watchlist: ${watchlistMatches.join(", ")}`);
  } else if (relevance.class === "direct" && relevance.directMatches.length > 0) {
    parts.push(`High relevance — ${relevance.directMatches.join(" & ")}`);
  } else if (relevance.class === "contextual" && relevance.matchedEntities.length > 0) {
    const labels = relevance.matchedEntities.slice(0, 2).join(" / ");
    parts.push(`${labels} ecosystem`);
  } else if (relevance.class === "weak") {
    parts.push("Loosely related");
  }

  // Sprint 29: trend context takes priority if strong
  if (trendMeta && trendMeta.momentumScore >= 50 && trendMeta.whyTrending) {
    parts.push(trendMeta.whyTrending);
  }

  if (clusterHeadline) {
    parts.push(`Narrative: ${clusterHeadline.length > 50 ? clusterHeadline.slice(0, 50) + "…" : clusterHeadline}`);
  }

  if (multiSourceConfirmed) {
    parts.push("Multi-source confirmed");
  } else if (sourceTier === "A" && source) {
    parts.push(`${source} (Tier A)`);
  }

  if (signalScore >= 80) parts.push("Critical signal");
  else if (signalScore >= 60) parts.push("High signal");

  return parts.length > 0 ? parts.join(" · ") : "General coverage";
}

// ── Route: POST /feed/personal ────────────────────────────────

router.post("/feed/personal", async (req, res) => {
  const startMs = Date.now();

  const {
    interests = [],
    watchlist = [],
    tasteSignal,
  } = req.body as {
    interests?: string[];
    watchlist?: string[];
    tasteSignal?: TasteSignal;
  };

  if (!Array.isArray(interests)) {
    res.status(400).json({ error: "interests must be an array" });
    return;
  }

  // ── 1. Build personal context ─────────────────────────────
  const context = buildPersonalContext(interests, watchlist, tasteSignal);

  const interestKeywordMap = new Map<string, string[]>();
  for (const [key, def] of Object.entries(INTEREST_DEFINITIONS)) {
    interestKeywordMap.set(key, def.keywords);
  }

  // ── 2. Determine topic IDs ────────────────────────────────
  const topicIds = new Set<string>();
  for (const interest of interests) {
    const def = INTEREST_DEFINITIONS[interest];
    if (def) {
      for (const id of def.topicIds) topicIds.add(id);
    }
  }
  if (topicIds.size === 0) {
    ["ai", "technology", "stocks", "economy", "politics"].forEach((id) =>
      topicIds.add(id),
    );
  }

  logger.info(
    { interests, watchlistCount: watchlist.length, topicIds: Array.from(topicIds) },
    "Generating personal feed (Sprint 29 — trend-first)",
  );

  try {
    // ── 3. Collect articles ──────────────────────────────────
    const topicResults = await Promise.allSettled(
      Array.from(topicIds).map(async (topicId) => {
        const result = await collectArticlesForTopic(topicId);
        return { topicId, articles: result.articles };
      }),
    );

    const rawArticles: Array<RssArticle & { topicId: string }> = [];
    for (const result of topicResults) {
      if (result.status === "rejected") continue;
      const { topicId, articles } = result.value;
      for (const article of articles) {
        rawArticles.push({ ...article, topicId });
      }
    }

    // ── Entity-specific sources (Sprint 26) ───────────────────
    const entitySources = getSourcesForEntities(interests, watchlist);
    if (entitySources.length > 0) {
      const entityResults = await Promise.allSettled(
        entitySources.map(async (src) => {
          const result = await fetchFeed(src.url, src.name);
          return { topicId: src.category, articles: result.articles };
        }),
      );
      for (const result of entityResults) {
        if (result.status === "rejected") continue;
        const { topicId, articles } = result.value;
        for (const article of articles) {
          rawArticles.push({ ...article, topicId });
        }
      }
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const deduped = rawArticles.filter((a) => {
      if (seenUrls.has(a.url)) return false;
      seenUrls.add(a.url);
      return true;
    });

    // ── 4. Record entity memory ──────────────────────────────
    recordEntityMentions(deduped);

    // ── 5. Classify relevance + score signal ─────────────────
    const expandedGraph = expandInterests(interests);

    const classified = deduped.map((article) => {
      const relevance = classifyRelevance(
        article,
        interests,
        interestKeywordMap,
        expandedGraph,
      );
      const signal = scoreSignal(article, deduped, watchlist);

      const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
      const matchedWatchlist = watchlist.filter((term) =>
        text.includes(term.toLowerCase()),
      );

      const baseScore = relevance.combinedScore + getSourceBonus(article.source);
      const boostedScore = applyContextBoost(
        baseScore,
        relevance.matchedEntities,
        matchedWatchlist,
        context,
      );

      return {
        article,
        relevance,
        signal,
        matchedWatchlist,
        boostedScore,
      };
    });

    // ── 5b. Sprint 29 — Trend cross-reference ─────────────────
    // Fetch the in-memory trend cache (populated by 15-min worker).
    // Cross-reference each article against active trends.
    // Items that match active trends get a momentum boost.
    const activeTrends = getRecentTrends(100);
    const entityMap = expandEntities(interests, 2);

    // Pre-compute trend matches for every article
    const trendMatchMap = new Map<string, ArticleTrendMatch[]>();
    if (activeTrends.length > 0) {
      for (const { article } of classified) {
        const matches = matchArticleToTrends(
          article.title,
          article.description ?? null,
          article.topicId,
          activeTrends,
          interests,
        );
        if (matches.length > 0) {
          trendMatchMap.set(article.url, matches);
        }
      }
    }

    // Apply trend momentum boost to boostedScore
    // Trending articles float to top within their relevance class
    const classifiedWithTrend = classified.map((c) => {
      const matches = trendMatchMap.get(c.article.url) ?? [];
      const topMatchScore = matches.length > 0
        ? matches.reduce((max, m) => Math.max(max, m.matchScore), 0)
        : 0;
      // Up to +30 points for highly trending articles
      const trendBoost = topMatchScore * 30;
      return { ...c, boostedScore: c.boostedScore + trendBoost };
    });

    // ── 6. Quality filtering ───────────────────────────────────
    const filtered = classifiedWithTrend.filter(
      (c) => !isLowQuality(c.article, c.relevance, c.signal.total),
    );
    const filteredCount = classifiedWithTrend.length - filtered.length;

    // Sort: direct first, then by boostedScore (trend-boosted)
    const classOrder = { direct: 4, contextual: 3, weak: 2, incidental: 1 };
    filtered.sort((a, b) => {
      const classDiff = classOrder[b.relevance.class] - classOrder[a.relevance.class];
      if (classDiff !== 0) return classDiff;
      return b.boostedScore - a.boostedScore;
    });

    // ── 7. Narrative clustering ────────────────────────────────
    const articlesForClustering = filtered.map((c) => ({
      ...c.article,
      combinedScore: c.boostedScore,
      relevanceClass: c.relevance.class,
    }));

    const { clusters, singletons, clusteringRate } = clusterNarratives(articlesForClustering);

    const avgClusterSignal = filtered.length > 0
      ? Math.round(filtered.reduce((s, c) => s + c.signal.total, 0) / filtered.length)
      : 0;
    for (const cluster of clusters) {
      recordNarrativeCluster(cluster, avgClusterSignal);
    }

    // ── 7b. Adaptive ranking (Sprint 10) ──────────────────────
    const adaptiveFiltered = req.body.adaptationSignal
      ? applyAdaptiveRanking(
          filtered.map((c) => ({
            ...c,
            relevanceScore: c.boostedScore,
            graphMatchedEntities: c.relevance.matchedEntities,
            matchedInterests: c.relevance.directMatches,
          })),
          req.body.adaptationSignal as AdaptationSignal,
        )
      : filtered;

    // ── 8. Build enriched feed items (Sprint 29 trendMeta) ────
    const items: PersonalFeedItem[] = adaptiveFiltered.map(({ article, relevance, signal, matchedWatchlist, boostedScore }) => {
      const sourceTier = getSourceTier(article.source);
      const cluster = findClusterForArticle(article.url, clusters);
      const multiSourceConfirmed = cluster ? cluster.isMultiSource : false;

      // Build trendMeta from pre-computed matches
      const matches = trendMatchMap.get(article.url) ?? [];
      const trendMeta = buildTrendMeta(matches, entityMap, article.title, article.description ?? null);
      const trendMetaOut: TrendMeta | null = trendMeta.momentumScore > 0 ? trendMeta : null;

      const selectionReason = buildIntelligentExplanation(
        relevance,
        signal.total,
        matchedWatchlist,
        cluster?.headline ?? null,
        sourceTier,
        article.source ?? null,
        multiSourceConfirmed,
        trendMetaOut,
      );

      return {
        title: article.title,
        url: article.url,
        description: article.description ?? null,
        pubDate: article.pubDate ?? null,
        source: article.source ?? null,
        topicId: article.topicId,
        relevanceScore: boostedScore,
        relevanceClass: relevance.class,
        matchedInterests: relevance.directMatches,
        matchedWatchlist,
        graphMatchedEntities: relevance.matchedEntities,
        selectionReason,
        recencyLabel: getRecencyLabel(article.pubDate),
        sourceTier,
        imageUrl: article.imageUrl ?? null,
        signalScore: signal.total,
        narrativeClusterId: cluster?.id ?? null,
        narrativeClusterHeadline: cluster?.headline ?? null,
        trendMeta: trendMetaOut,
        debug: {
          directKeywordScore: relevance.directKeywordScore,
          graphScore: relevance.graphScore,
          entityOverlapScore: relevance.entityOverlapScore,
          sourceModifier: relevance.sourceModifier,
          signalBreakdown: signal.breakdown,
        },
      };
    });

    // ── 9. Feed quality metrics ────────────────────────────────
    const directCount = items.filter((i) => i.relevanceClass === "direct").length;
    const contextualCount = items.filter((i) => i.relevanceClass === "contextual").length;
    const weakCount = items.filter((i) => i.relevanceClass === "weak").length;
    const incidentalCount = items.filter((i) => i.relevanceClass === "incidental").length;
    const uniqueSources = new Set(items.map((i) => i.source).filter(Boolean)).size;
    const avgScore = items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + i.relevanceScore, 0) / items.length)
      : 0;
    const relevanceAccuracy = items.length > 0
      ? Math.round(((directCount + contextualCount) / items.length) * 100)
      : 0;
    const trendingCount = items.filter((i) => i.trendMeta !== null).length;

    recordFeedQuality({
      interestCount: interests.length,
      watchlistCount: watchlist.length,
      totalArticles: items.length,
      directCount,
      contextualCount,
      weakCount,
      incidentalCount,
      filteredCount,
      clusterCount: clusters.length,
      singletonCount: singletons.length,
      clusteringRate,
      avgCombinedScore: avgScore,
      uniqueSourceCount: uniqueSources,
      feedDiversityRate: items.length > 0 ? uniqueSources / items.length : 0,
      relevanceAccuracy,
      processingTimeMs: Date.now() - startMs,
    });

    const expandedSummary: Record<string, { weight: number; hop: number }> = {};
    for (const [entityId, entry] of expandedGraph) {
      expandedSummary[entityId] = { weight: Math.round(entry.weight * 100) / 100, hop: entry.hop };
    }

    logger.info(
      {
        totalItems: items.length,
        trendingCount,
        activeTrends: activeTrends.length,
        directCount, contextualCount, weakCount, incidentalCount,
        filteredCount,
        clusters: clusters.length,
        clusteringRate,
        relevanceAccuracy,
        processingTimeMs: Date.now() - startMs,
      },
      "Personal feed generated (Sprint 29 — trend-first)",
    );

    res.json({
      items,
      narrativeClusters: clusters,
      totalArticles: items.length,
      filteredArticles: filteredCount,
      topicsSearched: Array.from(topicIds),
      interestsApplied: interests,
      watchlistApplied: watchlist,
      expandedEntities: expandedSummary,
      contextSummary: context.contextSummary,
      feedQuality: {
        relevanceAccuracy,
        clusteringRate,
        directCount,
        contextualCount,
      },
      trendSignal: {
        activeTrends: activeTrends.length,
        trendingArticles: trendingCount,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Personal feed generation failed");
    res.status(500).json({ error: "Failed to generate personal feed" });
  }
});

// ── Route: POST /feed/trend-cards ────────────────────────────
// Sprint 30 — Trend-First Feed Architecture.
// Returns TrendFeedCard[] — trends as primary objects,
// articles as supporting evidence. Replaces the article-list model.

router.post("/feed/trend-cards", async (req, res) => {
  const {
    interests = [],
    watchlist = [],
  } = req.body as {
    interests?: string[];
    watchlist?: string[];
  };

  if (!Array.isArray(interests)) {
    res.status(400).json({ error: "interests must be an array" });
    return;
  }
  if (!Array.isArray(watchlist)) {
    res.status(400).json({ error: "watchlist must be an array" });
    return;
  }

  try {
    const { cards, stats } = await assembleForUser(interests, watchlist);
    res.json({
      cards,
      stats,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Trend-cards feed assembly failed");
    res.status(500).json({ error: "Failed to assemble trend feed" });
  }
});

// ── Route: POST /feed/memory ──────────────────────────────────
// Records a feed engagement event (open, save, skip, follow, share).
// Used by the feed memory service to improve future predictions.

router.post("/feed/memory", (req, res) => {
  const {
    profileId,
    url,
    topicId,
    event,
    durationMs,
  } = req.body as {
    profileId?: string;
    url?: string;
    topicId?: string;
    event?: EngagementEvent;
    durationMs?: number;
  };

  if (!profileId || !url || !topicId || !event) {
    res.status(400).json({ error: "profileId, url, topicId, and event are required" });
    return;
  }

  const validEvents: EngagementEvent[] = ["open", "save", "skip", "follow", "share"];
  if (!validEvents.includes(event)) {
    res.status(400).json({ error: `event must be one of: ${validEvents.join(", ")}` });
    return;
  }

  recordFeedEvent({ profileId, url, topicId, event, durationMs, timestamp: Date.now() });
  res.json({ ok: true });
});

// ── Route: GET /feed/memory/stats ─────────────────────────────

router.get("/feed/memory/stats", (_req, res) => {
  res.json(getMemoryStats());
});

export default router;

// ============================================================
// FEED ROUTE — Sprint 9 Contextual Intelligence Layer
//
// POST /api/feed/personal
//   Body: {
//     interests: string[],
//     watchlist?: string[],
//     tasteSignal?: TasteSignal,
//   }
//
// Pipeline:
//   1. Build PersonalContextProfile (interest graph expansion)
//   2. Collect articles from relevant topics
//   3. Record entity memory
//   4. Classify relevance (semantic, graph-aware, multi-factor)
//   5. Apply quality filters (Task F)
//   6. Apply personal context boost
//   7. Cluster narratives (Task C)
//   8. Build enriched feed items with intelligent explanations (Task I)
//   9. Record feed quality metrics (Task J)
//
// Response includes:
//   items[]           — ranked articles with full intelligence annotations
//   narrativeClusters — grouped story narratives
//   feedQuality       — live quality metrics snapshot
//   expandedEntities  — interest graph expansion (debug)
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
import {
  recordFeedQuality,
} from "../services/analytics/feedQualityMetrics.js";
import {
  applyAdaptiveRanking,
  type AdaptationSignal,
} from "../services/intelligence/feedAdaptationEngine.js";
import {
  recordNarrativeCluster,
} from "../services/intelligence/narrativeMemory.js";
import { logger } from "../lib/logger.js";
import type { RssArticle } from "../services/news/rssService.js";
import { fetchFeed } from "../services/news/rssService.js";
import { getSourcesForEntities } from "../services/news/entityResolver.js";

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

// ── Quality filter (Task F) ──────────────────────────────────

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
  // Filter incidental relevance with very low signal
  if (relevance.class === "incidental" && signalScore < 15) return true;

  // Filter clickbait titles
  for (const pattern of CLICKBAIT_PATTERNS) {
    if (pattern.test(article.title)) return true;
  }

  // Filter very short descriptions (low-information)
  const wordCount = (article.description ?? "").trim().split(/\s+/).length;
  if (wordCount < MIN_DESCRIPTION_WORDS && relevance.class === "incidental") return true;

  // Filter title-only duplicates (no description at all with incidental relevance)
  if (!article.description && relevance.class !== "direct") return true;

  return false;
}

// ── Recency helper ───────────────────────────────────────────

function getRecencyLabel(pubDate: string | null | undefined): string {
  if (!pubDate) return "";
  const ageHours = (Date.now() - new Date(pubDate).getTime()) / 3_600_000;
  if (ageHours <= 2) return "Breaking";
  if (ageHours <= 6) return "Recent";
  return "";
}

// ── Intelligent explanation builder (Task I) ─────────────────

function buildIntelligentExplanation(
  relevance: RelevanceClassification,
  signalScore: number,
  watchlistMatches: string[],
  clusterHeadline: string | null,
  sourceTier: string,
  source: string | null,
  multiSourceConfirmed: boolean,
): string {
  const parts: string[] = [];

  // Lead with the most specific signal
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

  // Narrative context
  if (clusterHeadline) {
    parts.push(`Narrative: ${clusterHeadline.length > 50 ? clusterHeadline.slice(0, 50) + "…" : clusterHeadline}`);
  }

  // Multi-source confirmation is a strong trust signal
  if (multiSourceConfirmed) {
    parts.push("Multi-source confirmed");
  } else if (sourceTier === "A" && source) {
    parts.push(`${source} (Tier A)`);
  }

  // Signal level
  if (signalScore >= 80) parts.push("Critical signal");
  else if (signalScore >= 60) parts.push("High signal");

  return parts.length > 0 ? parts.join(" · ") : "General coverage";
}

// ── Route ────────────────────────────────────────────────────

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

  // Build interestKeywordMap from INTEREST_DEFINITIONS
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
    "Generating personal feed (Sprint 9)",
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
    // Fetch from entity/watchlist-specific RSS feeds in addition
    // to general topic feeds, giving users articles about exactly
    // what they follow (BTC, NVDA, OpenAI, etc.)
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
      logger.debug(
        { entitySourceCount: entitySources.length, entities: entitySources.map((s) => s.entity) },
        "Entity-specific sources injected into feed",
      );
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

      // Watchlist matching
      const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
      const matchedWatchlist = watchlist.filter((term) =>
        text.includes(term.toLowerCase()),
      );

      // Context-boosted score
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

    // ── 6. Quality filtering (Task F) ─────────────────────────
    const filtered = classified.filter(
      (c) => !isLowQuality(c.article, c.relevance, c.signal.total),
    );
    const filteredCount = classified.length - filtered.length;

    // Sort: direct first, then by boostedScore
    const classOrder = { direct: 4, contextual: 3, weak: 2, incidental: 1 };
    filtered.sort((a, b) => {
      const classDiff =
        classOrder[b.relevance.class] - classOrder[a.relevance.class];
      if (classDiff !== 0) return classDiff;
      return b.boostedScore - a.boostedScore;
    });

    // ── 7. Narrative clustering (Task C) ─────────────────────
    const articlesForClustering = filtered.map((c) => ({
      ...c.article,
      combinedScore: c.boostedScore,
      relevanceClass: c.relevance.class,
    }));

    const { clusters, singletons, clusteringRate } = clusterNarratives(articlesForClustering);

    // Sprint 10: Record clusters into persistent narrative memory
    const avgClusterSignal = filtered.length > 0
      ? Math.round(filtered.reduce((s, c) => s + c.signal.total, 0) / filtered.length)
      : 0;
    for (const cluster of clusters) {
      recordNarrativeCluster(cluster, avgClusterSignal);
    }

    // ── 7b. Apply adaptive ranking (Sprint 10 Task E) ────────
    // Apply adaptation signal from client if provided
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

    // ── 8. Build enriched feed items (Task I) ─────────────────
    const items: PersonalFeedItem[] = adaptiveFiltered.map(({ article, relevance, signal, matchedWatchlist, boostedScore }) => {
      const sourceTier = getSourceTier(article.source);
      const cluster = findClusterForArticle(article.url, clusters);
      const multiSourceConfirmed = cluster ? cluster.isMultiSource : false;

      const selectionReason = buildIntelligentExplanation(
        relevance,
        signal.total,
        matchedWatchlist,
        cluster?.headline ?? null,
        sourceTier,
        article.source ?? null,
        multiSourceConfirmed,
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
        debug: {
          directKeywordScore: relevance.directKeywordScore,
          graphScore: relevance.graphScore,
          entityOverlapScore: relevance.entityOverlapScore,
          sourceModifier: relevance.sourceModifier,
          signalBreakdown: signal.breakdown,
        },
      };
    });

    // ── 9. Feed quality metrics (Task J) ─────────────────────
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

    // ── Build expanded entities summary for debug ─────────────
    const expandedSummary: Record<string, { weight: number; hop: number }> = {};
    for (const [entityId, entry] of expandedGraph) {
      expandedSummary[entityId] = { weight: Math.round(entry.weight * 100) / 100, hop: entry.hop };
    }

    logger.info(
      {
        totalItems: items.length,
        directCount, contextualCount, weakCount, incidentalCount,
        filteredCount,
        clusters: clusters.length,
        clusteringRate,
        relevanceAccuracy,
        processingTimeMs: Date.now() - startMs,
      },
      "Personal feed generated (Sprint 9)",
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
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Personal feed generation failed");
    res.status(500).json({ error: "Failed to generate personal feed" });
  }
});

export default router;

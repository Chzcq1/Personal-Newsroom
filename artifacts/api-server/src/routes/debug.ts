// ============================================================
// DEBUG ROUTES — Sprint 9 Task E
//
// GET  /api/debug/relevance        — relevance inspector
// POST /api/debug/relevance/test   — test relevance for a given text
// GET  /api/debug/entities         — entity memory snapshot
// GET  /api/debug/graph/:interest  — interest graph expansion
// ============================================================

import { Router } from "express";
import { expandInterests, INTEREST_GRAPH } from "../services/intelligence/interestGraph.js";
import { classifyRelevance } from "../services/intelligence/relevanceClassifier.js";
import { getAllTrackedEntities, getRisingEntities } from "../services/intelligence/entityMemory.js";
import { getAllActiveStories } from "../services/intelligence/storyEvolution.js";
import { INTEREST_DEFINITIONS } from "../services/news/feedGenerator.js";
import type { RssArticle } from "../services/news/rssService.js";

const router = Router();

// GET /api/debug/relevance — overview of intelligence systems
router.get("/debug/relevance", (_req, res) => {
  const risingEntities = getRisingEntities(10);
  const trackedEntities = getAllTrackedEntities();
  const activeStories = getAllActiveStories();
  const graphKeys = Object.keys(INTEREST_GRAPH);

  res.json({
    interestGraph: {
      totalNodes: graphKeys.length,
      nodes: graphKeys,
    },
    entityMemory: {
      totalTracked: trackedEntities.length,
      risingEntities: risingEntities.map((e) => ({
        entityId: e.entityId,
        label: e.label,
        trend: e.trendDirection,
        mentions24h: e.mentionsLast24h,
        mentions7d: e.mentionsLast7d,
      })),
      allEntities: trackedEntities.slice(0, 20).map((e) => ({
        entityId: e.entityId,
        label: e.label,
        trend: e.trendDirection,
        mentions24h: e.mentionsLast24h,
        recentDevelopment: e.recentDevelopments.at(-1)?.headline ?? null,
      })),
    },
    storyEvolution: {
      activeStories: activeStories.length,
      stories: activeStories.slice(0, 10),
    },
    generatedAt: new Date().toISOString(),
  });
});

// POST /api/debug/relevance/test — test relevance scoring for arbitrary text
router.post("/debug/relevance/test", (req, res) => {
  const { title, description, source, interests = [], watchlist = [] } = req.body as {
    title?: string;
    description?: string;
    source?: string;
    interests?: string[];
    watchlist?: string[];
  };

  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const article: RssArticle = {
    title,
    description: description ?? null,
    url: "https://test",
    pubDate: new Date().toISOString(),
    source: source ?? null,
  };

  const interestKeywordMap = new Map<string, string[]>();
  for (const [key, def] of Object.entries(INTEREST_DEFINITIONS)) {
    interestKeywordMap.set(key, def.keywords);
  }

  const expandedGraph = expandInterests(interests);
  const relevance = classifyRelevance(article, interests, interestKeywordMap, expandedGraph);

  // Build expanded entity list
  const expanded: Record<string, { weight: number; hop: number; keywords: string[] }> = {};
  for (const [entityId, entry] of expandedGraph) {
    expanded[entityId] = {
      weight: Math.round(entry.weight * 100) / 100,
      hop: entry.hop,
      keywords: entry.keywords,
    };
  }

  res.json({
    input: { title, description, source, interests, watchlist },
    relevance: {
      class: relevance.class,
      combinedScore: relevance.combinedScore,
      breakdown: {
        directKeywordScore: relevance.directKeywordScore,
        graphScore: relevance.graphScore,
        entityOverlapScore: relevance.entityOverlapScore,
        sourceModifier: relevance.sourceModifier,
      },
      matchedEntities: relevance.matchedEntities,
      directMatches: relevance.directMatches,
      explanation: relevance.explanation,
    },
    expandedEntities: expanded,
    interestGraphNodes: Object.keys(INTEREST_GRAPH).length,
  });
});

// GET /api/debug/graph/:interest — expand a specific interest
router.get("/debug/graph/:interest", (req, res) => {
  const interest = req.params.interest;
  const graphNode = INTEREST_GRAPH[interest];

  if (!graphNode) {
    res.status(404).json({
      error: `Interest "${interest}" not found in graph`,
      availableNodes: Object.keys(INTEREST_GRAPH),
    });
    return;
  }

  const expanded = expandInterests([interest]);
  const expandedList = [...expanded.entries()].map(([entityId, entry]) => ({
    entityId,
    label: INTEREST_GRAPH[entityId]?.label ?? entityId,
    weight: Math.round(entry.weight * 100) / 100,
    hop: entry.hop,
    keywords: entry.keywords.slice(0, 3),
  }));

  expandedList.sort((a, b) => b.weight - a.weight);

  res.json({
    interest,
    label: graphNode.label,
    coreKeywords: graphNode.coreKeywords,
    directRelations: graphNode.related,
    expandedNodes: expandedList,
    totalExpanded: expandedList.length,
  });
});

// GET /api/debug/entities — full entity memory snapshot
router.get("/debug/entities", (_req, res) => {
  const entities = getAllTrackedEntities();
  res.json({
    total: entities.length,
    entities: entities.map((e) => ({
      ...e,
      recentDevelopments: e.recentDevelopments.slice(-3), // last 3 only
    })),
    generatedAt: new Date().toISOString(),
  });
});

export default router;

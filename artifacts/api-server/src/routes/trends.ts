// ============================================================
// TRENDS ROUTES — Sprint 29 Upgrade
//
// GET  /trends/recent           — last 50 ingested trend items
// GET  /trends/feed             — personalized trends (by interests/watchlist)
// GET  /trends/status           — ingestion health + counts by source
// GET  /trends/daily            — Google Trends daily for a specific region
// GET  /trends/momentum         — Reddit keyword velocity data
// GET  /trends/graph            — entity graph snapshot
// GET  /trends/discovery        — discovery injections for given interests
// POST /trends/ingest           — manual trigger (admin only)
// ============================================================

import { Router } from "express";
import {
  getRecentTrends,
  getTrendsByTopicTag,
  getTrendsByEntityTag,
  getIngestionStatus,
  ingestAllProviders,
} from "../services/trendIngestion/index.js";
import {
  getDailyTrends,
  getTrendingSearchesByRegion,
} from "../services/socialAdapters/googleTrendsAdapter.js";
import {
  getMomentumKeywords,
  getCrossSubredditTrends,
} from "../services/socialAdapters/redditAdapter.js";
import {
  getGraphSnapshot,
  getRelatedEntities,
} from "../services/trendGraph/entityGraph.js";
import { buildDiscoveryInjections } from "../services/trendGraph/trendFusion.js";

const router = Router();

// ── Existing routes ───────────────────────────────────────────

router.get("/trends/recent", (_req, res) => {
  const limit = Math.min(Number(_req.query.limit) || 50, 100);
  const items = getRecentTrends(limit);
  res.json({ items, total: items.length });
});

router.get("/trends/feed", (req, res) => {
  const interests = ((req.query.interests as string) || "").split(",").filter(Boolean);
  const watchlist = ((req.query.watchlist as string) || "").split(",").filter(Boolean);
  const limit = Math.min(Number(req.query.limit) || 30, 100);

  const entitySet = new Set<string>();
  for (const term of [...interests, ...watchlist]) {
    entitySet.add(term);
  }

  let items = getRecentTrends(200);

  if (entitySet.size > 0) {
    const entityArr = Array.from(entitySet);
    items = items.filter((item) =>
      item.entityTags.some((e) =>
        entityArr.some((q) => e.toLowerCase().includes(q.toLowerCase())),
      ) ||
      item.topicTags.some((t) =>
        entityArr.some((q) => t.toLowerCase().includes(q.toLowerCase())),
      ),
    );
  }

  res.json({ items: items.slice(0, limit), total: items.length });
});

router.get("/trends/status", (_req, res) => {
  res.json(getIngestionStatus());
});

router.post("/trends/ingest", async (_req, res) => {
  try {
    const result = await ingestAllProviders();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Ingestion failed" });
  }
});

// ── Sprint 29 new routes ──────────────────────────────────────

// GET /trends/daily — Google Trends daily for a region
router.get("/trends/daily", async (req, res) => {
  const geo = ((req.query.geo as string) || "US").toUpperCase();
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  try {
    const trends = await getDailyTrends(geo as "TH" | "US" | "GB" | "SG" | "JP" | "GLOBAL", limit);
    res.json({ trends, region: geo, total: trends.length, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to fetch daily trends" });
  }
});

// GET /trends/daily/multi — Google Trends for multiple regions
router.get("/trends/daily/multi", async (req, res) => {
  const regionsParam = ((req.query.regions as string) || "TH,US").toUpperCase();
  const regions = regionsParam.split(",").filter(Boolean) as Array<"TH" | "US" | "GB" | "SG" | "JP" | "GLOBAL">;
  const limit = Math.min(Number(req.query.limit) || 20, 30);

  try {
    const results = await getTrendingSearchesByRegion(regions.slice(0, 4), limit);
    res.json({ results, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to fetch regional trends" });
  }
});

// GET /trends/momentum — Reddit keyword velocity data
router.get("/trends/momentum", (req, res) => {
  const topN = Math.min(Number(req.query.top) || 20, 50);
  const minSubreddits = Number(req.query.minSubreddits) || 1;

  const keywords = getMomentumKeywords(topN);
  const crossSubreddit = getCrossSubredditTrends(minSubreddits);

  res.json({
    keywords,
    crossSubreddit,
    accelerating: keywords.filter((k) => k.isAccelerating).length,
    crossPlatform: crossSubreddit.length,
    computedAt: new Date().toISOString(),
  });
});

// GET /trends/graph — entity graph snapshot
router.get("/trends/graph", (_req, res) => {
  const snapshot = getGraphSnapshot();
  res.json({
    ...snapshot,
    description: "Entity relationship graph for trend discovery and feed boost",
  });
});

// GET /trends/discovery — discovery injections for given interests
router.get("/trends/discovery", (req, res) => {
  const interests = ((req.query.interests as string) || "").split(",").filter(Boolean);
  const limit = Math.min(Number(req.query.limit) || 5, 12);

  if (interests.length === 0) {
    res.json({ injections: [], message: "Provide ?interests=ai,crypto,stocks" });
    return;
  }

  const activeTrends = getRecentTrends(100);
  const injections = buildDiscoveryInjections(interests, activeTrends, limit);
  const relatedEntities = getRelatedEntities(interests, limit);

  res.json({
    injections,
    relatedEntities,
    basedOn: interests,
    total: injections.length,
  });
});

export default router;

// ============================================================
// COSTS ROUTE — Sprint 5 Task G
//
// GET /api/admin/costs — Returns cost analytics dashboard data.
//
// Includes:
//   - AI request counts
//   - Estimated token usage
//   - Cache hit/miss rates
//   - Average generation time
//   - Estimated daily + monthly cost
//   - Trend memory state
//   - Cache entries
// ============================================================

import { Router } from "express";
import { getCostStats } from "../services/analytics/costAnalytics.js";
import { getCacheMetrics, getCacheEntries } from "../services/cache/briefingCache.js";
import { getAllTrends } from "../services/news/trendMemory.js";
import { config } from "../config/env.js";

const router = Router();

router.get("/admin/costs", (_req, res) => {
  const stats = getCostStats(config.aiProvider);
  const cacheMetrics = getCacheMetrics();
  const cacheEntries = getCacheEntries();
  const trends = getAllTrends();

  res.json({
    provider: config.aiProvider,
    providerLabel: stats.providerLabel,
    requests: {
      total: stats.totalRequests,
      cacheHits: stats.cacheHits,
      cacheMisses: stats.cacheMisses,
      hitRatePercent: stats.hitRatePercent,
      fallbackCount: stats.fallbackCount,
      avgGenerationTimeMs: stats.avgGenerationTimeMs,
    },
    tokens: {
      totalInputEstimate: stats.totalInputTokensEstimate,
      totalOutputEstimate: stats.totalOutputTokensEstimate,
      totalArticlesCollected: stats.totalArticlesCollected,
    },
    cost: {
      estimatedTotalUSD: stats.estimatedTotalCostUSD,
      estimatedDailyUSD: stats.estimatedDailyCostUSD,
      estimatedMonthlyUSD: stats.estimatedMonthlyCostUSD,
    },
    cache: {
      hits: cacheMetrics.hits,
      misses: cacheMetrics.misses,
      hitRate: cacheMetrics.hitRate,
      currentEntries: cacheMetrics.currentEntries,
      entries: cacheEntries,
    },
    trendMemory: {
      entryCount: trends.length,
      entries: trends,
    },
    recentRequests: stats.recentRequests,
    generatedAt: new Date().toISOString(),
  });
});

export default router;

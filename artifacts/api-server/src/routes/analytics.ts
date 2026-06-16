// ============================================================
// ANALYTICS ROUTE — Sprint 8 Task I
//
// GET /api/admin/analytics    — delivery quality metrics dashboard
// ============================================================

import { Router } from "express";
import { getAnalyticsSnapshot } from "../services/analytics/deliveryMetrics.js";
import { getAllActiveStories } from "../services/intelligence/storyEvolution.js";
import { getAllTrends } from "../services/news/trendMemory.js";

const router = Router();

router.get("/admin/analytics", (_req, res) => {
  const snapshot = getAnalyticsSnapshot();
  const activeStories = getAllActiveStories();
  const trendMemory = getAllTrends();

  res.json({
    ...snapshot,
    intelligence: {
      activeStories: activeStories.length,
      topStories: activeStories.slice(0, 10),
      trendMemory: trendMemory.slice(0, 10),
    },
  });
});

export default router;

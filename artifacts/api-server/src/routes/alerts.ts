// ============================================================
// ALERTS ROUTE — Sprint 8 Task D
//
// GET  /api/alerts/recent     — recent priority alerts
// POST /api/alerts/check      — manually trigger alert check
// GET  /api/alerts/stats      — alert frequency stats
// ============================================================

import { Router } from "express";
import { getRecentAlerts, checkForAlerts, getAlertStats } from "../services/delivery/alertEngine.js";
import { collectArticlesForTopic } from "../services/news/newsCollectorService.js";
import { TOPICS } from "../config/topics.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/alerts/recent", (_req, res) => {
  const hours = parseInt((_req.query.hours as string) ?? "24", 10);
  const alerts = getRecentAlerts(Math.min(hours, 72));
  res.json({ alerts, count: alerts.length, generatedAt: new Date().toISOString() });
});

router.get("/alerts/stats", (_req, res) => {
  res.json(getAlertStats());
});

router.post("/alerts/check", async (req, res) => {
  const { watchlist = [] } = req.body as { watchlist?: string[] };

  try {
    logger.info({ watchlistCount: watchlist.length }, "Manual alert check triggered");

    const topicIds = TOPICS.map((t) => t.id);
    const results = await Promise.allSettled(
      topicIds.map((id) => collectArticlesForTopic(id)),
    );

    const allArticles = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value.articles : [],
    );

    const newAlerts = checkForAlerts(allArticles, watchlist);

    res.json({
      newAlerts,
      newAlertCount: newAlerts.length,
      articlesChecked: allArticles.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Alert check failed");
    res.status(500).json({ error: "Alert check failed" });
  }
});

export default router;

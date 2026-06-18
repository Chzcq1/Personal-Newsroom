// ============================================================
// ANALYTICS ROUTE — Sprint 8 Task I
//
// GET /api/admin/analytics    — delivery quality metrics dashboard
// GET /api/analytics/compound — alias for intelligence/compound
// GET /api/admin/source-trust — source reliability data
// ============================================================

import { Router } from "express";
import { getAnalyticsSnapshot } from "../services/analytics/deliveryMetrics.js";
import { getAllActiveStories } from "../services/intelligence/storyEvolution.js";
import { getAllTrends } from "../services/news/trendMemory.js";
import { calculateCompoundRate, getWeeklySummary } from "../services/intelligence/knowledgeCompound.js";
import { getAllSourceReliability } from "../services/news/sourceReliability.js";

const router = Router();

router.get("/admin/analytics/delivery-quality", (_req, res) => {
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

// ── Alias: /api/analytics/compound → intelligence compound rate ──
router.get("/analytics/compound", (_req, res) => {
  try {
    const days = parseInt(String(_req.query["days"] ?? "7"), 10);
    const safeDays = isNaN(days) || days < 1 ? 7 : Math.min(days, 90);
    const compound = calculateCompoundRate(safeDays);
    const weekly = getWeeklySummary();
    res.json({ compound, weekly });
  } catch {
    res.status(500).json({ error: "Failed to calculate compound rate" });
  }
});

// ── Source trust profiles ────────────────────────────────────
router.get("/admin/source-trust", (_req, res) => {
  try {
    const all = getAllSourceReliability();
    const avgTrustScore = all.length > 0
      ? Math.round(all.reduce((s, r) => s + r.reliabilityScore, 0) / all.length)
      : 75;

    const distribution = [
      { class: "tier_one", count: all.filter((r) => r.reliabilityScore >= 85).length },
      { class: "reliable", count: all.filter((r) => r.reliabilityScore >= 70 && r.reliabilityScore < 85).length },
      { class: "mixed", count: all.filter((r) => r.reliabilityScore >= 50 && r.reliabilityScore < 70).length },
      { class: "unreliable", count: all.filter((r) => r.reliabilityScore >= 30 && r.reliabilityScore < 50).length },
      { class: "toxic", count: all.filter((r) => r.reliabilityScore < 30).length },
    ];

    const sources = all.map((r) => ({
      sourceId: r.sourceName,
      displayName: r.sourceName,
      trustScore: r.reliabilityScore,
      stabilityClass: r.reliabilityScore >= 85 ? "tier_one"
        : r.reliabilityScore >= 70 ? "reliable"
        : r.reliabilityScore >= 50 ? "mixed"
        : r.reliabilityScore >= 30 ? "unreliable"
        : "toxic",
      totalArticles: r.totalEvents,
      clickbaitFlags: 0,
    }));

    res.json({ totalSources: sources.length, avgTrustScore, distribution, sources });
  } catch {
    res.status(500).json({ error: "Failed to get source trust data" });
  }
});

export default router;

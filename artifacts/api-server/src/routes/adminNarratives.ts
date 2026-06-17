// ============================================================
// ADMIN NARRATIVES ROUTES — Sprint 11 Task G
//
// Narrative Health Monitor — tracks lifecycle metrics for all
// narrative threads in the system.
//
// Routes:
//   GET /api/admin/narratives              — full health monitor
//   GET /api/admin/narratives/stats        — aggregate statistics
//   GET /api/admin/narratives/:id/health   — single narrative health
// ============================================================

import { Router } from "express";
import {
  getPersistentNarratives,
  getNarrativeMemoryStats,
  getNarrativeById,
} from "../services/intelligence/narrativeMemory.js";
import {
  computeNarrativeTrend,
  recordNarrativeMention,
} from "../services/intelligence/trendAcceleration.js";
import {
  getActiveSignals,
} from "../services/intelligence/earlySignalDetector.js";
import {
  buildNarrativeGraph,
} from "../services/intelligence/narrativeRelationshipEngine.js";
import {
  getActiveNarratives,
} from "../services/intelligence/narrativeMemory.js";

const router = Router();

// ── GET /api/admin/narratives ─────────────────────────────────

router.get("/admin/narratives", (_req, res) => {
  try {
    const threads = getPersistentNarratives();

    // Seed mention windows and compute trends
    const healthData = threads.map((thread) => {
      for (const dev of thread.developments ?? []) {
        recordNarrativeMention(thread.id, new Date(dev.recordedAt).getTime());
      }
      const trend = computeNarrativeTrend(thread);

      // Compute source spread from developments
      const allSources = new Set<string>();
      for (const dev of thread.developments ?? []) {
        dev.sources.forEach((s) => allSources.add(s));
      }

      // Saturation = how close to resolved (declining + old)
      const ageHours = (Date.now() - new Date(thread.firstSeen).getTime()) / 3_600_000;
      const saturation = thread.maturity === "resolved" ? 100
        : thread.maturity === "declining" ? 75
        : thread.maturity === "peaking" ? 50
        : thread.maturity === "active" ? 25
        : 10;

      return {
        id: thread.id,
        canonicalHeadline: thread.canonicalHeadline,
        theme: thread.theme,
        dominantEntity: thread.dominantEntity,
        maturity: thread.maturity,
        sentimentDirection: thread.sentimentDirection,

        // Health metrics
        momentum: trend.momentumScore,
        velocity: trend.velocity.mentionsPerHour,
        acceleration: trend.velocity.acceleration,
        persistence: Math.round(Math.min(100, ageHours * 1.5)),
        spread: allSources.size,
        saturation,
        classification: trend.classification,

        // Counts
        totalMentions: thread.totalMentions,
        mentionsLast24h: thread.mentionsLast24h,
        entityDensity: (thread.relatedEntities ?? []).length,

        // Lifecycle
        firstSeen: thread.firstSeen,
        lastSeen: thread.lastSeen,
        ageHours: Math.round(ageHours),
        peakScore: thread.peakScore,
        avgScore: thread.avgScore,
        isEarlySignal: trend.isEarlySignal,
      };
    }).sort((a, b) => b.momentum - a.momentum);

    res.json({
      narratives: healthData,
      count: healthData.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── GET /api/admin/narratives/stats ──────────────────────────

router.get("/admin/narratives/stats", (_req, res) => {
  try {
    const memStats = getNarrativeMemoryStats();
    const threads = getActiveNarratives(50);
    const signals = getActiveSignals();
    const graph = buildNarrativeGraph(threads);

    // Compute avg momentum
    const trends = threads.map((t) => {
      for (const dev of t.developments ?? []) {
        recordNarrativeMention(t.id, new Date(dev.recordedAt).getTime());
      }
      return computeNarrativeTrend(t);
    });

    const avgMomentum = trends.length > 0
      ? Math.round(trends.reduce((a, b) => a + b.momentumScore, 0) / trends.length)
      : 0;

    const acceleratingCount = trends.filter((t) => t.classification === "accelerating").length;
    const earlySignalCount = trends.filter((t) => t.isEarlySignal).length;

    res.json({
      ...memStats,
      avgMomentum,
      acceleratingCount,
      earlySignalCount,
      activeSignals: signals.length,
      ecosystemCount: graph.ecosystems.length,
      narrativeRelationships: graph.edges.length,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── GET /api/admin/narratives/:id/health ──────────────────────

router.get("/admin/narratives/:id/health", (req, res) => {
  try {
    const thread = getNarrativeById(req.params.id);
    if (!thread) {
      return res.status(404).json({ error: "Narrative not found" });
    }

    for (const dev of thread.developments ?? []) {
      recordNarrativeMention(thread.id, new Date(dev.recordedAt).getTime());
    }

    const trend = computeNarrativeTrend(thread);

    const ageHours = (Date.now() - new Date(thread.firstSeen).getTime()) / 3_600_000;
    const allSources = new Set<string>();
    for (const dev of thread.developments ?? []) {
      dev.sources.forEach((s) => allSources.add(s));
    }

    res.json({
      thread,
      health: {
        momentum: trend.momentumScore,
        classification: trend.classification,
        velocity: trend.velocity,
        spread: allSources.size,
        persistence: Math.round(Math.min(100, ageHours * 1.5)),
        saturation: thread.maturity === "resolved" ? 100
          : thread.maturity === "declining" ? 75
          : thread.maturity === "peaking" ? 50
          : 25,
        isEarlySignal: trend.isEarlySignal,
        ageHours: Math.round(ageHours),
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

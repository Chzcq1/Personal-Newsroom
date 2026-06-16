// ============================================================
// PROACTIVE INTELLIGENCE ROUTES — Sprint 11
//
// Exposes trend acceleration, early signal detection,
// narrative relationships, entity influence, and user profile.
//
// Routes:
//   GET  /api/intelligence/trends          — full trend summary
//   GET  /api/intelligence/signals         — active early signals
//   GET  /api/intelligence/signals/stats   — signal system stats
//   GET  /api/intelligence/relationships   — narrative graph
//   GET  /api/intelligence/influence       — entity influence map
//   GET  /api/intelligence/profile         — user intelligence profile
//   GET  /api/intelligence/briefing        — intelligence briefing data
// ============================================================

import { Router } from "express";
import {
  buildTrendSummary,
  computeNarrativeTrend,
  recordNarrativeMention,
} from "../services/intelligence/trendAcceleration.js";
import {
  getActiveSignals,
  getSignalStats,
} from "../services/intelligence/earlySignalDetector.js";
import {
  buildNarrativeGraph,
  getRelatedNarratives,
} from "../services/intelligence/narrativeRelationshipEngine.js";
import {
  buildInfluenceMap,
  computeEntityInfluence,
} from "../services/intelligence/entityInfluence.js";
import {
  buildIntelligenceProfile,
} from "../services/intelligence/userIntelligenceProfile.js";
import {
  getActiveNarratives,
  getNarrativeMemoryStats,
  getPersistentNarratives,
} from "../services/intelligence/narrativeMemory.js";
import {
  getAllTrackedEntities,
  getRisingEntities,
} from "../services/intelligence/entityMemory.js";

const router = Router();

// ── GET /api/intelligence/trends ─────────────────────────────

router.get("/api/intelligence/trends", async (_req, res) => {
  try {
    const threads = getActiveNarratives(50);
    const entities = getAllTrackedEntities();

    // Build entity → narrative count map
    const entityNarrativeCounts = new Map<string, number>();
    for (const thread of threads) {
      const allEntities = [thread.dominantEntity, ...(thread.relatedEntities ?? [])].filter(Boolean);
      for (const e of allEntities as string[]) {
        entityNarrativeCounts.set(e, (entityNarrativeCounts.get(e) ?? 0) + 1);
      }
    }

    // Seed mention windows from narrative data for velocity calculation
    for (const thread of threads) {
      for (const dev of thread.developments ?? []) {
        recordNarrativeMention(thread.id, new Date(dev.recordedAt).getTime());
      }
    }

    const summary = buildTrendSummary(threads, entities, entityNarrativeCounts);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── GET /api/intelligence/signals ────────────────────────────

router.get("/api/intelligence/signals", (_req, res) => {
  try {
    const signals = getActiveSignals();
    res.json({ signals, count: signals.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/api/intelligence/signals/stats", (_req, res) => {
  try {
    const stats = getSignalStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── GET /api/intelligence/relationships ──────────────────────

router.get("/api/intelligence/relationships", (_req, res) => {
  try {
    const threads = getActiveNarratives(50);
    const graph = buildNarrativeGraph(threads);
    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/api/intelligence/relationships/:narrativeId", (req, res) => {
  try {
    const threads = getActiveNarratives(50);
    const graph = buildNarrativeGraph(threads);
    const related = getRelatedNarratives(req.params.narrativeId, graph.edges);
    const relatedWithData = related.map((r) => ({
      ...r,
      thread: threads.find((t) => t.id === r.narrativeId) ?? null,
    }));
    res.json({ narrativeId: req.params.narrativeId, related: relatedWithData });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── GET /api/intelligence/influence ──────────────────────────

router.get("/api/intelligence/influence", (_req, res) => {
  try {
    const entities = getAllTrackedEntities();
    const threads = getActiveNarratives(50);
    const influenceMap = buildInfluenceMap(entities, threads);
    res.json(influenceMap);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/api/intelligence/influence/:entityId", (req, res) => {
  try {
    const entities = getAllTrackedEntities();
    const threads = getActiveNarratives(50);
    const entity = entities.find(
      (e) => e.entityId.toLowerCase() === req.params.entityId.toLowerCase(),
    );
    if (!entity) {
      return res.status(404).json({ error: "Entity not found" });
    }
    const score = computeEntityInfluence(entity, threads);
    res.json(score);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── GET /api/intelligence/profile ────────────────────────────

router.get("/api/intelligence/profile", (req, res) => {
  try {
    const interests = String(req.query.interests ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const profile = buildIntelligenceProfile(interests);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── GET /api/intelligence/briefing ───────────────────────────
// Intelligence Briefing Mode (Task F) — strategic analysis data

router.get("/api/intelligence/briefing", (_req, res) => {
  try {
    const threads = getActiveNarratives(30);
    const entities = getAllTrackedEntities();
    const risingEntities = getRisingEntities(10);
    const signals = getActiveSignals().filter((s) => s.confidence >= 0.4);

    const entityNarrativeCounts = new Map<string, number>();
    for (const thread of threads) {
      const allEntities = [thread.dominantEntity, ...(thread.relatedEntities ?? [])].filter(Boolean);
      for (const e of allEntities as string[]) {
        entityNarrativeCounts.set(e, (entityNarrativeCounts.get(e) ?? 0) + 1);
      }
    }

    // Seed mention windows
    for (const thread of threads) {
      for (const dev of thread.developments ?? []) {
        recordNarrativeMention(thread.id, new Date(dev.recordedAt).getTime());
      }
    }

    const trends = buildTrendSummary(threads, entities, entityNarrativeCounts);
    const graph = buildNarrativeGraph(threads);
    const influenceMap = buildInfluenceMap(entities, threads);

    // Major developments = peaking narratives
    const majorDevelopments = threads
      .filter((t) => t.maturity === "peaking" || t.maturity === "active")
      .slice(0, 5)
      .map((t) => ({
        headline: t.canonicalHeadline,
        momentum: trends.topAccelerating.find((tr) => tr.narrativeId === t.id)?.momentumScore ?? 0,
        maturity: t.maturity,
        dominantEntity: t.dominantEntity,
        sourceCount: t.developments?.flatMap((d) => d.sources).filter((v, i, a) => a.indexOf(v) === i).length ?? 0,
      }));

    // Ecosystem connections summary
    const ecosystemSnapshot = graph.ecosystems.slice(0, 3).map((eco) => ({
      label: eco.label,
      nodeCount: eco.totalNodes,
      dominantEntities: eco.dominantEntities.slice(0, 3),
      description: eco.description,
    }));

    res.json({
      generatedAt: new Date().toISOString(),
      majorDevelopments,
      acceleratingNarratives: trends.topAccelerating.slice(0, 5),
      emergingSignals: signals.slice(0, 5),
      risingEntities: risingEntities.slice(0, 8).map((e) => ({
        label: e.label,
        mentionsLast24h: e.mentionsLast24h,
        trend: e.trendDirection,
      })),
      topInfluencers: influenceMap.topInfluencers.slice(0, 5).map((i) => ({
        label: i.label,
        influenceScore: i.influenceScore,
        tier: i.tier,
        direction: i.influenceDirection,
      })),
      ecosystemSnapshot,
      systemMomentum: trends.systemMomentum,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

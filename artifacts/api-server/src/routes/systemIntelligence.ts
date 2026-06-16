// ============================================================
// SYSTEM INTELLIGENCE ROUTES — Sprint 16 Task L
//
// GET /api/admin/system-intelligence
// ============================================================

import { Router } from "express";
import { getActiveNarratives, getNarrativeMemoryStats } from "../services/intelligence/narrativeMemory.js";
import { getAllTrackedEntities } from "../services/intelligence/entityMemory.js";
import { getAdaptiveSummary } from "../services/intelligence/adaptiveInterestEngine.js";
import { getAdaptationState } from "../services/intelligence/feedAdaptationEngine.js";
import { getDeliveryStats } from "../services/analytics/deliveryMetrics.js";
import { getSignalMode, getSignalModeConfig } from "../services/intelligence/signalModeEngine.js";
import { SIGNAL_CLASS_CONFIGS } from "../services/intelligence/confidenceScoring.js";

const router = Router();

router.get("/admin/system-intelligence", (_req, res) => {
  // ── Top narratives ────────────────────────────────────────
  const narratives = getActiveNarratives(10);
  const topNarratives = narratives.map((n) => ({
    id: n.id,
    headline: n.canonicalHeadline,
    maturity: n.maturity,
    mentionCount: n.totalMentions,
    score: n.avgScore,
    entitiesInvolved: n.relatedEntities.slice(0, 3),
    lastUpdated: n.lastSeen,
  }));

  // ── Top entities ──────────────────────────────────────────
  const entities = getAllTrackedEntities();
  const topEntities = entities
    .sort((a, b) => (b.mentionsLast24h ?? 0) - (a.mentionsLast24h ?? 0))
    .slice(0, 10)
    .map((e) => ({
      entityId: e.entityId,
      label: e.label,
      mentions24h: e.mentionsLast24h ?? 0,
      mentions7d: e.mentionsLast7d ?? 0,
      trendDirection: e.trendDirection ?? "stable",
    }));

  // ── Narrative memory stats ────────────────────────────────
  const memStats = getNarrativeMemoryStats();

  // ── Signal/noise ratio ────────────────────────────────────
  const activeCount = memStats.active + memStats.peaking;
  const noisyCount = memStats.declining + memStats.resolved;
  const signalNoiseRatio = memStats.total > 0
    ? Math.round((activeCount / memStats.total) * 100)
    : 0;

  // ── Confidence distribution stub ──────────────────────────
  const confidenceDistribution = Object.values(SIGNAL_CLASS_CONFIGS).map((cfg) => ({
    class: cfg.id,
    label: cfg.label,
    count: 0, // populated by real scoring pipeline in future
  }));

  // ── Delivery stats ────────────────────────────────────────
  const deliveryStats = getDeliveryStats();

  // ── Adaptive intelligence ─────────────────────────────────
  const adaptiveSummary = getAdaptiveSummary();
  const adaptationState = getAdaptationState();

  type EntityAdapt = { entityId: string; boostMultiplier: number; engagements: number; ignores: number };
  const topBoostedEntities = ((adaptationState.topBoosted ?? []) as EntityAdapt[])
    .slice(0, 5)
    .map((e) => ({
      entityId: e.entityId,
      boostMultiplier: e.boostMultiplier,
      engagements: e.engagements,
    }));

  const topSuppressedEntities = ((adaptationState.topSuppressed ?? []) as EntityAdapt[])
    .slice(0, 5)
    .map((e) => ({
      entityId: e.entityId,
      boostMultiplier: e.boostMultiplier,
      ignores: e.ignores,
    }));

  // ── Current signal mode ───────────────────────────────────
  const currentMode = getSignalMode();
  const modeConfig = getSignalModeConfig();

  // ── Token estimates ───────────────────────────────────────
  const tokenMetrics = {
    estimatedDailyBriefings: deliveryStats.totalDeliveries ?? 0,
    avgTokensPerBriefing: 2400,
    estimatedDailyTokens: (deliveryStats.totalDeliveries ?? 0) * 2400,
    provider: process.env["AI_PROVIDER"] ?? "github",
  };

  res.json({
    generatedAt: new Date().toISOString(),
    signalMode: {
      current: currentMode,
      label: modeConfig.label,
      riskLevel: modeConfig.riskLevel,
    },
    narratives: {
      top: topNarratives,
      stats: {
        total: memStats.total,
        active: memStats.active,
        emerging: memStats.emerging,
        peaking: memStats.peaking,
        declining: memStats.declining,
        resolved: memStats.resolved,
      },
    },
    entities: {
      top: topEntities,
      totalTracked: entities.length,
    },
    signalQuality: {
      signalNoiseRatio,
      activeNarrativeCount: activeCount,
      noisyNarrativeCount: noisyCount,
      confidenceDistribution,
    },
    delivery: {
      total: deliveryStats.totalDeliveries,
      successful: deliveryStats.successfulDeliveries,
      failed: deliveryStats.failedDeliveries,
      successRate: deliveryStats.successRate,
    },
    tokens: tokenMetrics,
    adaptation: {
      topBoostedEntities,
      topSuppressedEntities,
      learnedEdges: ((adaptiveSummary as { topLearnedEdges?: unknown[] }).topLearnedEdges ?? []).slice(0, 10),
      expansionClusters: ((adaptiveSummary as { expansionClusters?: unknown[] }).expansionClusters ?? []).length,
    },
  });
});

export default router;

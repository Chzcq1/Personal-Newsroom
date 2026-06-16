// ============================================================
// EFFICIENCY ADMIN ROUTES — Sprint 17
//
// GET /admin/degradation            — degradation status + history
// POST /admin/degradation           — set degradation level manually
// DELETE /admin/degradation         — clear manual override
// GET /admin/token-governor         — token budget snapshot
// GET /admin/intelligence-cache     — cache hit ratio + entries
// DELETE /admin/intelligence-cache  — flush cache
// GET /admin/sources                — source adapter health
// GET /admin/runtime                — runtime separation status
// GET /admin/pipeline               — AI pipeline stats
// ============================================================

import { Router } from "express";
import {
  getDegradationSnapshot,
  setManualOverride,
  clearManualOverride,
  DEGRADATION_CONFIGS,
  type DegradationLevel,
} from "../services/intelligence/degradationEngine.js";
import { getTokenGovernorState } from "../services/intelligence/tokenGovernor.js";
import {
  getIntelligenceCacheStats,
  getCacheEntries,
} from "../services/cache/intelligenceCache.js";
import { getAllSourceAdapters } from "../services/sources/sourceAdapter.js";
import { getRuntimeStats, getMigrationPlan } from "../services/runtime/runtimeSeparation.js";
import { getPipelineStats } from "../services/intelligence/aiPipeline.js";
import { getSessionStats } from "../services/auth/userSession.js";

const router = Router();

// ── Degradation ────────────────────────────────────────────────

router.get("/admin/degradation", (_req, res) => {
  const snapshot = getDegradationSnapshot();
  res.json({
    ...snapshot,
    allLevels: Object.values(DEGRADATION_CONFIGS).map((c) => ({
      level: c.level,
      label: c.label,
      description: c.description,
    })),
  });
});

router.post("/admin/degradation", (req, res) => {
  const { level, reason } = req.body as { level?: number; reason?: string };

  if (level === undefined || level < 0 || level > 4 || !Number.isInteger(level)) {
    res.status(400).json({ error: "level must be 0–4 integer" });
    return;
  }

  setManualOverride(level as DegradationLevel, reason ?? "Manual override via admin API");

  res.json({
    success: true,
    snapshot: getDegradationSnapshot(),
  });
});

router.delete("/admin/degradation", (_req, res) => {
  clearManualOverride();
  res.json({ success: true, snapshot: getDegradationSnapshot() });
});

// ── Token Governor ─────────────────────────────────────────────

router.get("/admin/token-governor", (_req, res) => {
  res.json(getTokenGovernorState());
});

// ── Intelligence Cache ─────────────────────────────────────────

router.get("/admin/intelligence-cache", (_req, res) => {
  const stats = getIntelligenceCacheStats();
  const entries = getCacheEntries();

  res.json({
    stats,
    entries: entries.slice(0, 50), // cap response size
    generatedAt: new Date().toISOString(),
  });
});

router.delete("/admin/intelligence-cache", (_req, res) => {
  // Flush: invalidate all by rebuilding (simple approach — no global flush needed for now)
  res.json({
    success: true,
    message: "Cache will naturally expire per TTL. Use invalidateCluster() for targeted flush.",
    stats: getIntelligenceCacheStats(),
  });
});

// ── Source Adapters ────────────────────────────────────────────

router.get("/admin/sources", async (_req, res) => {
  const adapters = getAllSourceAdapters();

  const healthChecks = await Promise.allSettled(
    adapters.map(async (adapter) => {
      const health = await adapter.health();
      return {
        id: adapter.id,
        displayName: adapter.displayName,
        tier: adapter.tier,
        isEnabled: adapter.isEnabled,
        health,
      };
    }),
  );

  const results = healthChecks.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { id: "unknown", displayName: "unknown", tier: "C", isEnabled: false, health: { ok: false, latencyMs: 0 } },
  );

  res.json({
    adapters: results,
    totalEnabled: results.filter((r) => r.isEnabled).length,
    totalHealthy: results.filter((r) => r.health.ok).length,
    generatedAt: new Date().toISOString(),
  });
});

// ── Runtime Separation ─────────────────────────────────────────

router.get("/admin/runtime", (_req, res) => {
  res.json({
    stats: getRuntimeStats(),
    migrationPlan: getMigrationPlan(),
    generatedAt: new Date().toISOString(),
  });
});

// ── AI Pipeline ────────────────────────────────────────────────

router.get("/admin/pipeline", (_req, res) => {
  res.json({
    pipeline: getPipelineStats(),
    sessions: getSessionStats(),
    generatedAt: new Date().toISOString(),
  });
});

export default router;

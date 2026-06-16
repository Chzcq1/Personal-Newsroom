// ============================================================
// SPRINT 18 ADMIN ROUTES
//
// New admin endpoints for:
//   - Thai localization stats
//   - Source trust profiles
//   - Token survival stats
//   - Source priority snapshot
//   - Signal memory health
//   - BYOK architecture status
//   - Platform adapter health
//   - Deployment hardening check
// ============================================================

import { Router } from "express";
import { logger } from "../lib/logger.js";
import { getLocalizationStats } from "../services/intelligence/thaiLocalizationEngine.js";
import {
  getAllSourceTrustProfiles,
  getTrustSnapshot,
  applyTrustDecay,
} from "../services/intelligence/sourceTrustEngine.js";
import { getSurvivalStats, getMemoStats } from "../services/intelligence/tokenSurvivalEngine.js";
import { getOrchestrationSnapshot } from "../services/intelligence/sourcePriorityOrchestrator.js";
import { getMemoryOptimizationReport } from "../services/intelligence/signalMemoryOptimizer.js";
import { getBYOKSnapshot } from "../services/auth/byokPreparation.js";
import { getPlatformAdapterHealth } from "../services/sources/platformAdapters.js";
import { getDeploymentReadiness } from "../services/infra/deploymentHardening.js";

const router = Router();

// ── Thai Localization Stats ────────────────────────────────────

router.get("/admin/localization", (_req, res) => {
  try {
    const stats = getLocalizationStats();
    res.json({ ok: true, stats });
  } catch (err) {
    logger.error({ err }, "localization stats error");
    res.status(500).json({ ok: false, error: "Failed to fetch localization stats" });
  }
});

// ── Source Trust ──────────────────────────────────────────────

router.get("/admin/source-trust", (_req, res) => {
  try {
    const snapshot = getTrustSnapshot();
    const profiles = getAllSourceTrustProfiles();
    res.json({ ok: true, snapshot, profiles: profiles.slice(0, 50) });
  } catch (err) {
    logger.error({ err }, "source trust error");
    res.status(500).json({ ok: false, error: "Failed to fetch source trust data" });
  }
});

router.post("/admin/source-trust/decay", (_req, res) => {
  try {
    const decayed = applyTrustDecay();
    res.json({ ok: true, decayResults: decayed, count: decayed.length });
  } catch (err) {
    logger.error({ err }, "trust decay error");
    res.status(500).json({ ok: false, error: "Failed to apply trust decay" });
  }
});

// ── Token Survival ────────────────────────────────────────────

router.get("/admin/token-survival", (_req, res) => {
  try {
    const stats = getSurvivalStats();
    const memoStats = getMemoStats();
    res.json({ ok: true, stats, memoStats });
  } catch (err) {
    logger.error({ err }, "token survival error");
    res.status(500).json({ ok: false, error: "Failed to fetch token survival stats" });
  }
});

// ── Source Priority ───────────────────────────────────────────

router.get("/admin/source-priority", (_req, res) => {
  try {
    const snapshot = getOrchestrationSnapshot();
    res.json({ ok: true, snapshot });
  } catch (err) {
    logger.error({ err }, "source priority error");
    res.status(500).json({ ok: false, error: "Failed to fetch source priority data" });
  }
});

// ── Signal Memory ─────────────────────────────────────────────

router.get("/admin/signal-memory", (_req, res) => {
  try {
    const report = getMemoryOptimizationReport();
    res.json({ ok: true, report });
  } catch (err) {
    logger.error({ err }, "signal memory error");
    res.status(500).json({ ok: false, error: "Failed to fetch signal memory report" });
  }
});

// ── BYOK Status ───────────────────────────────────────────────

router.get("/admin/byok", (_req, res) => {
  try {
    const snapshot = getBYOKSnapshot();
    res.json({
      ok: true,
      snapshot,
      note: "BYOK full implementation in Sprint 19. Architecture ready.",
    });
  } catch (err) {
    logger.error({ err }, "byok status error");
    res.status(500).json({ ok: false, error: "Failed to fetch BYOK status" });
  }
});

// ── Platform Adapters ─────────────────────────────────────────

router.get("/admin/platform-adapters", async (_req, res) => {
  try {
    const health = await getPlatformAdapterHealth();
    res.json({ ok: true, adapters: health });
  } catch (err) {
    logger.error({ err }, "platform adapter health error");
    res.status(500).json({ ok: false, error: "Failed to check platform adapters" });
  }
});

// ── Deployment Readiness ──────────────────────────────────────

router.get("/admin/deployment-readiness", (_req, res) => {
  try {
    const readiness = getDeploymentReadiness();
    res.json({ ok: true, readiness });
  } catch (err) {
    logger.error({ err }, "deployment readiness error");
    res.status(500).json({ ok: false, error: "Failed to check deployment readiness" });
  }
});

// ── Sprint 18 Summary ─────────────────────────────────────────

router.get("/admin/sprint18", async (_req, res) => {
  try {
    const [localization, trustSnapshot, survivalStats, memoryReport, byokSnapshot, adapterHealth, readiness] =
      await Promise.all([
        Promise.resolve(getLocalizationStats()),
        Promise.resolve(getTrustSnapshot()),
        Promise.resolve(getSurvivalStats()),
        Promise.resolve(getMemoryOptimizationReport()),
        Promise.resolve(getBYOKSnapshot()),
        getPlatformAdapterHealth(),
        Promise.resolve(getDeploymentReadiness()),
      ]);

    res.json({
      ok: true,
      sprint: 18,
      theme: "Multi-Source Intelligence & Token Sustainability",
      systems: {
        thaiLocalization: {
          status: "active",
          totalProcessed: localization.totalProcessed,
          avgThaiRatio: localization.avgThaiRatio,
        },
        sourceTrust: {
          status: "active",
          totalSources: trustSnapshot.totalSources,
          avgTrustScore: trustSnapshot.avgTrustScore,
        },
        tokenSurvival: {
          status: "active",
          mode: survivalStats.mode,
          estimatedTokensSaved: survivalStats.estimatedTokensSaved,
        },
        signalMemory: {
          status: "active",
          health: memoryReport.health.status,
          totalNarratives: memoryReport.health.totalNarratives,
        },
        byok: {
          status: "architecture_ready",
          totalProfiles: byokSnapshot.totalProfiles,
        },
        platforms: {
          status: "active",
          enabledAdapters: adapterHealth.filter((a) => a.enabled).length,
          totalAdapters: adapterHealth.length,
        },
        deployment: {
          status: readiness.isProductionReady ? "production_ready" : "development",
          score: readiness.score,
        },
      },
    });
  } catch (err) {
    logger.error({ err }, "sprint18 summary error");
    res.status(500).json({ ok: false, error: "Failed to build Sprint 18 summary" });
  }
});

export default router;

// ============================================================
// ECONOMICS ROUTES — Sprint 14 Task H
//
// Cost & usage intelligence for INFOX platform.
// Aggregates AI token costs, delivery costs, and user metrics
// to support sustainability analysis.
//
// GET /api/economics/summary   — top-level cost overview
// GET /api/economics/delivery  — delivery cost breakdown
// GET /api/economics/ai        — AI generation cost breakdown
// GET /api/economics/users     — user growth metrics
// ============================================================

import { Router } from "express";
import { getDeliveryStats, getDeliveriesSince } from "../repositories/deliveryLogRepository.js";
import { getProfileCount, getAllProfiles } from "../repositories/userProfileRepository.js";
import { getQueueStatus } from "../services/delivery/deliveryQueue.js";
import { getLatestAggregation } from "../workers/analyticsWorker.js";
import { getStartupReport } from "../services/infra/startupRecovery.js";

const router = Router();

// ── Pricing constants (approximate, June 2026) ───────────────

const COST_PER_1K_INPUT_TOKENS = 0.0005;   // GitHub Models gpt-4o-mini equivalent
const COST_PER_1K_OUTPUT_TOKENS = 0.0015;
const AVG_OUTPUT_INPUT_RATIO = 0.3;        // output ≈ 30% of input tokens
const TELEGRAM_COST_PER_MESSAGE = 0;       // free tier

// ── GET /api/economics/summary ──────────────────────────────

router.get("/economics/summary", async (_req, res) => {
  const [deliveryStats, profileCount, queueStatus] = await Promise.all([
    getDeliveryStats(),
    getProfileCount(),
    getQueueStatus(),
  ]);

  const totalTokens = deliveryStats.totalTokens;
  const inputTokens = Math.round(totalTokens / (1 + AVG_OUTPUT_INPUT_RATIO));
  const outputTokens = totalTokens - inputTokens;

  const estimatedAiCostUsd =
    (inputTokens / 1000) * COST_PER_1K_INPUT_TOKENS +
    (outputTokens / 1000) * COST_PER_1K_OUTPUT_TOKENS;

  const deliveryCostUsd = deliveryStats.delivered * TELEGRAM_COST_PER_MESSAGE;

  const totalCostUsd = estimatedAiCostUsd + deliveryCostUsd;

  const costPerUser =
    profileCount > 0 ? totalCostUsd / profileCount : 0;

  const costPerDelivery =
    deliveryStats.delivered > 0 ? totalCostUsd / deliveryStats.delivered : 0;

  const successRate =
    deliveryStats.total > 0
      ? Math.round((deliveryStats.delivered / deliveryStats.total) * 100)
      : 100;

  res.json({
    ok: true,
    summary: {
      totalCostUsd: parseFloat(totalCostUsd.toFixed(4)),
      estimatedAiCostUsd: parseFloat(estimatedAiCostUsd.toFixed(4)),
      deliveryCostUsd: parseFloat(deliveryCostUsd.toFixed(4)),
      profileCount,
      costPerUser: parseFloat(costPerUser.toFixed(6)),
      costPerDelivery: parseFloat(costPerDelivery.toFixed(6)),
      totalDeliveries: deliveryStats.total,
      successRate,
      totalTokensUsed: totalTokens,
      queuePending: queueStatus.pending,
      queueFailed: queueStatus.failed,
    },
  });
});

// ── GET /api/economics/delivery ─────────────────────────────

router.get("/economics/delivery", async (_req, res) => {
  const [stats, last7Days] = await Promise.all([
    getDeliveryStats(),
    getDeliveriesSince(new Date(Date.now() - 7 * 24 * 3600 * 1000)),
  ]);

  const byType: Record<string, { count: number; tokens: number; costUsd: number }> = {};
  for (const d of last7Days) {
    const key = d.briefingType ?? "unknown";
    if (!byType[key]) byType[key] = { count: 0, tokens: 0, costUsd: 0 };
    byType[key].count++;
    byType[key].tokens += d.aiTokensUsed ?? 0;
    const tokens = d.aiTokensUsed ?? 0;
    const input = Math.round(tokens / (1 + AVG_OUTPUT_INPUT_RATIO));
    const output = tokens - input;
    byType[key].costUsd +=
      (input / 1000) * COST_PER_1K_INPUT_TOKENS +
      (output / 1000) * COST_PER_1K_OUTPUT_TOKENS;
  }

  // Round cost values
  for (const key of Object.keys(byType)) {
    byType[key].costUsd = parseFloat(byType[key].costUsd.toFixed(6));
  }

  res.json({
    ok: true,
    allTime: stats,
    last7Days: {
      deliveries: last7Days.length,
      byType,
    },
  });
});

// ── GET /api/economics/users ─────────────────────────────────

router.get("/economics/users", async (_req, res) => {
  const [profiles, aggregation] = await Promise.all([
    getAllProfiles(),
    Promise.resolve(getLatestAggregation()),
  ]);

  const now = Date.now();
  const last7d = profiles.filter(
    (p) => now - new Date(p.lastSeen).getTime() < 7 * 24 * 3600 * 1000,
  ).length;
  const last30d = profiles.filter(
    (p) => now - new Date(p.lastSeen).getTime() < 30 * 24 * 3600 * 1000,
  ).length;
  const foundingMembers = profiles.filter((p) => p.foundingMember).length;
  const onboarded = profiles.filter((p) => p.onboardingCompleted).length;

  res.json({
    ok: true,
    users: {
      total: profiles.length,
      activeLastWeek: last7d,
      activeLastMonth: last30d,
      foundingMembers,
      onboarded,
      onboardingRate: profiles.length > 0 ? Math.round((onboarded / profiles.length) * 100) : 0,
    },
    aggregation,
  });
});

// ── GET /api/economics/infrastructure ───────────────────────

router.get("/economics/infrastructure", async (_req, res) => {
  const startupReport = getStartupReport();

  const monthlyEstimates = {
    replitDev: 0,
    railway: 5,
    render: 7,
    flyIo: 5,
    vps: 6,
  };

  res.json({
    ok: true,
    startupReport,
    monthlyInfraEstimatesUsd: monthlyEstimates,
    notes: [
      "AI costs depend on digest frequency and topic count",
      "Telegram delivery is free",
      "PostgreSQL included in Replit plan / free tier on Railway",
    ],
  });
});

export default router;

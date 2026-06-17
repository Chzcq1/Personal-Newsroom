// ============================================================
// ADMIN ANALYTICS ROUTES — Sprint 21 Task D
//
// GET /admin/analytics          — overview snapshot
// GET /admin/analytics/usage    — DAU/WAU/MAU + session data
// GET /admin/analytics/features — feature popularity from events
// GET /admin/analytics/funnel   — conversion funnel stages
// GET /admin/analytics/alerts   — system alert conditions
// ============================================================

import { Router } from "express";
import { db, analyticsEventsTable, deliveryLogsTable, userProfilesTable } from "@workspace/db";
import { desc, gte, sql, count } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { getAllProfiles } from "../repositories/userProfileRepository.js";
import { getDeliveryStats } from "../repositories/deliveryLogRepository.js";
import { getQueueStatus } from "../services/delivery/deliveryQueue.js";
import { getStartupReport } from "../services/infra/startupRecovery.js";
import { getDegradationSnapshot } from "../services/intelligence/degradationEngine.js";
import { getTokenGovernorState } from "../services/intelligence/tokenGovernor.js";
import { getWorkersHealth } from "../workers/workerRegistry.js";

const router = Router();

// ── GET /admin/analytics ─────────────────────────────────────

router.get("/admin/analytics", async (_req, res) => {
  try {
    const [profiles, deliveryStats, queueStatus, eventStats] = await Promise.all([
      getAllProfiles(),
      getDeliveryStats(),
      getQueueStatus(),
      safeEventStats(),
    ]);

    const now = Date.now();
    const dau = profiles.filter((p) => now - new Date(p.lastSeen).getTime() < 86_400_000).length;
    const wau = profiles.filter((p) => now - new Date(p.lastSeen).getTime() < 7 * 86_400_000).length;
    const mau = profiles.filter((p) => now - new Date(p.lastSeen).getTime() < 30 * 86_400_000).length;

    res.json({
      ok: true,
      snapshot: {
        users: { total: profiles.length, dau, wau, mau },
        deliveries: {
          total: deliveryStats.total,
          delivered: deliveryStats.delivered,
          failed: deliveryStats.failed,
          successRate: deliveryStats.total > 0 ? Math.round((deliveryStats.delivered / deliveryStats.total) * 100) : 100,
          queuePending: queueStatus.pending,
          queueFailed: queueStatus.failed,
        },
        events: eventStats,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.warn({ err }, "[AdminAnalytics] overview failed");
    res.status(500).json({ error: "analytics unavailable" });
  }
});

// ── GET /admin/analytics/usage ───────────────────────────────

router.get("/admin/analytics/usage", async (_req, res) => {
  try {
    const profiles = await getAllProfiles();
    const now = Date.now();

    // Daily buckets for the last 14 days
    const dailyBuckets: Array<{ date: string; users: number; newUsers: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now - i * 86_400_000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86_400_000);

      const active = profiles.filter((p) => {
        const seen = new Date(p.lastSeen).getTime();
        return seen >= dayStart.getTime() && seen < dayEnd.getTime();
      }).length;

      const newUsers = profiles.filter((p) => {
        const firstSeen = new Date(p.firstSeen).getTime();
        return firstSeen >= dayStart.getTime() && firstSeen < dayEnd.getTime();
      }).length;

      dailyBuckets.push({
        date: dayStart.toISOString().slice(0, 10),
        users: active,
        newUsers,
      });
    }

    const eventCounts = await safeEventStats();

    res.json({
      ok: true,
      usage: {
        dau: profiles.filter((p) => now - new Date(p.lastSeen).getTime() < 86_400_000).length,
        wau: profiles.filter((p) => now - new Date(p.lastSeen).getTime() < 7 * 86_400_000).length,
        mau: profiles.filter((p) => now - new Date(p.lastSeen).getTime() < 30 * 86_400_000).length,
        totalProfiles: profiles.length,
        dailyBuckets,
        pageViews24h: eventCounts.last24h.byType["PAGE_VIEW"] ?? 0,
        feedViews24h: eventCounts.last24h.byType["FEED_VIEW"] ?? 0,
        articleOpens24h: eventCounts.last24h.byType["ARTICLE_OPEN"] ?? 0,
      },
    });
  } catch (err) {
    logger.warn({ err }, "[AdminAnalytics] usage failed");
    res.status(500).json({ error: "usage analytics unavailable" });
  }
});

// ── GET /admin/analytics/features ───────────────────────────

router.get("/admin/analytics/features", async (_req, res) => {
  try {
    const eventStats = await safeEventStats();
    const byType7d = eventStats.last7d.byType;

    const featureMap: Record<string, { label: string; events7d: number; category: string }> = {
      PAGE_VIEW:           { label: "Page Views",          events7d: byType7d["PAGE_VIEW"] ?? 0,           category: "Navigation" },
      FEED_VIEW:           { label: "Feed Views",          events7d: byType7d["FEED_VIEW"] ?? 0,           category: "Core" },
      ARTICLE_OPEN:        { label: "Article Opens",       events7d: byType7d["ARTICLE_OPEN"] ?? 0,        category: "Core" },
      BRIEFING_SAVE:       { label: "Briefings Saved",     events7d: byType7d["BRIEFING_SAVE"] ?? 0,       category: "Core" },
      BRIEFING_GENERATE:   { label: "Briefings Generated", events7d: byType7d["BRIEFING_GENERATE"] ?? 0,   category: "Core" },
      INTEREST_UPDATE:     { label: "Interest Updates",    events7d: byType7d["INTEREST_UPDATE"] ?? 0,     category: "Personalisation" },
      WATCHLIST_ADD:       { label: "Watchlist Adds",      events7d: byType7d["WATCHLIST_ADD"] ?? 0,       category: "Personalisation" },
      WATCHLIST_REMOVE:    { label: "Watchlist Removes",   events7d: byType7d["WATCHLIST_REMOVE"] ?? 0,    category: "Personalisation" },
      SIGNAL_MODE_CHANGE:  { label: "Signal Mode Changes", events7d: byType7d["SIGNAL_MODE_CHANGE"] ?? 0,  category: "Personalisation" },
      TELEGRAM_CONNECT:    { label: "Telegram Connects",   events7d: byType7d["TELEGRAM_CONNECT"] ?? 0,    category: "Delivery" },
      TELEGRAM_TEST:       { label: "Telegram Tests",      events7d: byType7d["TELEGRAM_TEST"] ?? 0,       category: "Delivery" },
      FEEDBACK_MORE:       { label: "More Like This",      events7d: byType7d["FEEDBACK_MORE"] ?? 0,       category: "Feedback" },
      FEEDBACK_LESS:       { label: "Less Like This",      events7d: byType7d["FEEDBACK_LESS"] ?? 0,       category: "Feedback" },
      FEEDBACK_IRRELEVANT: { label: "Irrelevant",          events7d: byType7d["FEEDBACK_IRRELEVANT"] ?? 0, category: "Feedback" },
      SETTINGS_OPEN:       { label: "Settings Opens",      events7d: byType7d["SETTINGS_OPEN"] ?? 0,       category: "Navigation" },
    };

    const ranked = Object.entries(featureMap)
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.events7d - a.events7d);

    res.json({ ok: true, features: ranked, generatedAt: new Date().toISOString() });
  } catch (err) {
    logger.warn({ err }, "[AdminAnalytics] features failed");
    res.json({ ok: true, features: [], generatedAt: new Date().toISOString() });
  }
});

// ── GET /admin/analytics/funnel ──────────────────────────────

router.get("/admin/analytics/funnel", async (_req, res) => {
  try {
    const profiles = await getAllProfiles();
    const eventStats = await safeEventStats();
    const byType7d = eventStats.last7d.byType;

    const visitors = profiles.length;
    const interestSetup = profiles.filter((p) => {
      const meta = p.metadata as Record<string, unknown>;
      return meta?.["hasInterests"] === true;
    }).length;
    const telegramSetup = (byType7d["TELEGRAM_CONNECT"] ?? 0);
    const briefingReads = (byType7d["FEED_VIEW"] ?? 0) + (byType7d["ARTICLE_OPEN"] ?? 0);
    const returning = profiles.filter((p) => (p.sessionCount ?? 0) > 1).length;

    const pct = (n: number, base: number) =>
      base > 0 ? Math.round((n / base) * 100) : 0;

    res.json({
      ok: true,
      funnel: [
        { stage: "Visitor",          count: visitors,       pct: 100,                     label: "Total anonymous profiles" },
        { stage: "Interest Setup",   count: interestSetup,  pct: pct(interestSetup, visitors), label: "Configured at least 1 interest" },
        { stage: "Telegram Setup",   count: telegramSetup,  pct: pct(telegramSetup, visitors), label: "Connected Telegram (7d)" },
        { stage: "Briefing Read",    count: briefingReads,  pct: pct(briefingReads, visitors), label: "Feed/article views (7d)" },
        { stage: "Returning User",   count: returning,      pct: pct(returning, visitors),     label: "More than 1 session" },
      ],
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, "[AdminAnalytics] funnel failed");
    res.status(500).json({ error: "funnel unavailable" });
  }
});

// ── GET /admin/analytics/alerts ──────────────────────────────

router.get("/admin/analytics/alerts", async (_req, res) => {
  const alerts: Array<{ severity: "critical" | "warning" | "info"; message: string; metric: string }> = [];

  try {
    const [queueStatus, degradation, tokenGov, workerStatuses] = await Promise.all([
      getQueueStatus(),
      Promise.resolve(getDegradationSnapshot()),
      Promise.resolve(getTokenGovernorState()),
      Promise.resolve(getWorkersHealth()),
    ]);

    const startupReport = getStartupReport();

    if (startupReport?.degradedMode) {
      alerts.push({ severity: "critical", message: "Running in degraded mode — database unavailable", metric: "db_health" });
    }

    if (queueStatus.failed > 0) {
      alerts.push({ severity: "warning", message: `${queueStatus.failed} delivery queue items failed`, metric: "queue_failed" });
    }

    if (degradation.level >= 3) {
      alerts.push({ severity: "warning", message: `System degradation at level ${degradation.level} (${degradation.config.label})`, metric: "degradation_level" });
    }

    if (tokenGov.budgetExhausted) {
      alerts.push({ severity: "critical", message: "Daily token budget exhausted", metric: "token_budget" });
    } else if (tokenGov.budgetFraction > 0.85) {
      alerts.push({ severity: "warning", message: `Token budget at ${Math.round(tokenGov.budgetFraction * 100)}%`, metric: "token_budget" });
    }

    const stoppedWorkers = workerStatuses.filter((w) => w.status === "stopped" || w.status === "error" || w.errorCount > 3);
    if (stoppedWorkers.length > 0) {
      alerts.push({ severity: "warning", message: `${stoppedWorkers.length} background worker(s) not running`, metric: "workers" });
    }

    if (alerts.length === 0) {
      alerts.push({ severity: "info", message: "All systems operational", metric: "overall" });
    }

    res.json({ ok: true, alerts, count: alerts.length, generatedAt: new Date().toISOString() });
  } catch (err) {
    logger.warn({ err }, "[AdminAnalytics] alerts failed");
    res.json({ ok: true, alerts: [{ severity: "info", message: "Alert check unavailable", metric: "overall" }], count: 1, generatedAt: new Date().toISOString() });
  }
});

// ── Internal helper ──────────────────────────────────────────

async function safeEventStats() {
  try {
    const since24h = new Date(Date.now() - 86_400_000);
    const since7d = new Date(Date.now() - 7 * 86_400_000);

    const [stats24h, stats7d] = await Promise.all([
      db
        .select({ eventType: analyticsEventsTable.eventType, count: sql<number>`count(*)::int` })
        .from(analyticsEventsTable)
        .where(gte(analyticsEventsTable.createdAt, since24h))
        .groupBy(analyticsEventsTable.eventType),
      db
        .select({ eventType: analyticsEventsTable.eventType, count: sql<number>`count(*)::int` })
        .from(analyticsEventsTable)
        .where(gte(analyticsEventsTable.createdAt, since7d))
        .groupBy(analyticsEventsTable.eventType),
    ]);

    const byType24h: Record<string, number> = {};
    for (const row of stats24h) byType24h[row.eventType] = row.count;

    const byType7d: Record<string, number> = {};
    for (const row of stats7d) byType7d[row.eventType] = row.count;

    return {
      last24h: { total: stats24h.reduce((s, r) => s + r.count, 0), byType: byType24h },
      last7d: { total: stats7d.reduce((s, r) => s + r.count, 0), byType: byType7d },
    };
  } catch {
    return {
      last24h: { total: 0, byType: {} },
      last7d: { total: 0, byType: {} },
    };
  }
}

export default router;

// ============================================================
// EVENT TRACKING ROUTES — Sprint 21 Task C
//
// POST /events/track  — record a single analytics event
// POST /events/batch  — record multiple events at once
// ============================================================

import { Router } from "express";
import { db, analyticsEventsTable } from "@workspace/db";
import { desc, gte, eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

const VALID_EVENT_TYPES = new Set([
  "PAGE_VIEW",
  "FEED_VIEW",
  "ARTICLE_OPEN",
  "BRIEFING_SAVE",
  "WATCHLIST_ADD",
  "WATCHLIST_REMOVE",
  "TELEGRAM_CONNECT",
  "TELEGRAM_TEST",
  "FEEDBACK_MORE",
  "FEEDBACK_LESS",
  "FEEDBACK_IRRELEVANT",
  "INTEREST_UPDATE",
  "ONBOARDING_STEP",
  "BRIEFING_GENERATE",
  "SIGNAL_MODE_CHANGE",
  "SETTINGS_OPEN",
]);

function randomId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── POST /events/track ───────────────────────────────────────

router.post("/events/track", async (req, res) => {
  const { eventType, profileId, sessionId, properties, url, referrer } =
    req.body as {
      eventType?: string;
      profileId?: string;
      sessionId?: string;
      properties?: Record<string, unknown>;
      url?: string;
      referrer?: string;
    };

  if (!eventType || typeof eventType !== "string") {
    res.status(400).json({ error: "eventType is required" });
    return;
  }

  const normalised = eventType.toUpperCase();
  if (!VALID_EVENT_TYPES.has(normalised)) {
    // Accept unknown types but log them — future-proof
    logger.debug({ eventType: normalised }, "[Events] unknown event type tracked");
  }

  try {
    await db.insert(analyticsEventsTable).values({
      id: randomId(),
      profileId: typeof profileId === "string" ? profileId : null,
      sessionId: typeof sessionId === "string" ? sessionId : null,
      eventType: normalised,
      properties: typeof properties === "object" && properties !== null ? properties : {},
      url: typeof url === "string" ? url : null,
      referrer: typeof referrer === "string" ? referrer : null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    logger.warn({ err }, "[Events] insert failed");
    res.status(500).json({ error: "tracking unavailable" });
  }
});

// ── POST /events/batch ───────────────────────────────────────

router.post("/events/batch", async (req, res) => {
  const { events } = req.body as {
    events?: Array<{
      eventType: string;
      profileId?: string;
      sessionId?: string;
      properties?: Record<string, unknown>;
      url?: string;
    }>;
  };

  if (!Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: "events array required" });
    return;
  }

  const rows = events.slice(0, 50).map((e) => ({
    id: randomId(),
    profileId: typeof e.profileId === "string" ? e.profileId : null,
    sessionId: typeof e.sessionId === "string" ? e.sessionId : null,
    eventType: (typeof e.eventType === "string" ? e.eventType : "UNKNOWN").toUpperCase(),
    properties: typeof e.properties === "object" && e.properties !== null ? e.properties : {},
    url: typeof e.url === "string" ? e.url : null,
    referrer: null,
    userAgent: req.headers["user-agent"] ?? null,
  }));

  try {
    await db.insert(analyticsEventsTable).values(rows);
    res.status(201).json({ ok: true, count: rows.length });
  } catch (err) {
    logger.warn({ err }, "[Events] batch insert failed");
    res.status(500).json({ error: "tracking unavailable" });
  }
});

// ── GET /admin/events/recent ─────────────────────────────────

router.get("/admin/events/recent", async (req, res) => {
  const limit = Math.min(Number(req.query["limit"] ?? 100), 500);
  try {
    const events = await db
      .select()
      .from(analyticsEventsTable)
      .orderBy(desc(analyticsEventsTable.createdAt))
      .limit(limit);
    res.json({ ok: true, events, count: events.length });
  } catch (err) {
    logger.warn({ err }, "[Events] query failed");
    res.json({ ok: true, events: [], count: 0 });
  }
});

// ── GET /admin/events/stats ──────────────────────────────────

router.get("/admin/events/stats", async (_req, res) => {
  try {
    const since24h = new Date(Date.now() - 24 * 3600 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);

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

    res.json({
      ok: true,
      last24h: { total: stats24h.reduce((s, r) => s + r.count, 0), byType: byType24h },
      last7d: { total: stats7d.reduce((s, r) => s + r.count, 0), byType: byType7d },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, "[Events] stats failed");
    res.json({
      ok: true,
      last24h: { total: 0, byType: {} },
      last7d: { total: 0, byType: {} },
      generatedAt: new Date().toISOString(),
    });
  }
});

export default router;

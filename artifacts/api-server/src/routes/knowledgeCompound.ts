// ============================================================
// KNOWLEDGE COMPOUND API — Sprint 15 Task F
//
// Endpoints:
//   GET /api/intelligence/compound?days=7   — compound rate
//   GET /api/intelligence/compound/weekly   — weekly breakdown
//   POST /api/intelligence/compound/session — record a session
// ============================================================

import { Router } from "express";
import {
  calculateCompoundRate,
  getWeeklySummary,
  recordCompoundSession,
} from "../services/intelligence/knowledgeCompound.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/intelligence/compound", (_req, res) => {
  try {
    const days = parseInt(String(_req.query["days"] ?? "7"), 10);
    const safeDays = isNaN(days) || days < 1 ? 7 : Math.min(days, 90);
    const data = getWeeklySummary();
    // Return the full weekly summary — client picks period for display
    res.json(data);
  } catch (err) {
    logger.error({ err }, "[KnowledgeCompound] GET /compound error");
    res.status(500).json({ error: "Failed to calculate compound rate" });
  }
});

router.get("/intelligence/compound/weekly", (_req, res) => {
  try {
    res.json(getWeeklySummary());
  } catch (err) {
    logger.error({ err }, "[KnowledgeCompound] GET /compound/weekly error");
    res.status(500).json({ error: "Failed to get weekly summary" });
  }
});

router.post("/intelligence/compound/session", (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    const {
      articlesDelivered = 0,
      articlesFiltered = 0,
      briefingType = "on-demand",
      topicId = "unknown",
      signalRatio = 0,
      wasSaved = false,
      alertsDelivered = 0,
      narrativesTracked = 0,
    } = body;

    const validTypes = ["on-demand", "morning", "evening", "executive", "intelligence"] as const;
    const safeType = validTypes.includes(briefingType) ? briefingType : "on-demand";

    recordCompoundSession({
      articlesDelivered: Number(articlesDelivered),
      articlesFiltered: Number(articlesFiltered),
      briefingType: safeType,
      topicId: String(topicId),
      signalRatio: Math.min(1, Math.max(0, Number(signalRatio))),
      wasSaved: Boolean(wasSaved),
      alertsDelivered: Number(alertsDelivered),
      narrativesTracked: Number(narrativesTracked),
    });

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[KnowledgeCompound] POST /compound/session error");
    res.status(500).json({ error: "Failed to record session" });
  }
});

export default router;

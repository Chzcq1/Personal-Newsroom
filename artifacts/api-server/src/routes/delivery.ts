// ============================================================
// DELIVERY ROUTES
//
// POST /api/delivery/morning              — Generate + send morning briefing
// POST /api/delivery/evening              — Generate + send evening briefing
// GET  /api/delivery/preview/morning      — Preview morning (no send)
// GET  /api/delivery/preview/evening      — Preview evening (no send)
//
// All endpoints accept an optional topicIds[] filter.
// If omitted, all 5 topics are used.
// ============================================================

import { Router } from "express";
import { generateBriefing, generateAndDeliver } from "../services/delivery/deliveryEngine.js";
import { createTelegramDelivery } from "../services/delivery/telegramDelivery.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── POST /api/delivery/morning ───────────────────────────────

router.post("/delivery/morning", async (req, res) => {
  const { topicIds, botToken, chatId } = req.body as {
    topicIds?: string[];
    botToken?: string;
    chatId?: string;
  };

  if (botToken && chatId) {
    const channel = createTelegramDelivery(botToken.trim(), chatId.trim());
    if (!channel) {
      res.status(400).json({ error: "Invalid Telegram credentials" });
      return;
    }
    const result = await generateAndDeliver("morning", channel, topicIds);
    logger.info({ success: result.success, topicsUsed: result.topicsUsed }, "Morning briefing delivered");
    res.json(result);
  } else {
    const result = await generateBriefing("morning", topicIds);
    res.json(result);
  }
});

// ── POST /api/delivery/evening ───────────────────────────────

router.post("/delivery/evening", async (req, res) => {
  const { topicIds, botToken, chatId } = req.body as {
    topicIds?: string[];
    botToken?: string;
    chatId?: string;
  };

  if (botToken && chatId) {
    const channel = createTelegramDelivery(botToken.trim(), chatId.trim());
    if (!channel) {
      res.status(400).json({ error: "Invalid Telegram credentials" });
      return;
    }
    const result = await generateAndDeliver("evening", channel, topicIds);
    logger.info({ success: result.success, topicsUsed: result.topicsUsed }, "Evening briefing delivered");
    res.json(result);
  } else {
    const result = await generateBriefing("evening", topicIds);
    res.json(result);
  }
});

// ── GET /api/delivery/preview/morning ────────────────────────
// Returns the formatted Telegram message text without sending it.
// Used by the /delivery-preview frontend page.

router.get("/delivery/preview/morning", async (_req, res) => {
  const result = await generateBriefing("morning");
  if (!result.success) {
    res.status(500).json({ error: result.error ?? "Failed to generate morning briefing" });
    return;
  }
  res.json({
    type: "morning",
    rawText: result.rawText,
    formattedMessages: result.formattedMessages,
    generatedAt: result.generatedAt,
    generationTimeMs: result.generationTimeMs,
    articleCount: result.articleCount,
    topicsUsed: result.topicsUsed,
  });
});

// ── GET /api/delivery/preview/evening ────────────────────────

router.get("/delivery/preview/evening", async (_req, res) => {
  const result = await generateBriefing("evening");
  if (!result.success) {
    res.status(500).json({ error: result.error ?? "Failed to generate evening briefing" });
    return;
  }
  res.json({
    type: "evening",
    rawText: result.rawText,
    formattedMessages: result.formattedMessages,
    generatedAt: result.generatedAt,
    generationTimeMs: result.generationTimeMs,
    articleCount: result.articleCount,
    topicsUsed: result.topicsUsed,
  });
});

export default router;

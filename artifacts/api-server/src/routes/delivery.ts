// ============================================================
// DELIVERY ROUTES — Sprint 12 update
//
// POST /api/delivery/morning              — Generate + send morning briefing
// POST /api/delivery/evening              — Generate + send evening briefing
// GET  /api/delivery/preview/morning      — Preview morning (no send)
// GET  /api/delivery/preview/evening      — Preview evening (no send)
// POST /api/delivery/preview/send         — Send a real briefing preview to Telegram (Task A)
// GET  /api/admin/delivery                — Delivery analytics V2 (Task I)
// GET  /api/delivery/recovery             — Recovery snapshot (Task F)
// ============================================================

import { Router } from "express";
import {
  generateBriefing,
  generateAndDeliver,
  generateExecutiveBriefing,
  generateIntelligenceBriefing,
} from "../services/delivery/deliveryEngine.js";
import { createTelegramDelivery } from "../services/delivery/telegramDelivery.js";
import { getAnalyticsSnapshot } from "../services/analytics/deliveryMetrics.js";
import { getRecoverySnapshot } from "../services/delivery/deliveryRecovery.js";
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
    compressionStats: result.compressionStats,
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
    compressionStats: result.compressionStats,
  });
});

// ── POST /api/delivery/preview/send — Task A ─────────────────
// Generate a real briefing and send it to Telegram as a preview.
// Supports: morning | evening | executive | intelligence

router.post("/delivery/preview/send", async (req, res) => {
  const { botToken, chatId, briefingType, topicId } = req.body as {
    botToken?: string;
    chatId?: string;
    briefingType?: "morning" | "evening" | "executive" | "intelligence";
    topicId?: string;
  };

  if (!botToken?.trim() || !chatId?.trim()) {
    res.status(400).json({ success: false, error: "botToken and chatId are required" });
    return;
  }

  const type = briefingType ?? "morning";
  const channel = createTelegramDelivery(botToken.trim(), chatId.trim());
  if (!channel) {
    res.status(400).json({ success: false, error: "Invalid Telegram credentials" });
    return;
  }

  logger.info({ type, topicId }, "Generating briefing preview for Telegram send");

  let result;
  try {
    if (type === "executive") {
      result = await generateExecutiveBriefing();
    } else if (type === "intelligence") {
      result = await generateIntelligenceBriefing(topicId ?? "ai");
    } else {
      result = await generateBriefing(type);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
    return;
  }

  if (!result.success) {
    res.status(500).json({
      success: false,
      error: result.error ?? "Failed to generate briefing",
      type,
    });
    return;
  }

  const channelResult = await channel.send(result.formattedMessages);

  logger.info({
    type,
    success: channelResult.success,
    messageCount: result.formattedMessages.length,
    articleCount: result.articleCount,
  }, "Briefing preview sent");

  res.json({
    success: channelResult.success,
    type,
    articleCount: result.articleCount,
    topicsUsed: result.topicsUsed,
    messageCount: result.formattedMessages.length,
    generationTimeMs: result.generationTimeMs,
    generatedAt: result.generatedAt,
    compressionStats: result.compressionStats,
    error: channelResult.success ? undefined : channelResult.error,
  });
});

// ── GET /api/admin/delivery — Delivery Analytics V2 ──────────

router.get("/admin/delivery", (_req, res) => {
  const snapshot = getAnalyticsSnapshot();
  res.json(snapshot);
});

// ── GET /api/delivery/recovery — Recovery snapshot ───────────

router.get("/delivery/recovery", (_req, res) => {
  const snapshot = getRecoverySnapshot();
  res.json(snapshot);
});

export default router;

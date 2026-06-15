// ============================================================
// TELEGRAM ROUTES
//
// POST /api/telegram/test   — Verify bot token + chat ID
// POST /api/telegram/send   — Send a briefing to Telegram
//
// Credentials are accepted in the request body (from UI settings)
// so users can test before configuring as env vars.
// ============================================================

import { Router } from "express";
import { TelegramDelivery } from "../services/delivery/telegramDelivery.js";
import { formatBriefingForTelegram } from "../services/delivery/briefingFormatter.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── POST /api/telegram/test ──────────────────────────────────
// Verifies that the bot can reach the specified chat.
// Does not send a message — only calls getChat.

router.post("/telegram/test", async (req, res) => {
  const { botToken, chatId } = req.body as {
    botToken?: string;
    chatId?: string;
  };

  if (!botToken?.trim() || !chatId?.trim()) {
    res.status(400).json({ success: false, error: "botToken and chatId are required" });
    return;
  }

  const telegram = new TelegramDelivery(botToken.trim(), chatId.trim());

  try {
    const ok = await telegram.verify();
    if (ok) {
      logger.info({ chatId }, "Telegram connection verified");
      res.json({ success: true, message: "Connection verified — bot can reach the chat" });
    } else {
      res.json({ success: false, error: "Bot cannot reach the chat. Check the bot token and chat ID." });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.json({ success: false, error: msg });
  }
});

// ── POST /api/telegram/send ──────────────────────────────────
// Sends a pre-generated briefing text to Telegram.
// Used by the "Send to Telegram" button in the UI.

router.post("/telegram/send", async (req, res) => {
  const { botToken, chatId, briefingText, topicLabel, topicLabelTh, generatedAt } = req.body as {
    botToken?: string;
    chatId?: string;
    briefingText?: string;
    topicLabel?: string;
    topicLabelTh?: string;
    generatedAt?: string;
  };

  if (!botToken?.trim() || !chatId?.trim()) {
    res.status(400).json({ success: false, error: "botToken and chatId are required" });
    return;
  }
  if (!briefingText?.trim()) {
    res.status(400).json({ success: false, error: "briefingText is required" });
    return;
  }

  const messages = formatBriefingForTelegram(
    briefingText,
    topicLabel ?? "Intelligence Briefing",
    topicLabelTh ?? "",
    generatedAt ?? new Date().toISOString(),
  );

  const telegram = new TelegramDelivery(botToken.trim(), chatId.trim());

  try {
    const result = await telegram.send(messages);
    logger.info(
      { chatId, messageCount: messages.length, success: result.success },
      "Manual Telegram send completed",
    );
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;

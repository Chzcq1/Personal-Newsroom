// ============================================================
// TELEGRAM ROUTES — Sprint 6 Task A
//
// POST /api/telegram/test          — Verify bot token + chat ID
// POST /api/telegram/send          — Send a briefing to Telegram
// POST /api/telegram/diagnostics   — Full diagnostic report
// ============================================================

import { Router } from "express";
import { TelegramDelivery } from "../services/delivery/telegramDelivery.js";
import { formatBriefingForTelegram } from "../services/delivery/briefingFormatter.js";
import { logger } from "../lib/logger.js";

const TELEGRAM_API_BASE = "https://api.telegram.org";

const router = Router();

// ── Shared Telegram API helpers ───────────────────────────────

type TelegramResponse = { ok: boolean; result?: unknown; description?: string; error_code?: number };

async function telegramGet(
  botToken: string,
  method: string,
  params: Record<string, string> = {},
): Promise<TelegramResponse> {
  const url = new URL(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  return res.json() as Promise<TelegramResponse>;
}

async function telegramPost(
  botToken: string,
  method: string,
  body: Record<string, string>,
): Promise<TelegramResponse> {
  const url = `${TELEGRAM_API_BASE}/bot${botToken}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<TelegramResponse>;
}

// ── POST /api/telegram/test ──────────────────────────────────

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

// ── POST /api/telegram/diagnostics ──────────────────────────
// Returns a full diagnostic report: bot info, chat info, API health.

router.post("/telegram/diagnostics", async (req, res) => {
  const { botToken, chatId } = req.body as {
    botToken?: string;
    chatId?: string;
  };

  if (!botToken?.trim()) {
    res.status(400).json({ error: "botToken is required" });
    return;
  }

  const token = botToken.trim();
  const chat = chatId?.trim();

  const report: {
    checkedAt: string;
    tokenProvided: boolean;
    chatIdProvided: boolean;
    bot: {
      ok: boolean;
      username?: string;
      firstName?: string;
      id?: number;
      canJoinGroups?: boolean;
      canReadMessages?: boolean;
      rawResponse?: unknown;
      error?: string;
    };
    chat: {
      ok: boolean;
      chatId?: string;
      type?: string;
      title?: string;
      username?: string;
      rawResponse?: unknown;
      error?: string;
    } | null;
    diagnosis: string[];
    overallOk: boolean;
  } = {
    checkedAt: new Date().toISOString(),
    tokenProvided: !!token,
    chatIdProvided: !!chat,
    bot: { ok: false },
    chat: null,
    diagnosis: [],
    overallOk: false,
  };

  // Step 1: Check bot token via getMe
  try {
    const getMeRes = await telegramGet(token, "getMe");
    if (getMeRes.ok && getMeRes.result && typeof getMeRes.result === "object") {
      const botInfo = getMeRes.result as {
        id?: number;
        username?: string;
        first_name?: string;
        can_join_groups?: boolean;
        can_read_all_group_messages?: boolean;
      };
      report.bot = {
        ok: true,
        id: botInfo.id,
        username: botInfo.username,
        firstName: botInfo.first_name,
        canJoinGroups: botInfo.can_join_groups,
        canReadMessages: botInfo.can_read_all_group_messages,
        rawResponse: getMeRes.result,
      };
      report.diagnosis.push(`✅ Bot token valid — @${botInfo.username ?? "unknown"}`);
    } else {
      report.bot = {
        ok: false,
        rawResponse: getMeRes,
        error: getMeRes.description ?? "Invalid bot token",
      };
      report.diagnosis.push(`❌ Bot token invalid: ${getMeRes.description ?? "Unknown error"}`);
      if (getMeRes.error_code === 401) {
        report.diagnosis.push("💡 The token was rejected by Telegram. Get a new token from @BotFather.");
      }
    }
  } catch (err) {
    report.bot = { ok: false, error: String(err) };
    report.diagnosis.push(`❌ Cannot reach Telegram API: ${String(err)}`);
    report.diagnosis.push("💡 Check network connectivity from the server.");
  }

  // Step 2: Check chat ID (if token is valid and chatId provided)
  if (report.bot.ok && chat) {
    try {
      const getChatRes = await telegramGet(token, "getChat", { chat_id: chat });
      if (getChatRes.ok && getChatRes.result && typeof getChatRes.result === "object") {
        const chatInfo = getChatRes.result as {
          type?: string;
          title?: string;
          username?: string;
          first_name?: string;
        };
        const displayName =
          chatInfo.title ?? chatInfo.username ?? chatInfo.first_name ?? chat;
        report.chat = {
          ok: true,
          chatId: chat,
          type: chatInfo.type,
          title: displayName,
          username: chatInfo.username,
          rawResponse: getChatRes.result,
        };
        report.diagnosis.push(
          `✅ Chat accessible — ${chatInfo.type ?? "unknown"}: "${displayName}"`,
        );
        if (chatInfo.type === "channel") {
          report.diagnosis.push(
            "ℹ️ This is a channel. Make sure the bot is an admin with post permissions.",
          );
        } else if (chatInfo.type === "group" || chatInfo.type === "supergroup") {
          report.diagnosis.push(
            "ℹ️ This is a group. The bot must be a member of the group.",
          );
        }
      } else {
        report.chat = {
          ok: false,
          chatId: chat,
          rawResponse: getChatRes,
          error: getChatRes.description ?? "Chat not found",
        };
        report.diagnosis.push(`❌ Chat not accessible: ${getChatRes.description ?? "Unknown error"}`);

        if (getChatRes.error_code === 400) {
          report.diagnosis.push(
            "💡 Chat not found. If this is a group, add the bot first, then send a message. For channels, make the bot an admin.",
          );
        } else if (getChatRes.error_code === 403) {
          report.diagnosis.push(
            "💡 Bot was kicked from the chat or lacks permission. Re-add the bot to the group/channel.",
          );
        }
      }
    } catch (err) {
      report.chat = { ok: false, chatId: chat, error: String(err) };
      report.diagnosis.push(`❌ Chat check failed: ${String(err)}`);
    }
  } else if (!chat) {
    report.diagnosis.push("⚠️ No Chat ID provided — cannot validate chat access");
    report.diagnosis.push(
      "💡 Send a message to your bot then visit https://api.telegram.org/bot{TOKEN}/getUpdates to find your chat ID",
    );
  }

  report.overallOk = report.bot.ok && (report.chat?.ok ?? false);

  if (report.overallOk) {
    report.diagnosis.push("🎉 Everything looks good! Delivery should work.");
  }

  logger.info(
    { overallOk: report.overallOk, botOk: report.bot.ok, chatOk: report.chat?.ok },
    "Telegram diagnostics completed",
  );

  res.json(report);
});

// ── POST /api/telegram/test-message ─────────────────────────
// Task A: Send an actual test message to confirm delivery works.
// Returns bot username, chat title, and the Telegram message ID.

router.post("/telegram/test-message", async (req, res) => {
  const { botToken, chatId } = req.body as {
    botToken?: string;
    chatId?: string;
  };

  if (!botToken?.trim() || !chatId?.trim()) {
    res.status(400).json({ success: false, error: "botToken and chatId are required" });
    return;
  }

  const token = botToken.trim();
  const chat = chatId.trim();

  // Step 1: Get bot + chat info for personalised message
  let botUsername = "your bot";
  let chatTitle = chat;

  try {
    const meRes = await telegramGet(token, "getMe");
    if (meRes.ok && meRes.result) {
      const info = meRes.result as { username?: string; first_name?: string };
      botUsername = info.username ? `@${info.username}` : (info.first_name ?? "your bot");
    }
  } catch { /* continue even if getMe fails */ }

  try {
    const chatRes = await telegramGet(token, "getChat", { chat_id: chat });
    if (chatRes.ok && chatRes.result) {
      const info = chatRes.result as { title?: string; username?: string; first_name?: string };
      chatTitle = info.title ?? (info.username ? `@${info.username}` : (info.first_name ?? chat));
    }
  } catch { /* continue */ }

  // Step 2: Format ICT timestamp
  const sentAt = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " ICT";

  // Step 3: Build test message
  const testMessage = [
    `<b>🔔 INFOX Delivery Test</b>`,
    ``,
    `<i>Confirming your briefing delivery setup.</i>`,
    ``,
    `✅ <b>Bot:</b> ${botUsername}`,
    `✅ <b>Chat:</b> ${chatTitle}`,
    `📅 <b>Sent:</b> ${sentAt}`,
    ``,
    `Morning briefings: <b>07:00 ICT</b>`,
    `Evening briefings: <b>18:00 ICT</b>`,
    ``,
    `<i>─── Personal AI Newsroom ───</i>`,
  ].join("\n");

  // Step 4: Send
  try {
    const sendRes = await telegramPost(token, "sendMessage", {
      chat_id: chat,
      text: testMessage,
      parse_mode: "HTML",
    });

    if (sendRes.ok) {
      logger.info({ chatId: chat, botUsername }, "Test message sent successfully");
      res.json({
        success: true,
        botUsername,
        chatTitle,
        messageId: (sendRes.result as { message_id?: number })?.message_id,
        sentAt: new Date().toISOString(),
      });
    } else {
      logger.warn({ chatId: chat, error: sendRes.description }, "Test message failed");
      res.json({
        success: false,
        error: sendRes.description ?? "Telegram rejected the message",
        botUsername,
        chatTitle,
        errorCode: sendRes.error_code,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

// ── POST /api/telegram/send ──────────────────────────────────

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

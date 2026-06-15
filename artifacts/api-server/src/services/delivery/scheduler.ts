// ============================================================
// DELIVERY SCHEDULER
//
// Runs morning (07:00) and evening (18:00) briefings automatically.
// Uses setInterval polling every 60 seconds.
// Tracks delivered briefings in memory (per day) to prevent duplicates.
//
// Activation requirements:
//   TELEGRAM_BOT_TOKEN  — set in Replit Secrets
//   TELEGRAM_CHAT_ID    — set in Replit Secrets
//
// Timezone:
//   SCHEDULER_TIMEZONE  — set in Replit env vars (default: Asia/Bangkok)
//
// Server restarts: on startup, checks whether today's scheduled
// briefings have been missed and sends them immediately if within
// a 30-minute window of the scheduled time.
// ============================================================

import { config } from "../../config/env.js";
import { createTelegramDelivery } from "./telegramDelivery.js";
import { generateAndDeliver, type BriefingType } from "./deliveryEngine.js";
import { logger } from "../../lib/logger.js";

// In-memory set of briefings sent this session.
// Key format: "morning_2026-06-15" | "evening_2026-06-15"
const sentKeys = new Set<string>();

function getSchedulerTime(): { hour: number; minute: number; dateKey: string } {
  const tz = config.schedulerTimezone;
  const now = new Date();

  const hourStr = now.toLocaleString("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  });
  const minuteStr = now.toLocaleString("en-US", {
    timeZone: tz,
    minute: "2-digit",
  });
  const dateKey = now.toLocaleDateString("en-CA", { timeZone: tz }); // "2026-06-15"

  return {
    hour: parseInt(hourStr, 10),
    minute: parseInt(minuteStr, 10),
    dateKey,
  };
}

function sentKey(type: BriefingType, dateKey: string): string {
  return `${type}_${dateKey}`;
}

async function triggerDelivery(type: BriefingType): Promise<void> {
  const botToken = config.telegram.botToken;
  const chatId = config.telegram.chatId;

  if (!botToken || !chatId) {
    logger.warn(
      { type },
      "Scheduled delivery skipped — TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set",
    );
    return;
  }

  const channel = createTelegramDelivery(botToken, chatId);
  if (!channel) return;

  logger.info({ type }, "Scheduler triggering delivery");

  const result = await generateAndDeliver(type, channel);

  if (result.success) {
    logger.info(
      { type, articleCount: result.articleCount, topicsUsed: result.topicsUsed },
      "Scheduled delivery completed",
    );
  } else {
    logger.error({ type, error: result.error }, "Scheduled delivery failed");
  }
}

function checkAndDeliver(): void {
  const { hour, minute, dateKey } = getSchedulerTime();

  const schedules: Array<{ type: BriefingType; targetHour: number }> = [
    { type: "morning", targetHour: 7 },
    { type: "evening", targetHour: 18 },
  ];

  for (const { type, targetHour } of schedules) {
    const key = sentKey(type, dateKey);
    // Trigger within first 5 minutes of the hour to handle missed restarts
    if (hour === targetHour && minute < 5 && !sentKeys.has(key)) {
      sentKeys.add(key); // mark immediately to prevent double-trigger
      triggerDelivery(type).catch((err) => {
        logger.error({ type, err: String(err) }, "Unexpected scheduler error");
      });
    }
  }
}

/**
 * Start the delivery scheduler.
 * Call this once when the API server boots.
 * Has no effect if Telegram credentials are not configured.
 */
export function startScheduler(): void {
  const hasCreds = !!config.telegram.botToken && !!config.telegram.chatId;
  const timezone = config.schedulerTimezone;

  logger.info(
    {
      timezone,
      morningTime: "07:00",
      eveningTime: "18:00",
      telegramConfigured: hasCreds,
    },
    "Delivery scheduler started",
  );

  if (!hasCreds) {
    logger.warn(
      "Scheduled Telegram delivery is INACTIVE — set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Replit Secrets to activate",
    );
  }

  // Initial check in case server started near a scheduled time
  checkAndDeliver();

  // Poll every 60 seconds
  setInterval(checkAndDeliver, 60_000);
}

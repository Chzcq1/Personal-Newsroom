// ============================================================
// RETRY WORKER — Sprint 14 Task G
//
// Processes due delivery queue items and retries failed ones.
// Runs every 60 seconds.
// ============================================================

import { BaseWorker } from "./baseWorker.js";
import { WORKER_NAMES } from "./workerTypes.js";
import { getDueDeliveries, markQueueItemSent, markQueueItemFailed } from "../services/delivery/deliveryQueue.js";
import { logger } from "../lib/logger.js";
import { config } from "../config/env.js";

export class RetryWorker extends BaseWorker {
  readonly name = WORKER_NAMES.RETRY;
  readonly intervalMs = 60_000; // every minute

  async execute(): Promise<void> {
    const due = await getDueDeliveries();
    if (due.length === 0) return;

    logger.info({ count: due.length }, "[RetryWorker] Processing due delivery items");

    const { telegram } = config;
    if (!telegram.botToken || !telegram.chatId) {
      logger.debug("[RetryWorker] Telegram not configured — skipping retries");
      return;
    }

    for (const item of due) {
      try {
        const { sendTelegramMessages } = await import("../services/delivery/telegramDelivery.js");
        await sendTelegramMessages(
          item.formattedMessages,
          telegram.botToken,
          telegram.chatId,
        );
        await markQueueItemSent(item.id);
        logger.info({ id: item.id, type: item.briefingType }, "[RetryWorker] Retry succeeded");
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await markQueueItemFailed(item.id, error);
        logger.warn({ id: item.id, error }, "[RetryWorker] Retry failed");
      }
    }
  }
}

// ============================================================
// TELEGRAM DELIVERY SERVICE — Architecture stub (Task F)
//
// This file defines the service interface and integration flow
// for future Telegram delivery. No bot interaction is implemented yet.
//
// ── INTEGRATION FLOW ─────────────────────────────────────────
//
// 1. User clicks "Send to Telegram" in the UI
// 2. Frontend calls POST /api/delivery/telegram
// 3. Route handler calls telegramService.sendBriefing(summary, chatId)
// 4. This service formats and sends the message via Telegram Bot API
// 5. Returns DeliveryResult with success/failure details
//
// ── ENVIRONMENT VARIABLES REQUIRED ──────────────────────────
//   TELEGRAM_BOT_TOKEN  — Bot token from @BotFather
//   TELEGRAM_CHAT_ID    — Target chat or channel ID
//
// ── MESSAGE FORMAT ───────────────────────────────────────────
//   The message will be sent as plain text (no HTML/Markdown)
//   to avoid formatting issues with Thai characters.
//   Max length: 4096 chars per Telegram message.
//   Long briefings should be split into multiple messages.
//
// ── FUTURE IMPLEMENTATION NOTES ─────────────────────────────
//   - Use the `node-telegram-bot-api` or raw fetch to Bot API
//   - Endpoint: POST https://api.telegram.org/bot{TOKEN}/sendMessage
//   - Payload: { chat_id, text, parse_mode: "HTML" }
//   - Split messages exceeding 4096 chars at sentence boundaries
//   - Add retry logic for Telegram rate limiting (429 errors)
//   - Consider inline keyboard buttons for "Read more" links
// ============================================================

export interface DeliveryResult {
  success: boolean;
  messageId?: number;
  error?: string;
  sentAt?: string;
}

export interface TelegramDeliveryOptions {
  chatId: string;
  briefingText: string;
  topicLabel: string;
}

/**
 * TelegramService interface.
 * Defines the contract for Telegram delivery without implementation.
 * Implement this class when Telegram delivery is activated.
 */
export interface ITelegramService {
  /**
   * Send a briefing to a Telegram chat.
   * @param options - Chat ID, briefing text, and topic label
   * @returns DeliveryResult with success status and message ID
   */
  sendBriefing(options: TelegramDeliveryOptions): Promise<DeliveryResult>;

  /**
   * Verify that the bot token is valid and the chat is reachable.
   * @returns true if the bot can post to the configured chat
   */
  verifyConnection(): Promise<boolean>;
}

/**
 * Stub implementation — returns a not-implemented error.
 * Replace this class body when Telegram delivery is activated.
 *
 * How to activate:
 *   1. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Replit Secrets
 *   2. Replace this stub with a real implementation using the Bot API
 *   3. Register the route: POST /api/delivery/telegram in routes/index.ts
 *   4. Call this.sendBriefing() from the route handler
 */
export class TelegramService implements ITelegramService {
  private readonly botToken: string | undefined;
  private readonly defaultChatId: string | undefined;

  constructor(botToken?: string, defaultChatId?: string) {
    this.botToken = botToken;
    this.defaultChatId = defaultChatId;
  }

  async sendBriefing(options: TelegramDeliveryOptions): Promise<DeliveryResult> {
    return {
      success: false,
      error: "Telegram delivery is not yet implemented. See telegramService.ts for integration notes.",
    };
  }

  async verifyConnection(): Promise<boolean> {
    return false;
  }
}

/**
 * Singleton factory — call this to get the Telegram service instance.
 * Reads credentials from the imported config.
 *
 * Usage (future route handler):
 *   import { createTelegramService } from "../services/delivery/telegramService.js";
 *   const telegram = createTelegramService();
 *   const result = await telegram.sendBriefing({ chatId, briefingText, topicLabel });
 */
export function createTelegramService(
  botToken?: string,
  defaultChatId?: string,
): ITelegramService {
  return new TelegramService(botToken, defaultChatId);
}

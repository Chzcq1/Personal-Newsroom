// ============================================================
// TELEGRAM DELIVERY
//
// Implements IDeliveryChannel for Telegram using the Bot API.
// Uses raw fetch — no third-party Telegram libraries.
//
// Telegram Bot API endpoint: https://api.telegram.org/bot{TOKEN}/
// Auth: Bot token from @BotFather
// Parse mode: HTML (supports <b>, <i>, <a> for Thai text)
//
// Message limit: 4096 chars per sendMessage call.
// Long briefings are pre-split by briefingFormatter.ts.
// ============================================================

import { logger } from "../../lib/logger.js";

const TELEGRAM_API_BASE = "https://api.telegram.org";
const SEND_DELAY_MS = 500; // delay between messages to respect rate limits

// ── Channel interface ────────────────────────────────────────
//
// All delivery channels implement this interface.
// Add Line, Discord, Email by creating new classes that implement it.

export interface ChannelDeliveryResult {
  success: boolean;
  messageIds: number[];
  error?: string;
  sentAt: string;
}

export interface IDeliveryChannel {
  readonly name: string;
  /** Verify credentials and reachability without sending a message. */
  verify(): Promise<boolean>;
  /** Send one or more pre-split message strings. */
  send(messages: string[]): Promise<ChannelDeliveryResult>;
}

// ── Telegram implementation ──────────────────────────────────

interface TelegramApiResponse {
  ok: boolean;
  result?: { message_id: number };
  description?: string;
}

async function telegramRequest(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramApiResponse> {
  const url = `${TELEGRAM_API_BASE}/bot${botToken}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<TelegramApiResponse>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class TelegramDelivery implements IDeliveryChannel {
  readonly name = "telegram";
  private readonly botToken: string;
  private readonly chatId: string;

  constructor(botToken: string, chatId: string) {
    this.botToken = botToken;
    this.chatId = chatId;
  }

  async verify(): Promise<boolean> {
    try {
      const res = await telegramRequest(this.botToken, "getChat", {
        chat_id: this.chatId,
      });
      return res.ok;
    } catch (err) {
      logger.warn({ err: String(err) }, "Telegram verify failed");
      return false;
    }
  }

  async send(messages: string[]): Promise<ChannelDeliveryResult> {
    const messageIds: number[] = [];
    const sentAt = new Date().toISOString();

    for (let i = 0; i < messages.length; i++) {
      try {
        const res = await telegramRequest(this.botToken, "sendMessage", {
          chat_id: this.chatId,
          text: messages[i],
          parse_mode: "HTML",
          disable_web_page_preview: true,
        });

        if (!res.ok) {
          logger.error(
            { chatId: this.chatId, messageIndex: i, error: res.description },
            "Telegram sendMessage failed",
          );
          return {
            success: false,
            messageIds,
            error: res.description ?? "Unknown Telegram API error",
            sentAt,
          };
        }

        if (res.result?.message_id) {
          messageIds.push(res.result.message_id);
        }

        // Respect rate limits between messages
        if (i < messages.length - 1) {
          await sleep(SEND_DELAY_MS);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error({ err: errMsg, messageIndex: i }, "Telegram send exception");
        return { success: false, messageIds, error: errMsg, sentAt };
      }
    }

    logger.info(
      { chatId: this.chatId, messageCount: messages.length, messageIds },
      "Telegram delivery successful",
    );

    return { success: true, messageIds, sentAt };
  }
}

/**
 * Factory: create a TelegramDelivery channel from credentials.
 * Returns null if either credential is missing.
 */
export function createTelegramDelivery(
  botToken: string | undefined,
  chatId: string | undefined,
): TelegramDelivery | null {
  if (!botToken || !chatId) return null;
  return new TelegramDelivery(botToken, chatId);
}

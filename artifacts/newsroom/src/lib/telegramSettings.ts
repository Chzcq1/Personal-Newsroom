// ============================================================
// TELEGRAM SETTINGS — localStorage persistence
//
// Stores Telegram bot token and chat ID locally.
// Interface designed for DB migration: replace localStorage
// calls with API calls to GET/PUT /api/telegram/settings.
//
// DB migration path (after login activation):
//   get()  → GET /api/telegram/settings
//   save() → PUT /api/telegram/settings
//   clear() → DELETE /api/telegram/settings
// ============================================================

const STORAGE_KEY = "ai-newsroom:telegram-settings";

export interface TelegramSettings {
  botToken: string;
  chatId: string;
  savedAt: string;
}

export function getTelegramSettings(): TelegramSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TelegramSettings;
  } catch {
    return null;
  }
}

export function saveTelegramSettings(botToken: string, chatId: string): void {
  const settings: TelegramSettings = {
    botToken: botToken.trim(),
    chatId: chatId.trim(),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearTelegramSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasTelegramSettings(): boolean {
  const s = getTelegramSettings();
  return !!s?.botToken && !!s?.chatId;
}

// ============================================================
// CENTRALIZED ENVIRONMENT CONFIGURATION
//
// ALL services must import config values from this file.
// NEVER call process.env directly in any other file.
//
// This is a HIGH-RISK file — changes affect every service.
// Review dependencies before modifying.
// ============================================================

export type SupportedAIProvider = "github" | "openai" | "gemini";

const SUPPORTED_PROVIDERS: SupportedAIProvider[] = ["github", "openai", "gemini"];

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Required environment variable "${key}" is not set. Check your .env or Replit Secrets.`,
    );
  }
  return value;
}

function optionalEnv(key: string): string | undefined {
  return process.env[key] || undefined;
}

function resolveAIProvider(): SupportedAIProvider {
  const raw = optionalEnv("AI_PROVIDER") ?? "github";
  if (!SUPPORTED_PROVIDERS.includes(raw as SupportedAIProvider)) {
    throw new Error(
      `Invalid AI_PROVIDER value: "${raw}". Supported values: ${SUPPORTED_PROVIDERS.join(", ")}`,
    );
  }
  return raw as SupportedAIProvider;
}

export const config = {
  // ── Server ────────────────────────────────────────────────
  port: requireEnv("PORT"),

  // ── AI Provider ──────────────────────────────────────────
  aiProvider: resolveAIProvider(),

  // ── Provider Credentials ─────────────────────────────────
  github: {
    token: optionalEnv("GITHUB_TOKEN"),
  },
  openai: {
    apiKey: optionalEnv("OPENAI_API_KEY"),
  },
  gemini: {
    apiKey: optionalEnv("GEMINI_API_KEY"),
  },

  // ── News Collection ──────────────────────────────────────
  newsApi: {
    key: optionalEnv("NEWSAPI_KEY"),
  },

  // ── Telegram Delivery ────────────────────────────────────
  // Used by the scheduler for automated morning/evening briefings.
  // The UI settings page stores credentials locally and sends them
  // in API request bodies — env vars are only needed for the scheduler.
  telegram: {
    botToken: optionalEnv("TELEGRAM_BOT_TOKEN"),
    chatId: optionalEnv("TELEGRAM_CHAT_ID"),
  },

  // ── Delivery Scheduler ───────────────────────────────────
  // Timezone for morning (07:00) and evening (18:00) scheduled delivery.
  // Uses IANA timezone names: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  // Default: Asia/Bangkok (UTC+7)
  schedulerTimezone: optionalEnv("SCHEDULER_TIMEZONE") ?? "Asia/Bangkok",

  // ── Database ─────────────────────────────────────────────
  database: {
    url: optionalEnv("DATABASE_URL"),
  },
} as const;

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
  // Controls which AI backend is used for Thai summarization.
  // To switch providers, change the AI_PROVIDER environment variable.
  //   'github'  → GitHub Models API (default, free with GitHub account)
  //   'openai'  → OpenAI API (requires OPENAI_API_KEY)
  //   'gemini'  → Google Gemini API (requires GEMINI_API_KEY)
  aiProvider: resolveAIProvider(),

  // ── Provider Credentials ─────────────────────────────────
  // Only the key matching the active AI_PROVIDER is required at runtime.
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

  // ── Delivery ─────────────────────────────────────────────
  telegram: {
    botToken: optionalEnv("TELEGRAM_BOT_TOKEN"),
    chatId: optionalEnv("TELEGRAM_CHAT_ID"),
  },

  // ── Database ─────────────────────────────────────────────
  database: {
    url: optionalEnv("DATABASE_URL"),
  },
} as const;

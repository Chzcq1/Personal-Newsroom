// ============================================================
// AI PROVIDER INTERFACE — Unified abstraction for all LLMs
//
// This file is the SINGLE integration point for AI capabilities.
// summaryService.ts calls ONLY this file — never a provider directly.
//
// ── HOW PROVIDER SWITCHING WORKS ─────────────────────────
// Set the AI_PROVIDER environment variable to one of:
//   'github'  → GitHub Models API (default)
//   'openai'  → OpenAI API
//   'gemini'  → Google Gemini API
// The factory function below reads that value and returns
// the correct provider instance. No other code needs to change.
//
// ── HOW TO ADD A NEW PROVIDER ────────────────────────────
//   1. Create: services/ai/<name>Provider.ts
//   2. Implement the AIProvider interface below
//   3. Add the provider name to SupportedAIProvider in config/env.ts
//   4. Register it in the createAIProvider() factory below
//   5. Add required env vars to config/env.ts
// ============================================================

import type { SupportedAIProvider } from "../../config/env.js";

// ── Shared Data Types ──────────────────────────────────────

export interface Article {
  title: string;
  description?: string;
  url: string;
  pubDate?: string;
}

// ── Provider Interface ─────────────────────────────────────
// Every provider MUST implement this interface.

export interface AIProvider {
  readonly providerName: string;
  summarize(articles: Article[], topic: string): Promise<string>;
}

// ── Provider Factory ───────────────────────────────────────
// REGISTER NEW PROVIDERS HERE.
// This is the only place where provider classes are imported.

export async function createAIProvider(
  providerName: SupportedAIProvider,
  credentials: {
    github?: { token?: string };
    openai?: { apiKey?: string };
    gemini?: { apiKey?: string };
  },
): Promise<AIProvider> {
  switch (providerName) {
    case "github": {
      const token = credentials.github?.token;
      if (!token) {
        throw new Error(
          'AI_PROVIDER is set to "github" but GITHUB_TOKEN is not set.',
        );
      }
      const { GithubProvider } = await import("./githubProvider.js");
      return new GithubProvider(token);
    }

    case "openai": {
      const apiKey = credentials.openai?.apiKey;
      if (!apiKey) {
        throw new Error(
          'AI_PROVIDER is set to "openai" but OPENAI_API_KEY is not set.',
        );
      }
      const { OpenAIProvider } = await import("./openaiProvider.js");
      return new OpenAIProvider(apiKey);
    }

    case "gemini": {
      const apiKey = credentials.gemini?.apiKey;
      if (!apiKey) {
        throw new Error(
          'AI_PROVIDER is set to "gemini" but GEMINI_API_KEY is not set.',
        );
      }
      const { GeminiProvider } = await import("./geminiProvider.js");
      return new GeminiProvider(apiKey);
    }

    default: {
      const _exhaustive: never = providerName;
      throw new Error(`Unknown AI provider: ${_exhaustive}`);
    }
  }
}

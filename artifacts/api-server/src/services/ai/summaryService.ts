// ============================================================
// SUMMARY SERVICE — The ONLY entry point for AI summarization
//
// This service is the boundary between business logic and AI.
// It NEVER imports a provider directly.
// It ONLY calls createAIProvider() from aiProvider.ts.
//
// ── HOW TO CHANGE THE AI PROVIDER ────────────────────────
// Change the AI_PROVIDER environment variable:
//   AI_PROVIDER=github   → GitHub Models (default)
//   AI_PROVIDER=openai   → OpenAI
//   AI_PROVIDER=gemini   → Google Gemini
// No code changes required.
//
// ── DEPENDENCY FLOW ──────────────────────────────────────
// summaryService.ts
//   → aiProvider.ts (createAIProvider factory)
//     → githubProvider.ts  (if AI_PROVIDER=github)
//     → openaiProvider.ts  (if AI_PROVIDER=openai)
//     → geminiProvider.ts  (if AI_PROVIDER=gemini)
// ============================================================

import { config } from "../../config/env.js";
import { createAIProvider, type Article } from "./aiProvider.js";
import { logger } from "../../lib/logger.js";

// Provider is initialized once at module load time.
// The active provider is determined by AI_PROVIDER env var.
let providerPromise: ReturnType<typeof createAIProvider> | null = null;

function getProvider() {
  if (!providerPromise) {
    providerPromise = createAIProvider(config.aiProvider, {
      github: config.github,
      openai: config.openai,
      gemini: config.gemini,
    });
    providerPromise.then((p) => {
      logger.info({ provider: p.providerName }, "AI provider initialized");
    });
  }
  return providerPromise;
}

/**
 * Summarize a list of news articles for a given topic in Thai.
 * This is the only function news routes should ever call for AI.
 *
 * @param articles - Array of articles from news collection services
 * @param topic    - The topic label (used to guide the summary prompt)
 * @returns        Thai-language summary string
 */
export async function summarizeArticles(
  articles: Article[],
  topic: string,
): Promise<string> {
  if (articles.length === 0) {
    return `ไม่พบบทความที่เกี่ยวข้องกับหัวข้อ "${topic}" ในขณะนี้ กรุณาลองใหม่อีกครั้ง`;
  }

  const provider = await getProvider();
  logger.info(
    { provider: provider.providerName, topic, articleCount: articles.length },
    "Summarizing articles",
  );

  return provider.summarize(articles, topic);
}

export type { Article };

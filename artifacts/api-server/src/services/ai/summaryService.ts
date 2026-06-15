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
// ── RETRY POLICY ─────────────────────────────────────────
// AI calls are retried ONCE on failure (network issues, transient
// rate limits). Auth errors (401) are NOT retried.
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
import {
  buildMorningBriefingPrompt,
  buildEveningBriefingPrompt,
} from "./promptBuilder.js";
import { logger } from "../../lib/logger.js";
import type { BriefingType } from "../delivery/deliveryEngine.js";

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

// ── Retry helper ─────────────────────────────────────────────
// Retries a function once after 2 seconds.
// Auth errors are not retried (they will fail again immediately).

function isAuthError(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return msg.includes("401") || msg.includes("unauthorized") || msg.includes("authentication");
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T> {
  try {
    return await fn();
  } catch (firstErr) {
    if (isAuthError(firstErr)) {
      throw firstErr; // don't retry auth failures
    }
    logger.warn({ err: String(firstErr), label }, "AI call failed — retrying once in 2s");
    await new Promise((r) => setTimeout(r, 2000));
    return fn(); // second attempt — let any error propagate
  }
}

// ── Public API ───────────────────────────────────────────────

/**
 * Summarize a list of news articles for a given topic in Thai.
 * This is the only function news routes should ever call for standard briefings.
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

  return withRetry(() => provider.summarize(articles, topic), `summarize:${topic}`);
}

/**
 * Generate a morning or evening delivery briefing in Thai.
 * Uses cross-topic prompts (different from standard topic briefings).
 * Called exclusively by deliveryEngine.ts.
 */
export async function summarizeDelivery(
  articles: Article[],
  type: BriefingType,
  topicLabels: string[],
): Promise<string> {
  if (articles.length === 0) {
    throw new Error("No articles provided for delivery briefing");
  }

  const provider = await getProvider();
  const { systemPrompt, userPrompt } =
    type === "morning"
      ? buildMorningBriefingPrompt(articles, topicLabels)
      : buildEveningBriefingPrompt(articles, topicLabels);

  logger.info(
    { provider: provider.providerName, type, articleCount: articles.length, topicLabels },
    "Generating delivery briefing",
  );

  return withRetry(
    () => provider.complete(systemPrompt, userPrompt),
    `delivery:${type}`,
  );
}

export type { Article };

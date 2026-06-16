// ============================================================
// DELIVERY ENGINE
//
// Orchestrates the full pipeline:
//   Collect articles → Summarize → Format → Deliver
//
// Supports morning and evening briefing types.
// Channel-agnostic: any IDeliveryChannel implementation works.
//
// Sprint 6 additions (Task H):
//   After successful briefing generation, records the briefing
//   in digestMemory so future briefings can reference what was
//   already covered ("what changed since morning").
//
// Future channels:  LINE  Discord  Email
// ============================================================

import { collectArticlesForTopic } from "../news/newsCollectorService.js";
import { summarizeDelivery } from "../ai/summaryService.js";
import {
  formatMorningBriefingForTelegram,
  formatEveningBriefingForTelegram,
} from "./briefingFormatter.js";
import {
  recordDigest,
  formatDigestContextForAI,
} from "./digestMemory.js";
import { TOPICS } from "../../config/topics.js";
import { logger } from "../../lib/logger.js";
import type { IDeliveryChannel, ChannelDeliveryResult } from "./telegramDelivery.js";

export type BriefingType = "morning" | "evening";

export interface DeliveryEngineResult {
  success: boolean;
  type: BriefingType;
  rawText: string;
  formattedMessages: string[];
  generatedAt: string;
  generationTimeMs: number;
  articleCount: number;
  topicsUsed: string[];
  channelResult?: ChannelDeliveryResult;
  error?: string;
}

// Maximum articles drawn from each topic for cross-topic briefings.
// Lower than the per-topic limit so the combined prompt stays manageable.
const ARTICLES_PER_TOPIC = 3;
const MAX_TOTAL_ARTICLES = 12;

/**
 * Collect articles from a list of topics in parallel, merge, and return
 * the top articles by recency (pubDate desc).
 */
async function collectCrossTopicArticles(
  topicIds: string[],
): Promise<{ articles: Awaited<ReturnType<typeof collectArticlesForTopic>>["articles"]; topicsUsed: string[] }> {
  const topicsUsed: string[] = [];

  const results = await Promise.allSettled(
    topicIds.map((id) => collectArticlesForTopic(id)),
  );

  const combined: Awaited<ReturnType<typeof collectArticlesForTopic>>["articles"] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value.articles.length > 0) {
      combined.push(...r.value.articles.slice(0, ARTICLES_PER_TOPIC));
      topicsUsed.push(topicIds[i]);
    } else if (r.status === "rejected") {
      logger.warn({ topicId: topicIds[i], err: String(r.reason) }, "Topic collection failed for delivery");
    }
  }

  // Sort by pubDate desc, take top MAX_TOTAL_ARTICLES
  combined.sort((a, b) => {
    const aMs = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const bMs = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return bMs - aMs;
  });

  return { articles: combined.slice(0, MAX_TOTAL_ARTICLES), topicsUsed };
}

/**
 * Generate a morning or evening briefing (no delivery).
 * Returns raw AI text + Telegram-formatted message chunks.
 *
 * Sprint 6: Injects digest context from digestMemory (Task H)
 * and records the result back to digestMemory for future use.
 */
export async function generateBriefing(
  type: BriefingType,
  topicIds?: string[],
): Promise<DeliveryEngineResult> {
  const startMs = Date.now();
  const resolvedTopicIds = topicIds && topicIds.length > 0
    ? topicIds
    : TOPICS.map((t) => t.id);

  const topicLabels = resolvedTopicIds
    .map((id) => TOPICS.find((t) => t.id === id)?.labelTh ?? id);

  logger.info({ type, topicIds: resolvedTopicIds }, "Generating delivery briefing");

  let articles: Awaited<ReturnType<typeof collectArticlesForTopic>>["articles"];
  let topicsUsed: string[];

  try {
    ({ articles, topicsUsed } = await collectCrossTopicArticles(resolvedTopicIds));
  } catch (err) {
    return {
      success: false,
      type,
      rawText: "",
      formattedMessages: [],
      generatedAt: new Date().toISOString(),
      generationTimeMs: Date.now() - startMs,
      articleCount: 0,
      topicsUsed: [],
      error: `Article collection failed: ${String(err)}`,
    };
  }

  if (articles.length === 0) {
    return {
      success: false,
      type,
      rawText: "",
      formattedMessages: [],
      generatedAt: new Date().toISOString(),
      generationTimeMs: Date.now() - startMs,
      articleCount: 0,
      topicsUsed,
      error: "No articles collected from any topic",
    };
  }

  // Task H — inject digest context for story continuity
  const digestContext = formatDigestContextForAI(type) ?? undefined;

  let rawText: string;
  const generatedAt = new Date().toISOString();

  try {
    rawText = await summarizeDelivery(articles, type, topicLabels, digestContext);
  } catch (err) {
    return {
      success: false,
      type,
      rawText: "",
      formattedMessages: [],
      generatedAt,
      generationTimeMs: Date.now() - startMs,
      articleCount: articles.length,
      topicsUsed,
      error: `AI summarization failed: ${String(err)}`,
    };
  }

  const formattedMessages =
    type === "morning"
      ? formatMorningBriefingForTelegram(rawText, generatedAt, articles.length)
      : formatEveningBriefingForTelegram(rawText, generatedAt, articles.length);

  // Task H — record this briefing in digest memory for future context
  recordDigest(type, rawText, topicsUsed, articles.length);

  logger.info(
    {
      type,
      articleCount: articles.length,
      topicsUsed,
      messageCount: formattedMessages.length,
      generationTimeMs: Date.now() - startMs,
      usedDigestContext: !!digestContext,
    },
    "Delivery briefing generated",
  );

  return {
    success: true,
    type,
    rawText,
    formattedMessages,
    generatedAt,
    generationTimeMs: Date.now() - startMs,
    articleCount: articles.length,
    topicsUsed,
  };
}

/**
 * Generate AND deliver a briefing through a delivery channel.
 */
export async function generateAndDeliver(
  type: BriefingType,
  channel: IDeliveryChannel,
  topicIds?: string[],
): Promise<DeliveryEngineResult> {
  const result = await generateBriefing(type, topicIds);

  if (!result.success) return result;

  const channelResult = await channel.send(result.formattedMessages);

  return { ...result, success: channelResult.success, channelResult };
}

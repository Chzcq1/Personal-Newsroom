// ============================================================
// DELIVERY ENGINE — Sprint 8 update
//
// Pipeline: Collect → Signal Filter → Compress → Evolve → Summarize → Format → Deliver
//
// Sprint 8 additions:
//   Task B — Digest compression: filter low-signal articles before AI
//   Task C — Story evolution: inject continuity context into prompts
//   Task D — Alert check: runs after collection, results logged
//   Task H — Signal scoring: articles ranked by importance
//   Task I — Delivery metrics: every attempt recorded
//
// Channel-agnostic: any IDeliveryChannel implementation works.
// Future channels: LINE, Discord, Email
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
import { rankBySignal, filterLowSignal } from "../intelligence/signalScoring.js";
import { recordStoryMentions, formatStoryContextForAI } from "../intelligence/storyEvolution.js";
import { checkForAlerts } from "./alertEngine.js";
import { recordDelivery, analyzeDeliveryText } from "../analytics/deliveryMetrics.js";
import { TOPICS } from "../../config/topics.js";
import { logger } from "../../lib/logger.js";
import type { IDeliveryChannel, ChannelDeliveryResult } from "./telegramDelivery.js";
import type { RssArticle } from "../news/rssService.js";

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
  alerts?: import("./alertEngine.js").PriorityAlert[];
  error?: string;
}

// ── Configuration ────────────────────────────────────────────

const ARTICLES_PER_TOPIC = 3;
const MAX_TOTAL_ARTICLES = 12;

// Sprint 8 Task B — Digest compression targets
// Morning: 2–4 minutes reading → ~400–700 Thai words
// Evening: 3–5 minutes reading → ~600–900 Thai words
// We enforce this at the article selection stage: higher signal only.
const MIN_ARTICLES_AFTER_COMPRESSION = 4;

// ── Collection ───────────────────────────────────────────────

async function collectCrossTopicArticles(
  topicIds: string[],
): Promise<{ articles: RssArticle[]; topicsUsed: string[] }> {
  const topicsUsed: string[] = [];

  const results = await Promise.allSettled(
    topicIds.map((id) => collectArticlesForTopic(id)),
  );

  const combined: RssArticle[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value.articles.length > 0) {
      combined.push(...r.value.articles.slice(0, ARTICLES_PER_TOPIC));
      topicsUsed.push(topicIds[i]);
    } else if (r.status === "rejected") {
      logger.warn({ topicId: topicIds[i], err: String(r.reason) }, "Topic collection failed for delivery");
    }
  }

  return { articles: combined, topicsUsed };
}

// ── Digest compression (Task B) ──────────────────────────────
// Rank all articles by signal score and take highest-impact ones.
// Merges duplicate narratives by deduplicating very similar titles.

function compressDigest(
  articles: RssArticle[],
  maxArticles: number,
): RssArticle[] {
  // Rank by signal score
  const ranked = rankBySignal(articles);

  // Deduplicate by title similarity (simple first-5-word key)
  const seenTitleKeys = new Set<string>();
  const deduped: typeof ranked = [];

  for (const article of ranked) {
    const key = article.title
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5)
      .join("-");

    if (!seenTitleKeys.has(key)) {
      seenTitleKeys.add(key);
      deduped.push(article);
    }
  }

  // Filter low signal, keeping minimum
  const highSignal = filterLowSignal(deduped, MIN_ARTICLES_AFTER_COMPRESSION);

  return highSignal.slice(0, maxArticles);
}

// ── Briefing generation ──────────────────────────────────────

export async function generateBriefing(
  type: BriefingType,
  topicIds?: string[],
  watchlist: string[] = [],
): Promise<DeliveryEngineResult> {
  const startMs = Date.now();
  const resolvedTopicIds = topicIds && topicIds.length > 0
    ? topicIds
    : TOPICS.map((t) => t.id);

  const topicLabels = resolvedTopicIds
    .map((id) => TOPICS.find((t) => t.id === id)?.labelTh ?? id);

  logger.info({ type, topicIds: resolvedTopicIds }, "Generating delivery briefing");

  let rawArticles: RssArticle[];
  let topicsUsed: string[];

  try {
    ({ articles: rawArticles, topicsUsed } = await collectCrossTopicArticles(resolvedTopicIds));
  } catch (err) {
    const result: DeliveryEngineResult = {
      success: false, type, rawText: "", formattedMessages: [],
      generatedAt: new Date().toISOString(),
      generationTimeMs: Date.now() - startMs,
      articleCount: 0, topicsUsed: [],
      error: `Article collection failed: ${String(err)}`,
    };
    recordDelivery({ type, success: false, wordCount: 0, estimatedReadingTimeSecs: 0, articlesIncluded: 0, topicsUsed: [], deliveryChannel: "none", error: result.error, generationTimeMs: result.generationTimeMs, signalHighCount: 0, signalLowCount: 0 });
    return result;
  }

  if (rawArticles.length === 0) {
    const result: DeliveryEngineResult = {
      success: false, type, rawText: "", formattedMessages: [],
      generatedAt: new Date().toISOString(),
      generationTimeMs: Date.now() - startMs,
      articleCount: 0, topicsUsed,
      error: "No articles collected from any topic",
    };
    recordDelivery({ type, success: false, wordCount: 0, estimatedReadingTimeSecs: 0, articlesIncluded: 0, topicsUsed, deliveryChannel: "none", error: result.error, generationTimeMs: result.generationTimeMs, signalHighCount: 0, signalLowCount: 0 });
    return result;
  }

  // Task D — Check for priority alerts from raw articles
  const alerts = checkForAlerts(rawArticles, watchlist);
  if (alerts.length > 0) {
    logger.info({ alertCount: alerts.length }, "Priority alerts detected during delivery");
  }

  // Task C — Record story mentions for evolution tracking
  for (const topicId of topicsUsed) {
    const topicArticles = rawArticles.filter((a) =>
      topicId === (a as RssArticle & { topicId?: string }).topicId
    );
    recordStoryMentions(topicArticles.length > 0 ? topicArticles : rawArticles.slice(0, 3), topicId, type);
  }

  // Task B — Compress digest: rank by signal, deduplicate, filter low-signal
  const articles = compressDigest(rawArticles, MAX_TOTAL_ARTICLES);

  // Signal stats for metrics
  const rankedForStats = rankBySignal(rawArticles);
  const signalHighCount = rankedForStats.filter((a) => a.signalScore.isHighSignal).length;
  const signalLowCount = rankedForStats.filter((a) => a.signalScore.isLowSignal).length;

  logger.info({
    rawArticleCount: rawArticles.length,
    compressedCount: articles.length,
    signalHighCount,
    signalLowCount,
  }, "Digest compressed");

  // Task H (digest memory) — inject previous digest context
  const digestContext = formatDigestContextForAI(type) ?? undefined;

  // Task C — Story evolution context
  const storyContext = resolvedTopicIds
    .map((id) => formatStoryContextForAI(id))
    .filter(Boolean)
    .join("\n\n") || undefined;

  const generatedAt = new Date().toISOString();

  let rawText: string;
  try {
    rawText = await summarizeDelivery(
      articles as unknown as Parameters<typeof summarizeDelivery>[0],
      type,
      topicLabels,
      digestContext,
      storyContext,
    );
  } catch (err) {
    const result: DeliveryEngineResult = {
      success: false, type, rawText: "", formattedMessages: [],
      generatedAt, generationTimeMs: Date.now() - startMs,
      articleCount: articles.length, topicsUsed,
      error: `AI summarization failed: ${String(err)}`,
    };
    recordDelivery({ type, success: false, wordCount: 0, estimatedReadingTimeSecs: 0, articlesIncluded: articles.length, topicsUsed, deliveryChannel: "none", error: result.error, generationTimeMs: result.generationTimeMs, signalHighCount, signalLowCount });
    return result;
  }

  const formattedMessages =
    type === "morning"
      ? formatMorningBriefingForTelegram(rawText, generatedAt, articles.length)
      : formatEveningBriefingForTelegram(rawText, generatedAt, articles.length);

  // Record in digest memory for future continuity
  recordDigest(type, rawText, topicsUsed, articles.length);

  const generationTimeMs = Date.now() - startMs;
  const { wordCount, estimatedReadingTimeSecs } = analyzeDeliveryText(rawText);

  // Task I — Record delivery metrics
  recordDelivery({
    type,
    success: true,
    wordCount,
    estimatedReadingTimeSecs,
    articlesIncluded: articles.length,
    topicsUsed,
    deliveryChannel: "pending",
    generationTimeMs,
    signalHighCount,
    signalLowCount,
  });

  logger.info({
    type, articleCount: articles.length, topicsUsed,
    messageCount: formattedMessages.length,
    generationTimeMs, wordCount,
    usedDigestContext: !!digestContext,
    usedStoryContext: !!storyContext,
    alertCount: alerts.length,
  }, "Delivery briefing generated");

  return {
    success: true, type, rawText, formattedMessages, generatedAt,
    generationTimeMs, articleCount: articles.length, topicsUsed,
    alerts: alerts.length > 0 ? alerts : undefined,
  };
}

export async function generateAndDeliver(
  type: BriefingType,
  channel: IDeliveryChannel,
  topicIds?: string[],
  watchlist: string[] = [],
): Promise<DeliveryEngineResult> {
  const result = await generateBriefing(type, topicIds, watchlist);
  if (!result.success) return result;

  const channelResult = await channel.send(result.formattedMessages);

  // Update metrics record with actual delivery channel name
  recordDelivery({
    type,
    success: channelResult.success,
    wordCount: analyzeDeliveryText(result.rawText).wordCount,
    estimatedReadingTimeSecs: analyzeDeliveryText(result.rawText).estimatedReadingTimeSecs,
    articlesIncluded: result.articleCount,
    topicsUsed: result.topicsUsed,
    deliveryChannel: channel.name,
    generationTimeMs: result.generationTimeMs,
    signalHighCount: 0,
    signalLowCount: 0,
    error: channelResult.success ? undefined : "Delivery channel failed",
  });

  return { ...result, success: channelResult.success, channelResult };
}

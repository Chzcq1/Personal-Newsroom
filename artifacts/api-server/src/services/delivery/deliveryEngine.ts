// ============================================================
// DELIVERY ENGINE — Sprint 12 update
//
// Pipeline: Collect → Reliability Filter → CompressionV2 → Token Economy
//           → Signal Filter → Story Evolve → Summarize → Format → Deliver
//
// Sprint 12 additions:
//   Task C — Article compression V2 (smarter sentence-level extraction)
//   Task E — Source reliability penalty applied to signal scores
//   Task F — Digest persistence before send; retry queue on failure
//   Task H — Token economy: narrative dedup + priority budget allocation
//   Task I — Token usage tracking for analytics
//
// Channel-agnostic: any IDeliveryChannel implementation works.
// ============================================================

import { collectArticlesForTopic } from "../news/newsCollectorService.js";
import { summarizeDelivery, summarizeExecutive } from "../ai/summaryService.js";
import {
  formatMorningBriefingV2,
  formatEveningBriefingV2,
  formatExecutiveBriefingV2,
  formatIntelligenceBriefingV2,
} from "./briefingFormatterV2.js";
import {
  recordDigest,
  formatDigestContextForAI,
} from "./digestMemory.js";
import { rankBySignal, filterLowSignal } from "../intelligence/signalScoring.js";
import { recordStoryMentions, formatStoryContextForAI } from "../intelligence/storyEvolution.js";
import { checkForAlerts } from "./alertEngine.js";
import { recordDelivery, analyzeDeliveryText } from "../analytics/deliveryMetrics.js";
import { compressArticleBatch } from "../news/articleCompressionV2.js";
import { deduplicateNarratives, allocatePriorityBudget, recordTokenUsage, DEFAULT_BUDGET, EXECUTIVE_BUDGET } from "../ai/tokenEconomy.js";
import { getSourcePenalty, recordFeedFetchResult, recordArticleQuality } from "../news/sourceReliability.js";
import {
  persistDigestBeforeSend,
  markDigestDelivered,
  markDigestFailed,
  enqueueRetry,
  recordHeartbeat,
} from "./deliveryRecovery.js";
import { TOPICS } from "../../config/topics.js";
import { logger } from "../../lib/logger.js";
import type { IDeliveryChannel, ChannelDeliveryResult } from "./telegramDelivery.js";
import type { RssArticle } from "../news/rssService.js";

export type BriefingType = "morning" | "evening";
export type FullBriefingType = BriefingType | "executive" | "intelligence";

export interface DeliveryEngineResult {
  success: boolean;
  type: FullBriefingType;
  rawText: string;
  formattedMessages: string[];
  generatedAt: string;
  generationTimeMs: number;
  articleCount: number;
  topicsUsed: string[];
  channelResult?: ChannelDeliveryResult;
  alerts?: import("./alertEngine.js").PriorityAlert[];
  compressionStats?: { inputChars: number; outputChars: number; reductionPercent: number };
  tokenStats?: { inputChars: number; articlesIncluded: number };
  error?: string;
}

// ── Configuration ────────────────────────────────────────────

const ARTICLES_PER_TOPIC = 3;
const MAX_TOTAL_ARTICLES = 12;
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
    const topicId = topicIds[i];
    if (r.status === "fulfilled" && r.value.articles.length > 0) {
      // Record feed fetch success per source
      const sources = new Map<string, number>();
      for (const a of r.value.articles) {
        const src = (a as RssArticle & { source?: string }).source ?? "unknown";
        sources.set(src, (sources.get(src) ?? 0) + 1);
      }
      for (const [src, count] of sources) {
        recordFeedFetchResult(src, true, count);
      }
      combined.push(...r.value.articles.slice(0, ARTICLES_PER_TOPIC));
      topicsUsed.push(topicId);
    } else if (r.status === "rejected") {
      logger.warn({ topicId, err: String(r.reason) }, "Topic collection failed for delivery");
    }
  }

  // Apply source reliability penalties
  for (const article of combined) {
    const src = (article as RssArticle & { source?: string }).source;
    const penalty = getSourcePenalty(src ?? "");
    if (penalty > 0 && article.signalScore) {
      article.signalScore.total = Math.max(0, (article.signalScore.total ?? 0) - penalty);
    }
    // Record article quality
    recordArticleQuality(src ?? "", article.description?.length ?? 0, false);
  }

  return { articles: combined, topicsUsed };
}

// ── Digest compression pipeline ───────────────────────────────

function compressDigest(
  articles: RssArticle[],
  maxArticles: number,
): RssArticle[] {
  // 1. Rank by signal score
  const ranked = rankBySignal(articles);

  // 2. Narrative deduplication (Task H — before AI)
  const deduped = deduplicateNarratives(ranked);

  // 3. Article compression V2 (Task C)
  const { articles: compressed } = compressArticleBatch(deduped, DEFAULT_BUDGET.maxTotalChars);

  // 4. Filter low signal, keeping minimum
  const highSignal = filterLowSignal(compressed as RssArticle[], MIN_ARTICLES_AFTER_COMPRESSION);

  // 5. Priority-first budget allocation (Task H)
  const { articles: budgeted } = allocatePriorityBudget(highSignal as RssArticle[], DEFAULT_BUDGET);

  return (budgeted as RssArticle[]).slice(0, maxArticles);
}

// ── Briefing generation ───────────────────────────────────────

export async function generateBriefing(
  type: BriefingType,
  topicIds?: string[],
  watchlist: string[] = [],
): Promise<DeliveryEngineResult> {
  recordHeartbeat();
  const startMs = Date.now();
  const resolvedTopicIds = topicIds?.length ? topicIds : TOPICS.map((t) => t.id);
  const topicLabels = resolvedTopicIds.map(
    (id) => TOPICS.find((t) => t.id === id)?.labelTh ?? id,
  );

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

  // Alert check
  const alerts = checkForAlerts(rawArticles, watchlist);
  if (alerts.length > 0) {
    logger.info({ alertCount: alerts.length }, "Priority alerts detected during delivery");
  }

  // Story evolution tracking
  for (const topicId of topicsUsed) {
    const topicArticles = rawArticles.filter((a) =>
      topicId === (a as RssArticle & { topicId?: string }).topicId
    );
    recordStoryMentions(topicArticles.length > 0 ? topicArticles : rawArticles.slice(0, 3), topicId, type);
  }

  // Capture input stats before compression
  const inputChars = rawArticles.reduce(
    (s, a) => s + (a.title?.length ?? 0) + (a.description?.length ?? 0),
    0,
  );

  // Compression pipeline (Tasks C + H)
  const articles = compressDigest(rawArticles, MAX_TOTAL_ARTICLES);

  const outputChars = articles.reduce(
    (s, a) => s + (a.title?.length ?? 0) + (a.description?.length ?? 0),
    0,
  );

  const compressionStats = {
    inputChars,
    outputChars,
    reductionPercent: inputChars > 0
      ? Math.round(((inputChars - outputChars) / inputChars) * 100)
      : 0,
  };

  const rankedForStats = rankBySignal(rawArticles);
  const signalHighCount = rankedForStats.filter((a) => a.signalScore.isHighSignal).length;
  const signalLowCount = rankedForStats.filter((a) => a.signalScore.isLowSignal).length;

  logger.info({
    rawArticleCount: rawArticles.length,
    compressedCount: articles.length,
    compressionReduction: compressionStats.reductionPercent,
    signalHighCount,
    signalLowCount,
  }, "Digest compressed (V2)");

  // Context injection
  const digestContext = formatDigestContextForAI(type) ?? undefined;
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

  // Token tracking (Task H/I)
  recordTokenUsage(type, outputChars, rawText.length, articles.length, inputChars);

  const formattedMessages =
    type === "morning"
      ? formatMorningBriefingV2(rawText, generatedAt, { sourceCount: articles.length })
      : formatEveningBriefingV2(rawText, generatedAt, { sourceCount: articles.length });

  recordDigest(type, rawText, topicsUsed, articles.length);

  const generationTimeMs = Date.now() - startMs;
  const { wordCount, estimatedReadingTimeSecs } = analyzeDeliveryText(rawText);

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
    compressionReduction: compressionStats.reductionPercent,
    alertCount: alerts.length,
  }, "Delivery briefing generated");

  return {
    success: true, type, rawText, formattedMessages, generatedAt,
    generationTimeMs, articleCount: articles.length, topicsUsed,
    alerts: alerts.length > 0 ? alerts : undefined,
    compressionStats,
    tokenStats: { inputChars: outputChars, articlesIncluded: articles.length },
  };
}

// ── Executive briefing generation ────────────────────────────

export async function generateExecutiveBriefing(
  topicIds?: string[],
): Promise<DeliveryEngineResult> {
  recordHeartbeat();
  const startMs = Date.now();
  const resolvedTopicIds = topicIds?.length ? topicIds : TOPICS.map((t) => t.id);
  const topicLabels = resolvedTopicIds.map(
    (id) => TOPICS.find((t) => t.id === id)?.labelTh ?? id,
  );

  let rawArticles: RssArticle[];
  let topicsUsed: string[];
  try {
    ({ articles: rawArticles, topicsUsed } = await collectCrossTopicArticles(resolvedTopicIds));
  } catch (err) {
    return { success: false, type: "executive", rawText: "", formattedMessages: [], generatedAt: new Date().toISOString(), generationTimeMs: Date.now() - startMs, articleCount: 0, topicsUsed: [], error: String(err) };
  }

  // Compressed pipeline using executive budget (tighter)
  const ranked = rankBySignal(rawArticles);
  const deduped = deduplicateNarratives(ranked);
  const { articles: compressed } = compressArticleBatch(deduped, EXECUTIVE_BUDGET.maxTotalChars);
  const { articles: budgeted } = allocatePriorityBudget(compressed as RssArticle[], EXECUTIVE_BUDGET);
  const articles = (budgeted as RssArticle[]).slice(0, EXECUTIVE_BUDGET.maxArticles);

  const generatedAt = new Date().toISOString();
  let rawText: string;
  try {
    rawText = await summarizeExecutive(
      articles as unknown as Parameters<typeof summarizeExecutive>[0],
      topicLabels,
    );
  } catch (err) {
    return { success: false, type: "executive", rawText: "", formattedMessages: [], generatedAt, generationTimeMs: Date.now() - startMs, articleCount: articles.length, topicsUsed, error: String(err) };
  }

  const formattedMessages = formatExecutiveBriefingV2(rawText, generatedAt, { sourceCount: articles.length });
  const generationTimeMs = Date.now() - startMs;
  const inputChars = articles.reduce((s, a) => s + (a.title?.length ?? 0) + (a.description?.length ?? 0), 0);
  recordTokenUsage("executive", inputChars, rawText.length, articles.length, rawArticles.reduce((s, a) => s + (a.description?.length ?? 0), 0));

  return { success: true, type: "executive", rawText, formattedMessages, generatedAt, generationTimeMs, articleCount: articles.length, topicsUsed };
}

// ── Intelligence briefing generation ────────────────────────

export async function generateIntelligenceBriefing(
  topicId: string,
): Promise<DeliveryEngineResult> {
  recordHeartbeat();
  const startMs = Date.now();
  const topic = TOPICS.find((t) => t.id === topicId);

  let rawArticles: RssArticle[];
  let topicsUsed: string[];
  try {
    ({ articles: rawArticles, topicsUsed } = await collectCrossTopicArticles([topicId]));
  } catch (err) {
    return { success: false, type: "intelligence", rawText: "", formattedMessages: [], generatedAt: new Date().toISOString(), generationTimeMs: Date.now() - startMs, articleCount: 0, topicsUsed: [], error: String(err) };
  }

  const ranked = rankBySignal(rawArticles);
  const deduped = deduplicateNarratives(ranked);
  const { articles: compressed } = compressArticleBatch(deduped);
  const articles = (compressed as RssArticle[]).slice(0, 8);

  const generatedAt = new Date().toISOString();
  let rawText: string;
  try {
    rawText = await summarizeDelivery(
      articles as unknown as Parameters<typeof summarizeDelivery>[0],
      "morning",
      [topic?.labelTh ?? topicId],
    );
  } catch (err) {
    return { success: false, type: "intelligence", rawText: "", formattedMessages: [], generatedAt, generationTimeMs: Date.now() - startMs, articleCount: articles.length, topicsUsed, error: String(err) };
  }

  const formattedMessages = formatIntelligenceBriefingV2(rawText, generatedAt, topic?.label ?? topicId, { sourceCount: articles.length });
  const generationTimeMs = Date.now() - startMs;

  return { success: true, type: "intelligence", rawText, formattedMessages, generatedAt, generationTimeMs, articleCount: articles.length, topicsUsed };
}

// ── Deliver with persistence + retry ─────────────────────────

export async function generateAndDeliver(
  type: BriefingType,
  channel: IDeliveryChannel,
  topicIds?: string[],
  watchlist: string[] = [],
): Promise<DeliveryEngineResult> {
  const result = await generateBriefing(type, topicIds, watchlist);
  if (!result.success) return result;

  // Persist before send (Task F)
  const persisted = persistDigestBeforeSend(
    type,
    result.rawText,
    result.formattedMessages,
    result.articleCount,
    result.topicsUsed,
  );

  const channelResult = await channel.send(result.formattedMessages);

  if (channelResult.success) {
    markDigestDelivered(persisted.id);
  } else {
    markDigestFailed(persisted.id, channelResult.error ?? "Unknown error");
    enqueueRetry(persisted.id, type, channelResult.error ?? "Unknown error");
  }

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

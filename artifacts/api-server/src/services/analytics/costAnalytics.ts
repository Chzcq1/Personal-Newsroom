// ============================================================
// COST ANALYTICS — Sprint 5 Task G
//
// Tracks AI usage, token estimates, cache hits/misses, and
// article collection metrics. Used by the /admin/costs dashboard.
//
// All storage is in-memory. Resets on server restart.
//
// Token pricing (approximate):
//   GitHub Models (gpt-4o-mini): $0.00015 / 1K input, $0.0006 / 1K output
//   OpenAI (gpt-4o):             $0.005   / 1K input, $0.015  / 1K output
//   Gemini (gemini-1.5-flash):   $0.00035 / 1K input, $0.00105/ 1K output
// ============================================================

import { logger } from "../../lib/logger.js";

// ── Pricing table ────────────────────────────────────────────

const PRICING: Record<
  string,
  { inputPer1K: number; outputPer1K: number; label: string }
> = {
  github: { inputPer1K: 0.00015, outputPer1K: 0.0006, label: "GitHub Models (gpt-4o-mini)" },
  openai: { inputPer1K: 0.005,   outputPer1K: 0.015,  label: "OpenAI (gpt-4o)" },
  gemini: { inputPer1K: 0.00035, outputPer1K: 0.00105,label: "Gemini (gemini-1.5-flash)" },
};

// ── Data model ───────────────────────────────────────────────

export interface RequestRecord {
  timestamp: string;
  topicId: string;
  cacheHit: boolean;
  inputTokensEstimate: number;
  outputTokensEstimate: number;
  generationTimeMs: number;
  articleCount: number;
  preprocessedArticles: number;
  provider: string;
  fallbackMode: boolean;
}

// ── In-memory storage ─────────────────────────────────────────

const records: RequestRecord[] = [];
const MAX_RECORDS = 1000; // rolling window

// ── Public API ────────────────────────────────────────────────

/**
 * Record a single summarization request.
 */
export function recordRequest(record: RequestRecord): void {
  records.push(record);
  if (records.length > MAX_RECORDS) records.shift();
  logger.debug({ topicId: record.topicId, cacheHit: record.cacheHit }, "Cost analytics recorded");
}

/**
 * Returns all tracked records (newest first).
 */
export function getRecords(): RequestRecord[] {
  return [...records].reverse();
}

/**
 * Compute aggregate stats for the admin dashboard.
 */
export function getCostStats(provider: string): {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRatePercent: number;
  totalArticlesCollected: number;
  totalInputTokensEstimate: number;
  totalOutputTokensEstimate: number;
  avgGenerationTimeMs: number;
  fallbackCount: number;
  estimatedTotalCostUSD: number;
  estimatedDailyCostUSD: number;
  estimatedMonthlyCostUSD: number;
  providerLabel: string;
  recentRequests: RequestRecord[];
} {
  const total = records.length;
  const cacheHits = records.filter((r) => r.cacheHit).length;
  const cacheMisses = total - cacheHits;
  const fallbackCount = records.filter((r) => r.fallbackMode).length;

  const totalInput = records.reduce((s, r) => s + r.inputTokensEstimate, 0);
  const totalOutput = records.reduce((s, r) => s + r.outputTokensEstimate, 0);
  const totalArticles = records.reduce((s, r) => s + r.articleCount, 0);

  const genTimes = records.filter((r) => !r.cacheHit && !r.fallbackMode).map((r) => r.generationTimeMs);
  const avgGenerationTimeMs =
    genTimes.length > 0 ? Math.round(genTimes.reduce((s, v) => s + v, 0) / genTimes.length) : 0;

  const pricing = PRICING[provider] ?? PRICING.github;
  const estimatedTotalCostUSD =
    (totalInput / 1000) * pricing.inputPer1K +
    (totalOutput / 1000) * pricing.outputPer1K;

  // Extrapolate daily/monthly based on records per day
  const now = Date.now();
  const oldestTs = records[0]?.timestamp
    ? new Date(records[0].timestamp).getTime()
    : now;
  const ageHours = Math.max(1, (now - oldestTs) / 3_600_000);
  const requestsPerHour = total / ageHours;
  const requestsPerDay = requestsPerHour * 24;
  const costPerRequest = total > 0 ? estimatedTotalCostUSD / total : 0;

  const estimatedDailyCostUSD = costPerRequest * requestsPerDay;
  const estimatedMonthlyCostUSD = estimatedDailyCostUSD * 30;

  return {
    totalRequests: total,
    cacheHits,
    cacheMisses,
    hitRatePercent: total === 0 ? 0 : Math.round((cacheHits / total) * 100),
    totalArticlesCollected: totalArticles,
    totalInputTokensEstimate: totalInput,
    totalOutputTokensEstimate: totalOutput,
    avgGenerationTimeMs,
    fallbackCount,
    estimatedTotalCostUSD: Math.round(estimatedTotalCostUSD * 100000) / 100000,
    estimatedDailyCostUSD: Math.round(estimatedDailyCostUSD * 10000) / 10000,
    estimatedMonthlyCostUSD: Math.round(estimatedMonthlyCostUSD * 100) / 100,
    providerLabel: pricing.label,
    recentRequests: getRecords().slice(0, 20),
  };
}

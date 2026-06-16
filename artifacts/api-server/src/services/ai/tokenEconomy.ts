// ============================================================
// TOKEN ECONOMY — Sprint 12 Task H
//
// Dynamic token budgeting system that allocates AI context
// based on article signal priority.
//
// Key behaviours:
//   - High-signal articles get larger description budgets
//   - Low-signal articles are compressed aggressively
//   - Narrative deduplication runs BEFORE AI call
//   - Adaptive limits based on current topic complexity
//   - Total budget enforced across the full batch
//
// Goal: high-value stories consume more resources,
//       low-value stories consume less.
// ============================================================

import { logger } from "../../lib/logger.js";

// ── Budget tiers ──────────────────────────────────────────────

export type SignalTier = "critical" | "high" | "medium" | "low";

const TIER_CHAR_BUDGET: Record<SignalTier, number> = {
  critical: 800,   // Full context for breaking news
  high: 600,       // Standard high-signal
  medium: 350,     // Compressed
  low: 150,        // Minimal — headline + key stat only
};

const TIER_INCLUSION_THRESHOLD: Record<SignalTier, boolean> = {
  critical: true,
  high: true,
  medium: true,
  low: false,      // Low-tier excluded unless we need volume
};

// ── Total budget configuration ────────────────────────────────

export interface TokenBudgetConfig {
  maxTotalChars: number;
  maxArticles: number;
  minArticles: number;
  narrativeDeduplication: boolean;
}

export const DEFAULT_BUDGET: TokenBudgetConfig = {
  maxTotalChars: 18_000,  // ~4500 tokens (down from 24000)
  maxArticles: 12,
  minArticles: 4,
  narrativeDeduplication: true,
};

export const EXECUTIVE_BUDGET: TokenBudgetConfig = {
  maxTotalChars: 8_000,   // Executive mode: compact input
  maxArticles: 6,
  minArticles: 3,
  narrativeDeduplication: true,
};

export const INTELLIGENCE_BUDGET: TokenBudgetConfig = {
  maxTotalChars: 22_000,  // Intelligence mode: full depth
  maxArticles: 15,
  minArticles: 5,
  narrativeDeduplication: true,
};

// ── Token cost tracking ───────────────────────────────────────

export interface TokenUsageRecord {
  id: string;
  briefingType: string;
  recordedAt: string;
  inputChars: number;
  outputChars: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUSD: number;
  articlesIncluded: number;
  compressionPercent: number;
}

const MAX_TOKEN_RECORDS = 100;
const tokenLog: TokenUsageRecord[] = [];

// Cost estimate: GitHub Models free tier — track for future billing
// OpenAI GPT-4o-mini: ~$0.00015/1k input, $0.0006/1k output
const COST_PER_INPUT_1K = 0.00015;
const COST_PER_OUTPUT_1K = 0.0006;

export function recordTokenUsage(
  briefingType: string,
  inputChars: number,
  outputChars: number,
  articlesIncluded: number,
  originalChars: number,
): void {
  const estimatedInputTokens = Math.ceil(inputChars / 4);
  const estimatedOutputTokens = Math.ceil(outputChars / 4);
  const estimatedCostUSD =
    (estimatedInputTokens / 1000) * COST_PER_INPUT_1K +
    (estimatedOutputTokens / 1000) * COST_PER_OUTPUT_1K;

  const compressionPercent = originalChars > 0
    ? Math.round(((originalChars - inputChars) / originalChars) * 100)
    : 0;

  const record: TokenUsageRecord = {
    id: `tok-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    briefingType,
    recordedAt: new Date().toISOString(),
    inputChars,
    outputChars,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCostUSD,
    articlesIncluded,
    compressionPercent,
  };

  tokenLog.push(record);
  if (tokenLog.length > MAX_TOKEN_RECORDS) {
    tokenLog.shift();
  }
}

export function getTokenStats() {
  const total = tokenLog.length;
  if (total === 0) {
    return {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalEstimatedCostUSD: 0,
      avgInputTokensPerRequest: 0,
      avgCompressionPercent: 0,
      last24hTokens: 0,
    };
  }

  const cutoff = Date.now() - 86_400_000;
  const recent = tokenLog.filter((r) => new Date(r.recordedAt).getTime() >= cutoff);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr: number[]) => arr.length > 0 ? Math.round(sum(arr) / arr.length) : 0;

  return {
    totalRequests: total,
    totalInputTokens: sum(tokenLog.map((r) => r.estimatedInputTokens)),
    totalOutputTokens: sum(tokenLog.map((r) => r.estimatedOutputTokens)),
    totalEstimatedCostUSD: Math.round(sum(tokenLog.map((r) => r.estimatedCostUSD)) * 10000) / 10000,
    avgInputTokensPerRequest: avg(tokenLog.map((r) => r.estimatedInputTokens)),
    avgCompressionPercent: avg(tokenLog.map((r) => r.compressionPercent)),
    last24hTokens: sum(recent.map((r) => r.estimatedInputTokens + r.estimatedOutputTokens)),
    recentRecords: tokenLog.slice(-10).reverse(),
  };
}

// ── Narrative deduplication ───────────────────────────────────

export interface ArticleLike {
  title?: string;
  description?: string;
  url?: string;
}

/**
 * Remove narrative duplicates before the AI call.
 * Uses a 4-word title key to identify same-story articles.
 * Keeps the article with the longest description (most informative).
 */
export function deduplicateNarratives<T extends ArticleLike>(articles: T[]): T[] {
  const clusters = new Map<string, T[]>();

  for (const article of articles) {
    const key = (article.title ?? "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 4)
      .join("-");

    if (!key) continue;

    if (!clusters.has(key)) {
      clusters.set(key, []);
    }
    clusters.get(key)!.push(article);
  }

  const deduped: T[] = [];
  for (const [, cluster] of clusters) {
    // Keep the most informative (longest description)
    const best = cluster.reduce((a, b) =>
      (a.description?.length ?? 0) >= (b.description?.length ?? 0) ? a : b
    );
    deduped.push(best);
  }

  // Preserve input order
  const dedupedSet = new Set(deduped);
  const result = articles.filter((a) => dedupedSet.has(a));

  if (result.length < articles.length) {
    logger.info(
      { removed: articles.length - result.length, remaining: result.length },
      "[TokenEconomy] Narrative deduplication complete",
    );
  }

  return result;
}

// ── Priority-first context allocation ─────────────────────────

export interface ScoredArticle extends ArticleLike {
  signalScore?: { label?: string; total?: number };
}

/**
 * Allocate character budgets to articles based on signal tier.
 * Higher-signal articles receive larger description slots.
 * Returns articles with descriptions trimmed to their allocated budget.
 */
export function allocatePriorityBudget<T extends ScoredArticle>(
  articles: T[],
  config: TokenBudgetConfig = DEFAULT_BUDGET,
): { articles: T[]; totalCharsAllocated: number } {
  let totalChars = 0;
  const result: T[] = [];

  for (const article of articles) {
    const tier = (article.signalScore?.label ?? "medium") as SignalTier;
    const include = TIER_INCLUSION_THRESHOLD[tier] ?? true;

    if (!include && result.length >= config.minArticles) {
      continue; // Skip low-tier once minimum is met
    }

    const budget = TIER_CHAR_BUDGET[tier] ?? TIER_CHAR_BUDGET.medium;
    const desc = article.description ?? "";
    const truncated = desc.length > budget ? desc.slice(0, budget - 3) + "…" : desc;

    const articleChars = (article.title?.length ?? 0) + truncated.length + 30;
    if (totalChars + articleChars > config.maxTotalChars && result.length >= config.minArticles) {
      logger.info(
        { allocatedArticles: result.length, totalChars },
        "[TokenEconomy] Budget exhausted — stopping allocation",
      );
      break;
    }

    totalChars += articleChars;
    result.push({ ...article, description: truncated });

    if (result.length >= config.maxArticles) break;
  }

  return { articles: result, totalCharsAllocated: totalChars };
}

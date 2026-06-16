// ============================================================
// AI PIPELINE — Sprint 17 Task A
//
// Three-layer pipeline that routes intelligence work to the
// cheapest capable processing layer, reserving expensive LLMs
// for genuinely high-value signals.
//
// LAYER 1 — Cheap / Rule-based
//   dedupe · entity extraction · source scoring · clustering
//   NO LLM calls — pure heuristics and cached results
//
// LAYER 2 — Mid / Small models
//   narrative labeling · relevance explanations · topic grouping
//   Use cheap/fast models only
//
// LAYER 3 — Premium / Large models
//   strategic insights · executive briefings · action intelligence
//   Gate strictly behind confidence + token budget checks
// ============================================================

import type { RssArticle } from "../news/rssService.js";
import { getDegradationLevel } from "./degradationEngine.js";
import { getTokenGovernorState } from "./tokenGovernor.js";
import { getSignalMode } from "./signalModeEngine.js";

// ── Pipeline tier types ───────────────────────────────────────

export type PipelineTier = "layer1" | "layer2" | "layer3";

export interface PipelineDecision {
  tier: PipelineTier;
  reason: string;
  estimatedTokens: number;
  modelSuggestion: "none" | "small" | "premium";
  gated: boolean;
  gateReason?: string;
}

export interface PipelineArticleResult {
  article: RssArticle;
  decision: PipelineDecision;
  layer1Result: Layer1Result;
}

export interface Layer1Result {
  isDuplicate: boolean;
  entityTags: string[];
  topicClass: string;
  signalScore: number;
  sourceScore: number;
  clusterKey: string;
}

// ── Layer 1 — Cheap rule-based processing ────────────────────

const CRYPTO_NOISE_PATTERNS = [
  /\b(pump|dump|moon|lambo|hodl|degen|ape|fud|fomo|shill)\b/i,
  /\b(100x|1000x|\d+x gains?)\b/i,
  /\b(influencer|sponsored|advertisement|promoted)\b/i,
];

const ENTITY_PATTERNS: Array<{ pattern: RegExp; entity: string }> = [
  { pattern: /\b(apple|aapl)\b/i, entity: "Apple" },
  { pattern: /\b(google|alphabet|googl)\b/i, entity: "Google" },
  { pattern: /\b(microsoft|msft)\b/i, entity: "Microsoft" },
  { pattern: /\b(meta|facebook|fb)\b/i, entity: "Meta" },
  { pattern: /\b(amazon|amzn)\b/i, entity: "Amazon" },
  { pattern: /\b(nvidia|nvda)\b/i, entity: "NVIDIA" },
  { pattern: /\b(tesla|tsla)\b/i, entity: "Tesla" },
  { pattern: /\b(fed|federal reserve|jerome powell)\b/i, entity: "Federal Reserve" },
  { pattern: /\b(china|chinese|beijing|prc)\b/i, entity: "China" },
  { pattern: /\b(us\s+government|white house|president|congress)\b/i, entity: "US Government" },
  { pattern: /\b(bitcoin|btc)\b/i, entity: "Bitcoin" },
  { pattern: /\b(ethereum|eth)\b/i, entity: "Ethereum" },
  { pattern: /\b(openai|chatgpt)\b/i, entity: "OpenAI" },
  { pattern: /\b(anthropic|claude)\b/i, entity: "Anthropic" },
  { pattern: /\b(thailand|thai|bangkok|boe)\b/i, entity: "Thailand" },
];

const TOPIC_CLASSIFIERS: Array<{ pattern: RegExp; topic: string }> = [
  { pattern: /\b(earnings?|revenue|profit|eps|guidance|forecast)\b/i, topic: "earnings" },
  { pattern: /\b(interest rate|inflation|cpi|gdp|recession|fed)\b/i, topic: "macro" },
  { pattern: /\b(bitcoin|ethereum|crypto|defi|nft|blockchain)\b/i, topic: "crypto" },
  { pattern: /\b(ai|artificial intelligence|machine learning|llm|gpt)\b/i, topic: "ai" },
  { pattern: /\b(war|sanctions|military|geopolitical|conflict)\b/i, topic: "geopolitics" },
  { pattern: /\b(election|politics|government|policy|regulation)\b/i, topic: "politics" },
  { pattern: /\b(merger|acquisition|ipo|buyout|deal|takeover)\b/i, topic: "m&a" },
  { pattern: /\b(supply chain|semiconductor|chip|manufacturing)\b/i, topic: "supply" },
];

function layer1Process(article: RssArticle): Layer1Result {
  const text = `${article.title ?? ""} ${article.description ?? ""}`;

  // Entity extraction — cheap keyword match
  const entityTags = ENTITY_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ entity }) => entity);

  // Topic classification
  const topicMatch = TOPIC_CLASSIFIERS.find(({ pattern }) => pattern.test(text));
  const topicClass = topicMatch?.topic ?? "general";

  // Duplicate detection — normalised title key
  const titleWords = (article.title ?? "").toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const clusterKey = titleWords.slice(0, 5).join("-");

  // Noise score — deduct for crypto spam patterns
  let signalScore = 50;
  const isNoisy = CRYPTO_NOISE_PATTERNS.some((p) => p.test(text));
  if (isNoisy) signalScore -= 30;
  if (entityTags.length > 0) signalScore += entityTags.length * 5;
  if (topicClass !== "general") signalScore += 10;
  if (!article.description || article.description.length < 100) signalScore -= 10;
  signalScore = Math.max(0, Math.min(100, signalScore));

  // Source score from title length heuristic (real scoring in sourceReliability)
  const sourceScore = (article.source ?? "").length > 0 ? 60 : 30;

  return {
    isDuplicate: false, // duplicate detection happens at batch level
    entityTags,
    topicClass,
    signalScore,
    sourceScore,
    clusterKey,
  };
}

// ── Escalation gating ──────────────────────────────────────────

function decideEscalation(
  layer1: Layer1Result,
  articleCount: number,
): PipelineDecision {
  const degradationLevel = getDegradationLevel();
  const tokenState = getTokenGovernorState();
  const signalMode = getSignalMode();

  // Hard gate: emergency degradation forces layer1 only
  if (degradationLevel >= 4) {
    return {
      tier: "layer1",
      reason: "Emergency degradation mode active",
      estimatedTokens: 0,
      modelSuggestion: "none",
      gated: true,
      gateReason: "degradation-level-4",
    };
  }

  // Hard gate: budget exhausted
  if (tokenState.budgetExhausted) {
    return {
      tier: "layer1",
      reason: "Daily token budget exhausted",
      estimatedTokens: 0,
      modelSuggestion: "none",
      gated: true,
      gateReason: "budget-exhausted",
    };
  }

  // Delivery-only degradation
  if (degradationLevel >= 3) {
    return {
      tier: "layer2",
      reason: "Delivery-only mode — no premium insights",
      estimatedTokens: 200,
      modelSuggestion: "small",
      gated: false,
    };
  }

  // Insufficient signal — stay at layer1
  if (layer1.signalScore < 25) {
    return {
      tier: "layer1",
      reason: "Low signal score — rule-based processing only",
      estimatedTokens: 0,
      modelSuggestion: "none",
      gated: false,
    };
  }

  // Budget pressure — downgrade to mid
  if (tokenState.pressureLevel === "high") {
    if (layer1.signalScore < 65) {
      return {
        tier: "layer2",
        reason: "Token pressure — downgraded from premium",
        estimatedTokens: 200,
        modelSuggestion: "small",
        gated: false,
      };
    }
  }

  // Safe mode — require higher confidence for premium
  const premiumThreshold = signalMode === "safe" ? 75
    : signalMode === "raw" ? 45
    : 60;

  if (layer1.signalScore >= premiumThreshold && degradationLevel < 2 && articleCount >= 2) {
    return {
      tier: "layer3",
      reason: `Signal score ${layer1.signalScore} exceeds premium threshold ${premiumThreshold}`,
      estimatedTokens: 1200,
      modelSuggestion: "premium",
      gated: false,
    };
  }

  // Default: mid-tier
  return {
    tier: "layer2",
    reason: "Standard mid-tier processing",
    estimatedTokens: 300,
    modelSuggestion: "small",
    gated: false,
  };
}

// ── Deduplication at batch level ──────────────────────────────

function deduplicateBatch(articles: RssArticle[]): RssArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = (a.title ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .slice(0, 5)
      .join("-");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Process a batch of articles through the 3-layer pipeline.
 * Returns per-article decisions without making any LLM calls.
 * The caller uses decisions to route articles to the correct AI tier.
 */
export function processBatchThroughPipeline(
  articles: RssArticle[],
): PipelineArticleResult[] {
  const deduped = deduplicateBatch(articles);

  return deduped.map((article) => {
    const layer1Result = layer1Process(article);
    const decision = decideEscalation(layer1Result, deduped.length);

    return { article, decision, layer1Result };
  });
}

/**
 * Get summary stats about the current pipeline state.
 */
export function getPipelineStats(): {
  degradationLevel: number;
  tokenPressure: string;
  signalMode: string;
  premiumThreshold: number;
} {
  const signalMode = getSignalMode();
  return {
    degradationLevel: getDegradationLevel(),
    tokenPressure: getTokenGovernorState().pressureLevel,
    signalMode,
    premiumThreshold: signalMode === "safe" ? 75 : signalMode === "raw" ? 45 : 60,
  };
}

/**
 * Filter articles to only those eligible for premium LLM processing.
 */
export function filterForPremiumProcessing(
  results: PipelineArticleResult[],
): PipelineArticleResult[] {
  return results.filter((r) => r.decision.tier === "layer3" && !r.decision.gated);
}

/**
 * Estimate total token cost for a batch given pipeline decisions.
 */
export function estimateBatchTokenCost(results: PipelineArticleResult[]): number {
  return results.reduce((sum, r) => sum + r.decision.estimatedTokens, 0);
}

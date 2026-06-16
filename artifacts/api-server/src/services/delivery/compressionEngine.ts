// ============================================================
// COMPRESSION ENGINE — Sprint 17 Task G
//
// Adaptive delivery compression that reduces AI cost dynamically.
// Integrates with: tokenGovernor · degradationEngine · signalModeEngine
//
// HIGH TOKEN PRESSURE:  shorter summaries, fewer narratives, compressed insights
// LOW TOKEN PRESSURE:   full premium briefing (pass-through)
// ============================================================

import { getTokenGovernorState } from "../intelligence/tokenGovernor.js";
import { getDegradationLevel, getDegradationConfig } from "../intelligence/degradationEngine.js";
import { getSignalMode } from "../intelligence/signalModeEngine.js";

// ── Compression profile ────────────────────────────────────────

export interface CompressionProfile {
  maxArticles: number;
  maxNarratives: number;
  maxSummaryChars: number;
  maxTotalChars: number;
  includeStrategicContext: boolean;
  includeActionInsights: boolean;
  includeConfidenceBadge: boolean;
  narrativeDepth: "full" | "compact" | "headline-only";
  estimatedReadTimeMin: number;
  compressionReason: string;
  tier: "full" | "standard" | "compact" | "minimal" | "emergency";
}

// ── Signal density scoring ─────────────────────────────────────

export interface SignalDensityScore {
  raw: number;          // 0–100: information density of original content
  compressed: number;   // 0–100: density after compression
  retainedRatio: number; // 0–1: fraction of original value preserved
}

// ── Profile builders ───────────────────────────────────────────

function buildFullProfile(): CompressionProfile {
  return {
    maxArticles: 10,
    maxNarratives: 8,
    maxSummaryChars: 4000,
    maxTotalChars: 20_000,
    includeStrategicContext: true,
    includeActionInsights: true,
    includeConfidenceBadge: true,
    narrativeDepth: "full",
    estimatedReadTimeMin: 5,
    compressionReason: "Full premium delivery — no token pressure",
    tier: "full",
  };
}

function buildStandardProfile(reason: string): CompressionProfile {
  return {
    maxArticles: 8,
    maxNarratives: 6,
    maxSummaryChars: 2800,
    maxTotalChars: 14_000,
    includeStrategicContext: true,
    includeActionInsights: false,
    includeConfidenceBadge: true,
    narrativeDepth: "full",
    estimatedReadTimeMin: 4,
    compressionReason: reason,
    tier: "standard",
  };
}

function buildCompactProfile(reason: string): CompressionProfile {
  return {
    maxArticles: 5,
    maxNarratives: 4,
    maxSummaryChars: 1600,
    maxTotalChars: 8_000,
    includeStrategicContext: false,
    includeActionInsights: false,
    includeConfidenceBadge: true,
    narrativeDepth: "compact",
    estimatedReadTimeMin: 2,
    compressionReason: reason,
    tier: "compact",
  };
}

function buildMinimalProfile(reason: string): CompressionProfile {
  return {
    maxArticles: 3,
    maxNarratives: 2,
    maxSummaryChars: 800,
    maxTotalChars: 4_000,
    includeStrategicContext: false,
    includeActionInsights: false,
    includeConfidenceBadge: false,
    narrativeDepth: "headline-only",
    estimatedReadTimeMin: 1,
    compressionReason: reason,
    tier: "minimal",
  };
}

function buildEmergencyProfile(reason: string): CompressionProfile {
  return {
    maxArticles: 2,
    maxNarratives: 1,
    maxSummaryChars: 400,
    maxTotalChars: 1_500,
    includeStrategicContext: false,
    includeActionInsights: false,
    includeConfidenceBadge: false,
    narrativeDepth: "headline-only",
    estimatedReadTimeMin: 0.5,
    compressionReason: reason,
    tier: "emergency",
  };
}

// ── Main profile selection ─────────────────────────────────────

/**
 * Select the appropriate compression profile based on current system state.
 * Call once per delivery, use the profile to shape the entire briefing.
 */
export function selectCompressionProfile(): CompressionProfile {
  const degradationLevel = getDegradationLevel();
  const degradationConfig = getDegradationConfig();
  const tokenState = getTokenGovernorState();
  const signalMode = getSignalMode();

  // Degradation takes absolute priority
  if (degradationLevel >= 4) {
    return buildEmergencyProfile("Emergency degradation mode");
  }
  if (degradationLevel >= 3) {
    return buildMinimalProfile("Delivery-only degradation mode");
  }
  if (degradationLevel >= 2) {
    return buildCompactProfile("Economy degradation mode");
  }

  // Token pressure gating
  if (tokenState.budgetExhausted) {
    return buildEmergencyProfile("Token budget exhausted");
  }
  if (tokenState.pressureLevel === "critical") {
    return buildMinimalProfile("Token budget critical");
  }
  if (tokenState.pressureLevel === "high") {
    return buildCompactProfile("Token budget high pressure");
  }
  if (tokenState.pressureLevel === "moderate") {
    return buildStandardProfile("Token budget moderate pressure");
  }

  // Signal mode adjustments
  if (signalMode === "safe") {
    // Safe mode: fewer articles but richer analysis
    const profile = buildFullProfile();
    profile.maxArticles = 6;
    profile.compressionReason = "Safe mode: reduced articles, full depth";
    return profile;
  }

  if (signalMode === "raw") {
    // Raw mode: more articles, less depth per article
    const profile = buildStandardProfile("Raw signal mode: high volume");
    profile.maxArticles = 12;
    profile.maxSummaryChars = 2000;
    return profile;
  }

  // Level 1 degradation (mild)
  if (degradationLevel >= 1) {
    return buildStandardProfile("Mild degradation: reduced narrative depth");
  }

  // Override with degradation config limits if they're tighter
  const full = buildFullProfile();
  full.maxArticles = Math.min(full.maxArticles, degradationConfig.maxArticlesPerBriefing);
  full.maxSummaryChars = Math.min(full.maxSummaryChars, degradationConfig.summaryMaxChars);

  return full;
}

// ── Content compression ────────────────────────────────────────

/**
 * Compress a text summary to fit within the profile's char limit.
 * Preserves high-density sentences (numbers, entities, verbs of movement).
 */
export function compressToProfile(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  // Split into sentences
  const sentences = text
    .replace(/([.!?])\s+/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // Score each sentence by information density
  const scored = sentences.map((sentence) => {
    let score = 0;
    if (/\d/.test(sentence)) score += 10;          // contains numbers
    if (/\b(rose|fell|surged|dropped|gained|lost|announced|revealed|said|warned)\b/i.test(sentence)) score += 8;
    if (/\b(billion|million|trillion|percent|%)\b/i.test(sentence)) score += 7;
    if (sentence.length > 60) score += 3;
    return { sentence, score };
  });

  // Greedily add highest-scoring sentences until limit
  scored.sort((a, b) => b.score - a.score);
  let result = "";
  for (const { sentence } of scored) {
    if (result.length + sentence.length + 2 > maxChars) break;
    result += (result ? " " : "") + sentence;
  }

  return result || text.slice(0, maxChars);
}

/**
 * Estimate token count for a compressed briefing.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5); // Thai is ~3.5 chars/token average
}

/**
 * Score the signal density of a text (0–100).
 */
export function scoreSignalDensity(text: string): number {
  const words = text.split(/\s+/).length;
  const numbers = (text.match(/\d+/g) ?? []).length;
  const actionWords = (text.match(/\b(rose|fell|surged|dropped|gained|lost|announced|revealed|warned|said|reported|confirmed)\b/gi) ?? []).length;
  const entities = (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? []).length;

  const density = Math.min(100, Math.round(
    (numbers / Math.max(words, 1)) * 200 +
    (actionWords / Math.max(words, 1)) * 150 +
    (entities / Math.max(words, 1)) * 100,
  ));

  return density;
}

/**
 * Compression analytics — what was retained, what was cut.
 */
export function analyzeCompression(
  original: string,
  compressed: string,
): SignalDensityScore {
  const rawDensity = scoreSignalDensity(original);
  const compressedDensity = scoreSignalDensity(compressed);
  const retainedRatio = original.length > 0
    ? compressed.length / original.length
    : 1;

  return {
    raw: rawDensity,
    compressed: compressedDensity,
    retainedRatio: Math.round(retainedRatio * 100) / 100,
  };
}

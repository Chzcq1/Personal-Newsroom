// ============================================================
// COMPRESSION ENGINE — Sprint 17 Task G · Sprint 18 Task H Upgrade
//
// Adaptive delivery compression that reduces AI cost dynamically.
// Integrates with: tokenGovernor · degradationEngine · signalModeEngine
//
// HIGH TOKEN PRESSURE:  shorter summaries, fewer narratives, compressed insights
// LOW TOKEN PRESSURE:   full premium briefing (pass-through)
//
// Sprint 18 additions:
//   - Density modes: executive / investor / operator
//   - "Only new developments" mode (delta-only output)
//   - Persona-aware compression (different priors per role)
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

// ── Sprint 18: Density mode types ─────────────────────────────

export type PersonaDensityMode =
  | "executive"   // C-suite: decisions + financial impact only
  | "investor"    // Portfolio lens: market + earnings + risk
  | "operator"    // Operator lens: product + regulatory + execution
  | "analyst"     // Full detail (default)
  | "delta_only"; // Only new developments since last briefing

export interface PersonaCompressionConfig {
  mode: PersonaDensityMode;
  maxBullets: number;
  maxCharsPerBullet: number;
  includeMarketNumbers: boolean;
  includeRegulatoryContext: boolean;
  includeExecutionDetail: boolean;
  includeStrategicContext: boolean;
  prioritizeSections: string[];  // Section keywords to keep
  deprioritizeSections: string[]; // Section keywords to trim first
  readTimeTargetSecs: number;
}

const PERSONA_CONFIGS: Record<PersonaDensityMode, PersonaCompressionConfig> = {
  executive: {
    mode: "executive",
    maxBullets: 3,
    maxCharsPerBullet: 120,
    includeMarketNumbers: true,
    includeRegulatoryContext: false,
    includeExecutionDetail: false,
    includeStrategicContext: true,
    prioritizeSections: ["HEADLINE", "IMPACT", "ACTION", "DECISION"],
    deprioritizeSections: ["BACKGROUND", "CONTEXT", "DETAIL", "TECHNICAL"],
    readTimeTargetSecs: 15,
  },
  investor: {
    mode: "investor",
    maxBullets: 5,
    maxCharsPerBullet: 150,
    includeMarketNumbers: true,
    includeRegulatoryContext: true,
    includeExecutionDetail: false,
    includeStrategicContext: true,
    prioritizeSections: ["EARNINGS", "REVENUE", "MARKET", "RISK", "VALUATION"],
    deprioritizeSections: ["PRODUCT", "TECHNICAL", "UX"],
    readTimeTargetSecs: 30,
  },
  operator: {
    mode: "operator",
    maxBullets: 5,
    maxCharsPerBullet: 180,
    includeMarketNumbers: false,
    includeRegulatoryContext: true,
    includeExecutionDetail: true,
    includeStrategicContext: false,
    prioritizeSections: ["PRODUCT", "REGULATION", "EXECUTION", "TIMELINE"],
    deprioritizeSections: ["MACRO", "GEOPOLITICS", "EARNINGS"],
    readTimeTargetSecs: 45,
  },
  analyst: {
    mode: "analyst",
    maxBullets: 8,
    maxCharsPerBullet: 300,
    includeMarketNumbers: true,
    includeRegulatoryContext: true,
    includeExecutionDetail: true,
    includeStrategicContext: true,
    prioritizeSections: [],  // Keep everything
    deprioritizeSections: [],
    readTimeTargetSecs: 90,
  },
  delta_only: {
    mode: "delta_only",
    maxBullets: 4,
    maxCharsPerBullet: 200,
    includeMarketNumbers: true,
    includeRegulatoryContext: false,
    includeExecutionDetail: false,
    includeStrategicContext: false,
    prioritizeSections: ["NEW", "UPDATE", "BREAKING", "CHANGED", "FIRST"],
    deprioritizeSections: ["BACKGROUND", "PREVIOUSLY", "REMINDER", "RECAP"],
    readTimeTargetSecs: 20,
  },
};

/**
 * Get compression config for a persona density mode.
 */
export function getPersonaCompressionConfig(mode: PersonaDensityMode): PersonaCompressionConfig {
  return PERSONA_CONFIGS[mode];
}

/**
 * Apply persona-aware compression to a briefing text.
 * Prioritises sections matching the persona's focus.
 * "delta_only" mode filters to new-development sentences only.
 */
export function compressForPersona(
  text: string,
  mode: PersonaDensityMode,
): string {
  const config = PERSONA_CONFIGS[mode];

  if (mode === "analyst") return text; // No compression for analyst

  const sentences = text
    .replace(/([.!?])\s+/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // Delta-only mode: keep only sentences that signal new developments
  const DELTA_SIGNALS = [
    /\b(new|update|just|announced|launched|released|confirmed|reveals|breaks|first|record)\b/i,
    /\b(ใหม่|ประกาศ|เปิดตัว|อัปเดต|ล่าสุด|ครั้งแรก|เพิ่งเผย)\b/,
  ];
  const RECAP_SIGNALS = [
    /\b(previously|earlier|background|context|history|recap|reminder|had been)\b/i,
    /\b(เดิม|ก่อนหน้า|บริบท|ย้อนหลัง|ก่อนหน้านี้)\b/,
  ];

  if (mode === "delta_only") {
    const deltaOnly = sentences.filter((s) => {
      const isRecap = RECAP_SIGNALS.some((p) => p.test(s));
      if (isRecap) return false;
      const isDelta = DELTA_SIGNALS.some((p) => p.test(s));
      return isDelta || (s.match(/\d/) && s.length > 40);
    });
    return deltaOnly.slice(0, config.maxBullets).join(" ");
  }

  // Priority scoring for other persona modes
  const deprioritizePatterns = config.deprioritizeSections.map(
    (kw) => new RegExp(`\\b${kw}\\b`, "i")
  );
  const prioritizePatterns = config.prioritizeSections.map(
    (kw) => new RegExp(`\\b${kw}\\b`, "i")
  );

  const scored = sentences.map((sentence) => {
    let score = 50; // base

    // Boost prioritized sections
    if (prioritizePatterns.some((p) => p.test(sentence))) score += 30;
    // Penalize deprioritized sections
    if (deprioritizePatterns.some((p) => p.test(sentence))) score -= 30;
    // Market numbers are important for most modes
    if (config.includeMarketNumbers && /\d+(\.\d+)?%/.test(sentence)) score += 15;
    if (!config.includeMarketNumbers && /\$[\d,]+[BMK]?/.test(sentence)) score -= 10;
    // Regulatory context
    if (!config.includeRegulatoryContext && /\b(regulation|law|fine|ban|compliance)\b/i.test(sentence)) score -= 20;
    // Execution detail
    if (!config.includeExecutionDetail && /\b(product|feature|roadmap|launch|release)\b/i.test(sentence)) score -= 15;

    return { sentence, score };
  });

  scored.sort((a, b) => b.score - a.score);

  let result = "";
  let bulletCount = 0;
  for (const { sentence } of scored) {
    if (bulletCount >= config.maxBullets) break;
    const trimmed = sentence.slice(0, config.maxCharsPerBullet);
    result += (result ? " " : "") + trimmed;
    bulletCount++;
  }

  return result || text.slice(0, config.maxBullets * config.maxCharsPerBullet);
}

/**
 * Delta mode: strips recap/background sentences, keeping only new developments.
 * Fast path for returning users who already know the story.
 */
export function extractDeltaOnly(text: string): string {
  return compressForPersona(text, "delta_only");
}

// ============================================================
// TOKEN SURVIVAL ENGINE — Sprint 18 Task F
//
// Makes INFOX survive 1000+ users without catastrophic AI cost.
//
// Strategies:
//   - Adaptive AI routing (cheap → expensive when needed)
//   - Dynamic prompt shrinking
//   - Narrative reuse (cached analysis inheritance)
//   - Summary memoization (content-hash dedup)
//   - Duplicate generation prevention
//   - Signal-based AI escalation (only escalate high-signal content)
//   - Token emergency mode (extreme cost saving)
//
// Integrates with: tokenGovernor · degradationEngine · intelligenceCache
// ============================================================

import { logger } from "../../lib/logger.js";
import { getTokenGovernorState } from "./tokenGovernor.js";
import { getDegradationLevel } from "./degradationEngine.js";

// ── Survival mode types ───────────────────────────────────────

export type SurvivalMode =
  | "normal"      // Full AI, no constraints
  | "efficient"   // Prompt shrinking, cache-first
  | "frugal"      // Narrative reuse heavy, minimal AI calls
  | "survival"    // Emergency: only critical signals get AI
  | "emergency";  // Extreme: cached responses only, no new AI calls

export interface SurvivalConfig {
  mode: SurvivalMode;
  maxPromptsPerHour: number;
  maxTokensPerPrompt: number;
  narrativeReuseThreshold: number;   // similarity score to reuse (0–1)
  escalationMinScore: number;        // min signal score to get AI (0–100)
  memoizationEnabled: boolean;
  dupSuppressionEnabled: boolean;
  reason: string;
}

export interface TokenWasteEvent {
  type:
    | "duplicate_generation"
    | "low_signal_ai_call"
    | "unnecessary_regen"
    | "expensive_entity"
    | "repeated_prompt";
  sourceId?: string;
  topic?: string;
  estimatedTokensWasted: number;
  timestamp: string;
  detail?: string;
}

export interface SurvivalStats {
  mode: SurvivalMode;
  promptsSuppressed: number;
  cacheHitsUsed: number;
  narrativesReused: number;
  duplicatesSuppressed: number;
  estimatedTokensSaved: number;
  wasteEvents: TokenWasteEvent[];
  hourlyPromptCount: number;
  lastEvaluation: string;
}

// ── Memoization store ──────────────────────────────────────────
// Key: content hash of prompt input → Value: cached AI output

interface MemoEntry {
  hash: string;
  output: string;
  createdAt: number;
  ttlMs: number;
  hitCount: number;
}

const memoStore = new Map<string, MemoEntry>();
const MEMO_TTL_NORMAL = 30 * 60 * 1000;    // 30 min
const MEMO_TTL_SURVIVAL = 2 * 60 * 60 * 1000; // 2 hours in survival

// ── Prompt history (for repeated pattern detection) ────────────

interface PromptRecord {
  hash: string;
  topicId: string;
  timestamp: number;
}

const promptHistory: PromptRecord[] = [];
const MAX_PROMPT_HISTORY = 500;

// ── State ──────────────────────────────────────────────────────

const _stats: SurvivalStats = {
  mode: "normal",
  promptsSuppressed: 0,
  cacheHitsUsed: 0,
  narrativesReused: 0,
  duplicatesSuppressed: 0,
  estimatedTokensSaved: 0,
  wasteEvents: [],
  hourlyPromptCount: 0,
  lastEvaluation: new Date().toISOString(),
};

let _hourlyWindow = Date.now();

// ── Content hash (non-crypto, for dedup) ─────────────────────

function simpleHash(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32-bit int
  }
  return Math.abs(hash).toString(36);
}

// ── Mode evaluation ────────────────────────────────────────────

export function evaluateSurvivalMode(): SurvivalConfig {
  const governor = getTokenGovernorState();
  const degradation = getDegradationLevel();

  // Derive remaining budget percentage from budgetFraction (0–1)
  const remainingBudgetPct = Math.round((1 - governor.budgetFraction) * 100);
  const pressureLevel = governor.pressureLevel;

  let mode: SurvivalMode;
  let reason: string;

  // Reset hourly counter every 60 minutes
  if (Date.now() - _hourlyWindow > 60 * 60 * 1000) {
    _stats.hourlyPromptCount = 0;
    _hourlyWindow = Date.now();
  }

  // Evaluate mode from multiple signals
  if (
    degradation >= 4 ||
    pressureLevel === "critical" ||
    pressureLevel === "exhausted" ||
    remainingBudgetPct < 2
  ) {
    mode = "emergency";
    reason = `Emergency: degradation=${degradation}, pressure=${pressureLevel}`;
  } else if (
    degradation >= 3 ||
    pressureLevel === "high" ||
    remainingBudgetPct < 10
  ) {
    mode = "survival";
    reason = `Survival: degradation=${degradation}, budget remaining=${remainingBudgetPct}%`;
  } else if (
    degradation >= 2 ||
    remainingBudgetPct < 25
  ) {
    mode = "frugal";
    reason = `Frugal: degradation=${degradation}, budget remaining=${remainingBudgetPct}%`;
  } else if (
    degradation >= 1 ||
    pressureLevel === "moderate" ||
    remainingBudgetPct < 50
  ) {
    mode = "efficient";
    reason = `Efficient: degradation=${degradation}, budget remaining=${remainingBudgetPct}%`;
  } else {
    mode = "normal";
    reason = "Normal: healthy token budget and degradation";
  }

  _stats.mode = mode;
  _stats.lastEvaluation = new Date().toISOString();

  const configs: Record<SurvivalMode, SurvivalConfig> = {
    normal: {
      mode: "normal",
      maxPromptsPerHour: 200,
      maxTokensPerPrompt: 6000,
      narrativeReuseThreshold: 0.90,
      escalationMinScore: 0,
      memoizationEnabled: true,
      dupSuppressionEnabled: true,
      reason,
    },
    efficient: {
      mode: "efficient",
      maxPromptsPerHour: 150,
      maxTokensPerPrompt: 4500,
      narrativeReuseThreshold: 0.80,
      escalationMinScore: 20,
      memoizationEnabled: true,
      dupSuppressionEnabled: true,
      reason,
    },
    frugal: {
      mode: "frugal",
      maxPromptsPerHour: 80,
      maxTokensPerPrompt: 3000,
      narrativeReuseThreshold: 0.70,
      escalationMinScore: 40,
      memoizationEnabled: true,
      dupSuppressionEnabled: true,
      reason,
    },
    survival: {
      mode: "survival",
      maxPromptsPerHour: 30,
      maxTokensPerPrompt: 2000,
      narrativeReuseThreshold: 0.60,
      escalationMinScore: 60,
      memoizationEnabled: true,
      dupSuppressionEnabled: true,
      reason,
    },
    emergency: {
      mode: "emergency",
      maxPromptsPerHour: 5,
      maxTokensPerPrompt: 1500,
      narrativeReuseThreshold: 0.50,
      escalationMinScore: 80,
      memoizationEnabled: true,
      dupSuppressionEnabled: true,
      reason,
    },
  };

  return configs[mode];
}

// ── Memoization API ────────────────────────────────────────────

export function checkMemo(promptContent: string): string | null {
  const hash = simpleHash(promptContent);
  const entry = memoStore.get(hash);
  if (!entry) return null;

  const isExpired = Date.now() - entry.createdAt > entry.ttlMs;
  if (isExpired) {
    memoStore.delete(hash);
    return null;
  }

  entry.hitCount++;
  _stats.cacheHitsUsed++;
  _stats.estimatedTokensSaved += 1500; // avg tokens per AI call
  memoStore.set(hash, entry);
  return entry.output;
}

export function storeMemo(promptContent: string, output: string): void {
  const config = evaluateSurvivalMode();
  const hash = simpleHash(promptContent);
  const ttlMs =
    config.mode === "survival" || config.mode === "emergency"
      ? MEMO_TTL_SURVIVAL
      : MEMO_TTL_NORMAL;

  memoStore.set(hash, {
    hash,
    output,
    createdAt: Date.now(),
    ttlMs,
    hitCount: 0,
  });

  // Evict oldest if too large
  if (memoStore.size > 300) {
    const oldest = Array.from(memoStore.entries())
      .sort(([, a], [, b]) => a.createdAt - b.createdAt)[0];
    if (oldest) memoStore.delete(oldest[0]);
  }
}

// ── Duplicate suppression ──────────────────────────────────────

export function isDuplicatePrompt(topicId: string, promptContent: string): boolean {
  const config = evaluateSurvivalMode();
  if (!config.dupSuppressionEnabled) return false;

  const hash = simpleHash(promptContent);
  const windowMs = 15 * 60 * 1000; // 15 min window
  const now = Date.now();

  const recentDup = promptHistory.find(
    (p) =>
      p.topicId === topicId &&
      p.hash === hash &&
      now - p.timestamp < windowMs
  );

  if (recentDup) {
    _stats.duplicatesSuppressed++;
    _stats.estimatedTokensSaved += 1500;
    recordWasteEvent({
      type: "duplicate_generation",
      topic: topicId,
      estimatedTokensWasted: 1500,
      detail: `Duplicate prompt for ${topicId} within 15min window`,
    });
    return true;
  }

  // Record this prompt
  promptHistory.push({ hash, topicId, timestamp: now });
  if (promptHistory.length > MAX_PROMPT_HISTORY) promptHistory.shift();

  return false;
}

// ── Signal escalation gate ─────────────────────────────────────

export function shouldEscalateToAI(signalScore: number): boolean {
  const config = evaluateSurvivalMode();
  const passes = signalScore >= config.escalationMinScore;

  if (!passes) {
    _stats.promptsSuppressed++;
    _stats.estimatedTokensSaved += 1500;
    recordWasteEvent({
      type: "low_signal_ai_call",
      estimatedTokensWasted: 1500,
      detail: `Signal score ${signalScore} below threshold ${config.escalationMinScore}`,
    });
  }

  return passes;
}

// ── Prompt shrinking ───────────────────────────────────────────

export function shrinkPrompt(prompt: string, maxChars: number): string {
  if (prompt.length <= maxChars) return prompt;

  // Remove least-important sections first
  const lines = prompt.split("\n");

  // Keep critical structure lines (HEADLINE, EXECUTIVE, etc.)
  const criticalKeywords = [
    "HEADLINE", "EXECUTIVE", "CRITICAL", "BREAKING", "สำคัญที่สุด",
    "คำสั่ง", "กฎที่ต้องปฏิบัติ", "หลักการ",
  ];
  const critical = lines.filter((l) =>
    criticalKeywords.some((k) => l.toUpperCase().includes(k))
  );
  const nonCritical = lines.filter(
    (l) => !criticalKeywords.some((k) => l.toUpperCase().includes(k))
  );

  // Progressive trimming from non-critical
  let result = prompt;
  let nonCritIdx = nonCritical.length - 1;
  while (result.length > maxChars && nonCritIdx >= 0) {
    nonCritical.splice(nonCritIdx, 1);
    result = [...critical, ...nonCritical].join("\n");
    nonCritIdx--;
  }

  return result.slice(0, maxChars);
}

// ── Waste event recording ──────────────────────────────────────

function recordWasteEvent(
  event: Omit<TokenWasteEvent, "timestamp">
): void {
  _stats.wasteEvents.push({
    ...event,
    timestamp: new Date().toISOString(),
  });
  // Keep last 50 events
  if (_stats.wasteEvents.length > 50) {
    _stats.wasteEvents.shift();
  }
}

// ── Stats / admin ──────────────────────────────────────────────

export function getSurvivalStats(): SurvivalStats & {
  memoStoreSize: number;
  currentConfig: SurvivalConfig;
} {
  return {
    ..._stats,
    memoStoreSize: memoStore.size,
    currentConfig: evaluateSurvivalMode(),
  };
}

export function getMemoStats(): {
  size: number;
  totalHits: number;
  avgHitCount: number;
} {
  const entries = Array.from(memoStore.values());
  const totalHits = entries.reduce((sum, e) => sum + e.hitCount, 0);
  return {
    size: entries.length,
    totalHits,
    avgHitCount: entries.length > 0 ? totalHits / entries.length : 0,
  };
}

// ============================================================
// TOKEN GOVERNOR V2 — Sprint 17 Task B
//
// Hard-limit budget engine on top of the existing tokenEconomy.
// Tracks usage per: user, feature, narrative, delivery, signal mode.
// Triggers degradation when pressure rises.
//
// Integration: call recordGovernorUsage() after every AI call.
// Check canSpend() before making any AI call.
// ============================================================

import { getDegradationLevel, setDegradationLevel } from "./degradationEngine.js";

// ── Budget tiers ───────────────────────────────────────────────

export interface GovernorBudget {
  dailyTokens: number;          // hard cap for the day
  sessionTokens: number;        // per-request session cap
  premiumFraction: number;      // max fraction of daily budget for premium
  emergencyThreshold: number;   // fraction at which to trigger level-4
  degradeAt: number;            // fraction at which to start degrading (level-1)
}

export const GOVERNOR_BUDGETS: Record<string, GovernorBudget> = {
  free: {
    dailyTokens: 50_000,
    sessionTokens: 4_000,
    premiumFraction: 0.4,
    emergencyThreshold: 0.98,
    degradeAt: 0.75,
  },
  standard: {
    dailyTokens: 200_000,
    sessionTokens: 8_000,
    premiumFraction: 0.5,
    emergencyThreshold: 0.98,
    degradeAt: 0.80,
  },
  unlimited: {
    dailyTokens: 2_000_000,
    sessionTokens: 20_000,
    premiumFraction: 0.7,
    emergencyThreshold: 0.99,
    degradeAt: 0.90,
  },
};

// ── Usage tracking ─────────────────────────────────────────────

export interface UsageRecord {
  tokens: number;
  feature: string;
  narrativeId?: string;
  userId?: string;
  signalMode: string;
  tier: "layer1" | "layer2" | "layer3";
  recordedAt: string;
}

interface GovernorState {
  dailyUsed: number;
  sessionUsed: number;
  premiumUsed: number;
  resetAt: string;             // ISO date string for when daily resets
  budget: GovernorBudget;
  usageHistory: UsageRecord[];
  featureUsage: Map<string, number>;
  narrativeUsage: Map<string, number>;
}

const state: GovernorState = {
  dailyUsed: 0,
  sessionUsed: 0,
  premiumUsed: 0,
  resetAt: nextMidnightISO(),
  budget: GOVERNOR_BUDGETS["free"]!,
  usageHistory: [],
  featureUsage: new Map(),
  narrativeUsage: new Map(),
};

function nextMidnightISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function checkAndResetDaily(): void {
  if (new Date().toISOString() >= state.resetAt) {
    state.dailyUsed = 0;
    state.premiumUsed = 0;
    state.sessionUsed = 0;
    state.resetAt = nextMidnightISO();
    state.featureUsage.clear();
    state.narrativeUsage.clear();
  }
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Check if a proposed spend is within budget.
 * Returns false if the spend would exceed any hard limit.
 */
export function canSpend(
  tokens: number,
  tier: "layer1" | "layer2" | "layer3" = "layer2",
): boolean {
  checkAndResetDaily();
  const { budget } = state;

  if (state.dailyUsed + tokens > budget.dailyTokens) return false;
  if (state.sessionUsed + tokens > budget.sessionTokens) return false;

  if (tier === "layer3") {
    const premiumMax = budget.dailyTokens * budget.premiumFraction;
    if (state.premiumUsed + tokens > premiumMax) return false;
  }

  return true;
}

/**
 * Record token usage after an AI call completes.
 * Automatically triggers degradation if budget pressure rises.
 */
export function recordGovernorUsage(record: Omit<UsageRecord, "recordedAt">): void {
  checkAndResetDaily();

  state.dailyUsed += record.tokens;
  state.sessionUsed += record.tokens;
  if (record.tier === "layer3") state.premiumUsed += record.tokens;

  // Feature tracking
  const prev = state.featureUsage.get(record.feature) ?? 0;
  state.featureUsage.set(record.feature, prev + record.tokens);

  // Narrative tracking
  if (record.narrativeId) {
    const nprev = state.narrativeUsage.get(record.narrativeId) ?? 0;
    state.narrativeUsage.set(record.narrativeId, nprev + record.tokens);
  }

  // History (ring buffer — last 200)
  state.usageHistory.push({ ...record, recordedAt: new Date().toISOString() });
  if (state.usageHistory.length > 200) {
    state.usageHistory.splice(0, state.usageHistory.length - 200);
  }

  // Auto-trigger degradation if budget pressure rises
  const fraction = state.dailyUsed / state.budget.dailyTokens;
  const currentDegLevel = getDegradationLevel();

  if (fraction >= state.budget.emergencyThreshold && currentDegLevel < 4) {
    setDegradationLevel(4, `Token budget emergency: ${(fraction * 100).toFixed(0)}% used`);
  } else if (fraction >= 0.95 && currentDegLevel < 3) {
    setDegradationLevel(3, `Token budget critical: ${(fraction * 100).toFixed(0)}% used`);
  } else if (fraction >= 0.85 && currentDegLevel < 2) {
    setDegradationLevel(2, `Token budget high: ${(fraction * 100).toFixed(0)}% used`);
  } else if (fraction >= state.budget.degradeAt && currentDegLevel < 1) {
    setDegradationLevel(1, `Token budget pressure: ${(fraction * 100).toFixed(0)}% used`);
  }
}

/**
 * Reset the session counter (call at the start of each request).
 */
export function resetSession(): void {
  state.sessionUsed = 0;
}

/**
 * Set the active budget tier (e.g. based on user's plan).
 */
export function setBudgetTier(tier: keyof typeof GOVERNOR_BUDGETS): void {
  const budget = GOVERNOR_BUDGETS[tier];
  if (budget) state.budget = budget;
}

/**
 * Current governor state snapshot — for observability.
 */
export function getTokenGovernorState(): {
  dailyUsed: number;
  dailyBudget: number;
  premiumUsed: number;
  premiumBudget: number;
  sessionUsed: number;
  sessionBudget: number;
  budgetFraction: number;
  premiumFraction: number;
  pressureLevel: "normal" | "moderate" | "high" | "critical" | "exhausted";
  budgetExhausted: boolean;
  resetAt: string;
  topFeatures: Array<{ feature: string; tokens: number }>;
  topNarratives: Array<{ narrativeId: string; tokens: number }>;
} {
  checkAndResetDaily();
  const { budget } = state;

  const budgetFraction = state.dailyUsed / budget.dailyTokens;
  const premiumFraction = state.premiumUsed / (budget.dailyTokens * budget.premiumFraction);

  let pressureLevel: "normal" | "moderate" | "high" | "critical" | "exhausted";
  if (budgetFraction >= 1.0) pressureLevel = "exhausted";
  else if (budgetFraction >= 0.95) pressureLevel = "critical";
  else if (budgetFraction >= 0.85) pressureLevel = "high";
  else if (budgetFraction >= 0.70) pressureLevel = "moderate";
  else pressureLevel = "normal";

  const topFeatures = [...state.featureUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([feature, tokens]) => ({ feature, tokens }));

  const topNarratives = [...state.narrativeUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([narrativeId, tokens]) => ({ narrativeId, tokens }));

  return {
    dailyUsed: state.dailyUsed,
    dailyBudget: budget.dailyTokens,
    premiumUsed: state.premiumUsed,
    premiumBudget: Math.round(budget.dailyTokens * budget.premiumFraction),
    sessionUsed: state.sessionUsed,
    sessionBudget: budget.sessionTokens,
    budgetFraction,
    premiumFraction,
    pressureLevel,
    budgetExhausted: budgetFraction >= 1.0,
    resetAt: state.resetAt,
    topFeatures,
    topNarratives,
  };
}

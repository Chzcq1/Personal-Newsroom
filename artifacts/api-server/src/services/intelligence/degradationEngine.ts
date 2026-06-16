// ============================================================
// DEGRADATION ENGINE — Sprint 17 Task J
//
// 4-level graceful degradation system.
// Automatically activates when the system is overloaded.
// Prevents hard failures from usage spikes.
//
// LEVEL 0 — Normal         Full premium intelligence
// LEVEL 1 — Reduced        Reduced narrative depth
// LEVEL 2 — Economy        Disable expensive insights
// LEVEL 3 — Delivery-only  Summaries only, no strategic layer
// LEVEL 4 — Emergency      Minimal rule-based summaries only
// ============================================================

export type DegradationLevel = 0 | 1 | 2 | 3 | 4;

export interface DegradationConfig {
  level: DegradationLevel;
  label: string;
  description: string;
  allowPremiumLLM: boolean;
  allowStrategicContext: boolean;
  allowActionInsights: boolean;
  allowNarrativeLabeling: boolean;
  maxArticlesPerBriefing: number;
  maxNarrativesTracked: number;
  summaryMaxChars: number;
  reason?: string;
}

export const DEGRADATION_CONFIGS: Record<DegradationLevel, DegradationConfig> = {
  0: {
    level: 0,
    label: "Normal",
    description: "Full premium intelligence — all features active",
    allowPremiumLLM: true,
    allowStrategicContext: true,
    allowActionInsights: true,
    allowNarrativeLabeling: true,
    maxArticlesPerBriefing: 10,
    maxNarrativesTracked: 150,
    summaryMaxChars: 4000,
  },
  1: {
    level: 1,
    label: "Reduced",
    description: "Reduced narrative depth — top signals only",
    allowPremiumLLM: true,
    allowStrategicContext: true,
    allowActionInsights: false,
    allowNarrativeLabeling: true,
    maxArticlesPerBriefing: 7,
    maxNarrativesTracked: 80,
    summaryMaxChars: 2800,
  },
  2: {
    level: 2,
    label: "Economy",
    description: "Expensive insights disabled — standard summaries only",
    allowPremiumLLM: false,
    allowStrategicContext: false,
    allowActionInsights: false,
    allowNarrativeLabeling: true,
    maxArticlesPerBriefing: 5,
    maxNarrativesTracked: 40,
    summaryMaxChars: 1800,
  },
  3: {
    level: 3,
    label: "Delivery-only",
    description: "Core delivery preserved — no intelligence layer",
    allowPremiumLLM: false,
    allowStrategicContext: false,
    allowActionInsights: false,
    allowNarrativeLabeling: false,
    maxArticlesPerBriefing: 4,
    maxNarrativesTracked: 20,
    summaryMaxChars: 1200,
  },
  4: {
    level: 4,
    label: "Emergency",
    description: "Minimal rule-based summaries only — no AI calls",
    allowPremiumLLM: false,
    allowStrategicContext: false,
    allowActionInsights: false,
    allowNarrativeLabeling: false,
    maxArticlesPerBriefing: 3,
    maxNarrativesTracked: 10,
    summaryMaxChars: 600,
  },
};

// ── State ──────────────────────────────────────────────────────

interface DegradationState {
  level: DegradationLevel;
  manualOverride: boolean;
  reason: string;
  activatedAt: string | null;
  escalationHistory: Array<{
    level: DegradationLevel;
    reason: string;
    timestamp: string;
  }>;
}

const state: DegradationState = {
  level: 0,
  manualOverride: false,
  reason: "Normal operation",
  activatedAt: null,
  escalationHistory: [],
};

// ── Escalation rules ───────────────────────────────────────────

interface SystemSignals {
  errorRate?: number;       // 0–1: fraction of AI calls failing
  avgLatencyMs?: number;    // average AI call latency
  memoryPressure?: number;  // 0–1: heap usage fraction
  budgetFraction?: number;  // 0–1: fraction of daily budget used
}

/**
 * Automatically evaluate signals and escalate/de-escalate degradation.
 * Call this from the health monitor or token governor.
 */
export function evaluateDegradation(signals: SystemSignals): DegradationLevel {
  if (state.manualOverride) return state.level;

  const { errorRate = 0, avgLatencyMs = 0, memoryPressure = 0, budgetFraction = 0 } = signals;

  let targetLevel: DegradationLevel = 0;

  // Level 4: catastrophic
  if (errorRate > 0.9 || budgetFraction >= 1.0) {
    targetLevel = 4;
  }
  // Level 3: severe
  else if (errorRate > 0.7 || budgetFraction > 0.95 || avgLatencyMs > 15_000) {
    targetLevel = 3;
  }
  // Level 2: high pressure
  else if (errorRate > 0.4 || budgetFraction > 0.85 || memoryPressure > 0.9) {
    targetLevel = 2;
  }
  // Level 1: moderate pressure
  else if (errorRate > 0.2 || budgetFraction > 0.75 || avgLatencyMs > 8_000) {
    targetLevel = 1;
  }

  if (targetLevel !== state.level) {
    const reason = `Auto-escalation: errorRate=${errorRate.toFixed(2)} budget=${(budgetFraction * 100).toFixed(0)}% latency=${avgLatencyMs}ms`;
    setDegradationLevel(targetLevel, reason);
  }

  return state.level;
}

/**
 * Get the current degradation level (0–4).
 */
export function getDegradationLevel(): DegradationLevel {
  return state.level;
}

/**
 * Get the full config for the current degradation level.
 */
export function getDegradationConfig(): DegradationConfig {
  return DEGRADATION_CONFIGS[state.level];
}

/**
 * Manually set the degradation level (admin override).
 */
export function setDegradationLevel(level: DegradationLevel, reason: string): void {
  const prev = state.level;
  state.level = level;
  state.reason = reason;
  state.activatedAt = level > 0 ? new Date().toISOString() : null;

  if (level !== prev) {
    state.escalationHistory.push({
      level,
      reason,
      timestamp: new Date().toISOString(),
    });
    // Keep last 50 events
    if (state.escalationHistory.length > 50) {
      state.escalationHistory.splice(0, state.escalationHistory.length - 50);
    }
  }
}

/**
 * Set a manual override (prevents auto-evaluation from changing the level).
 */
export function setManualOverride(level: DegradationLevel, reason: string): void {
  state.manualOverride = true;
  setDegradationLevel(level, `[MANUAL] ${reason}`);
}

/**
 * Clear the manual override (resume auto-evaluation).
 */
export function clearManualOverride(): void {
  state.manualOverride = false;
  state.reason = "Manual override cleared — auto-evaluation resumed";
}

/**
 * Full observability snapshot for the admin dashboard.
 */
export function getDegradationSnapshot(): {
  level: DegradationLevel;
  config: DegradationConfig;
  manualOverride: boolean;
  reason: string;
  activatedAt: string | null;
  recentHistory: DegradationState["escalationHistory"];
} {
  return {
    level: state.level,
    config: getDegradationConfig(),
    manualOverride: state.manualOverride,
    reason: state.reason,
    activatedAt: state.activatedAt,
    recentHistory: [...state.escalationHistory].slice(-10),
  };
}

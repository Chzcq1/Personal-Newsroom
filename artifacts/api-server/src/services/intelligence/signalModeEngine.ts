// ============================================================
// SIGNAL MODE ENGINE — Sprint 16 Task A
//
// Defines 3 intelligence modes that globally control:
//   - Feed ranking thresholds
//   - Telegram delivery filtering
//   - Alert engine sensitivity
//   - Signal acceptance criteria
//
// Modes:
//   SAFE    — multi-source confirmation, low noise, slower
//   BALANCED — default; moderate verification + moderate speed
//   RAW     — prioritise speed, tolerate partial confirmation
//             optimised for traders / analysts
//
// Persisted in-memory with localStorage sync on frontend.
// Architecture: pure functions + singleton state store.
// ============================================================

export type SignalMode = "safe" | "balanced" | "raw";

export interface SignalModeConfig {
  id: SignalMode;
  label: string;
  tagline: string;
  description: string;
  riskLevel: "low" | "moderate" | "high";
  speed: "slow" | "moderate" | "fast";
  // Thresholds applied to the priority ranking pipeline
  minConfirmingSources: number;    // minimum sources confirming a story
  minPriorityScore: number;        // minimum total priority score (0–150)
  allowExperimentalSignals: boolean;
  noiseToleranceMultiplier: number; // 1.0 = baseline; <1 = stricter; >1 = looser
  // Delivery behaviour
  maxArticlesPerBriefing: number;
  requireMultiSourceForAlert: boolean;
  // Visual
  badgeColor: string;              // Tailwind color name for UI badge
  icon: string;                    // Lucide icon name
}

// ── Mode definitions ──────────────────────────────────────────

export const SIGNAL_MODES: Record<SignalMode, SignalModeConfig> = {
  safe: {
    id: "safe",
    label: "Safe Mode",
    tagline: "Verified intelligence only",
    description:
      "Only delivers highly confirmed signals with multi-source verification. " +
      "Slower but reliable — best for long-term investors and decision-makers who " +
      "cannot afford to act on unverified information.",
    riskLevel: "low",
    speed: "slow",
    minConfirmingSources: 2,
    minPriorityScore: 60,
    allowExperimentalSignals: false,
    noiseToleranceMultiplier: 0.7,
    maxArticlesPerBriefing: 5,
    requireMultiSourceForAlert: true,
    badgeColor: "emerald",
    icon: "shield-check",
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    tagline: "Default intelligence mode",
    description:
      "Moderate verification with moderate speed. This is the default setting — " +
      "it balances freshness against reliability and works well for most users " +
      "following markets, technology, and global news.",
    riskLevel: "moderate",
    speed: "moderate",
    minConfirmingSources: 1,
    minPriorityScore: 40,
    allowExperimentalSignals: false,
    noiseToleranceMultiplier: 1.0,
    maxArticlesPerBriefing: 8,
    requireMultiSourceForAlert: false,
    badgeColor: "blue",
    icon: "sliders",
  },
  raw: {
    id: "raw",
    label: "Raw Signal",
    tagline: "Maximum speed, early access",
    description:
      "Prioritises speed and emerging signals. Tolerates partial source confirmation. " +
      "Best for traders, analysts, and researchers who want first-mover advantage " +
      "and are comfortable filtering noise themselves.",
    riskLevel: "high",
    speed: "fast",
    minConfirmingSources: 0,
    minPriorityScore: 20,
    allowExperimentalSignals: true,
    noiseToleranceMultiplier: 1.5,
    maxArticlesPerBriefing: 12,
    requireMultiSourceForAlert: false,
    badgeColor: "amber",
    icon: "zap",
  },
};

// ── In-memory state ───────────────────────────────────────────

let _currentMode: SignalMode = "balanced";

export function getSignalMode(): SignalMode {
  return _currentMode;
}

export function getSignalModeConfig(): SignalModeConfig {
  return SIGNAL_MODES[_currentMode];
}

export function setSignalMode(mode: SignalMode): void {
  if (!SIGNAL_MODES[mode]) {
    throw new Error(`Unknown signal mode: "${mode}"`);
  }
  _currentMode = mode;
}

// ── Mode application helpers ──────────────────────────────────

/**
 * Returns true if an article passes the signal mode's minimum priority threshold.
 * Used by newsCollectorService and deliveryEngine.
 */
export function passesSignalModeFilter(priorityScore: number): boolean {
  const config = getSignalModeConfig();
  return priorityScore >= config.minPriorityScore;
}

/**
 * Returns true if an alert should fire given the current mode's confirmation requirements.
 */
export function alertPassesSignalMode(sourceCount: number): boolean {
  const config = getSignalModeConfig();
  if (config.requireMultiSourceForAlert) {
    return sourceCount >= 2;
  }
  return sourceCount >= 1;
}

/**
 * Adjusts a noise suppression threshold based on current mode.
 * SAFE mode makes suppression stricter (lower threshold = remove more articles).
 * RAW mode makes it looser.
 */
export function adjustedSuppressionThreshold(baseThreshold: number): number {
  const config = getSignalModeConfig();
  return Math.round(baseThreshold / config.noiseToleranceMultiplier);
}

/**
 * Returns max article count for a briefing in current mode.
 */
export function maxBriefingArticles(): number {
  return getSignalModeConfig().maxArticlesPerBriefing;
}

/**
 * Returns all mode configs for the settings UI.
 */
export function getAllSignalModes(): SignalModeConfig[] {
  return Object.values(SIGNAL_MODES);
}

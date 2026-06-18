// ============================================================
// TREND MOMENTUM ENGINE
// Sprint 28 — Product Realignment
//
// Calculates how fast a trend is accelerating.
// Momentum is the CORE ranking signal — not just freshness.
// ============================================================

import type { TrendEntity } from "./trendNormalizer.js";

export type MomentumLabel = "exploding" | "rising" | "stable" | "fading";

export interface MomentumScore {
  label: MomentumLabel;
  velocity: number;       // signals/hour in recent window
  acceleration: number;   // velocity change vs previous window (positive = speeding up)
  score: number;          // 0-100 composite momentum score
  hook: string;           // human-readable hook for the feed card
}

// ── In-memory signal history for velocity calculation ─────────
// Tracks when we've seen a topic/keyword to compute velocity.

interface SignalHistoryEntry {
  topicKey: string;
  seenAt: Date;
  score: number;
}

const signalHistory: SignalHistoryEntry[] = [];
const MAX_HISTORY = 2_000;
const HISTORY_WINDOW_HOURS = 24;

export function recordSignalSeen(topicKey: string, score: number): void {
  signalHistory.push({ topicKey, seenAt: new Date(), score });
  // Trim old entries
  const cutoff = Date.now() - HISTORY_WINDOW_HOURS * 60 * 60 * 1_000;
  while (signalHistory.length > 0 && signalHistory[0].seenAt.getTime() < cutoff) {
    signalHistory.shift();
  }
  if (signalHistory.length > MAX_HISTORY) {
    signalHistory.splice(0, signalHistory.length - MAX_HISTORY);
  }
}

function countInWindow(topicKey: string, windowStart: Date): number {
  return signalHistory.filter(
    (e) => e.topicKey === topicKey && e.seenAt >= windowStart,
  ).length;
}

// ── Velocity calculation ──────────────────────────────────────

export function calculateVelocity(topicKey: string): {
  recent: number;   // count in last 1 hour
  prior: number;    // count in prior 1 hour (1-2 hours ago)
} {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1_000);
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1_000);

  return {
    recent: countInWindow(topicKey, oneHourAgo),
    prior: countInWindow(topicKey, twoHoursAgo) - countInWindow(topicKey, oneHourAgo),
  };
}

// ── Momentum scoring ──────────────────────────────────────────

const HOOK_TEMPLATES: Record<MomentumLabel, string[]> = {
  exploding: [
    "ทุกคนกำลังพูดถึงสิ่งนี้",
    "เทรนด์นี้ระเบิดในช่วงชั่วโมงที่ผ่านมา",
    "กระแสนี้กำลังแพร่กระจายอย่างรวดเร็ว",
  ],
  rising: [
    "ความสนใจกำลังเพิ่มขึ้นเรื่อยๆ",
    "เทรนด์นี้กำลังขยายตัว",
    "สัญญาณเริ่มแรงขึ้น",
  ],
  stable: [
    "ยังคงอยู่ในความสนใจของคนทั่วไป",
    "ข่าวนี้ยังคงสำคัญ",
  ],
  fading: [
    "ความสนใจกำลังลดลง",
    "เทรนด์นี้เริ่มเงียบลง",
  ],
};

function pickHook(label: MomentumLabel, seed: string): string {
  const hooks = HOOK_TEMPLATES[label];
  // Deterministic pick based on seed
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return hooks[hash % hooks.length];
}

export function scoreMomentum(
  topicKey: string,
  baseScore: number = 50,
): MomentumScore {
  const { recent, prior } = calculateVelocity(topicKey);
  const acceleration = recent - prior;

  // Composite score: base + velocity bonus + acceleration bonus
  const velocityBonus = Math.min(30, recent * 3);
  const accelBonus = Math.min(20, acceleration * 5);
  const score = Math.max(0, Math.min(100, baseScore * 0.5 + velocityBonus + accelBonus));

  let label: MomentumLabel;
  if (score >= 75) label = "exploding";
  else if (score >= 50) label = "rising";
  else if (score >= 25) label = "stable";
  else label = "fading";

  return {
    label,
    velocity: recent,
    acceleration,
    score,
    hook: pickHook(label, topicKey),
  };
}

// ── Batch momentum scoring for feed items ────────────────────

export function scoreMomentumBatch(
  entities: TrendEntity[],
): Map<string, MomentumScore> {
  const result = new Map<string, MomentumScore>();

  // Group entities by topic/keyword for velocity
  for (const entity of entities) {
    const key = entity.tags[0] ?? entity.platform;
    // Record that we've seen this signal (for future velocity)
    recordSignalSeen(key, entity.normalizedScore);
  }

  // Now score each entity's momentum
  for (const entity of entities) {
    const key = entity.tags[0] ?? entity.platform;
    result.set(entity.id, scoreMomentum(key, entity.normalizedScore));
  }

  return result;
}

// ── English momentum labels for API responses ─────────────────

export const MOMENTUM_DISPLAY: Record<MomentumLabel, { emoji: string; label: string; color: string }> = {
  exploding: { emoji: "🔥", label: "Exploding",  color: "text-orange-400" },
  rising:    { emoji: "📈", label: "Rising",     color: "text-emerald-400" },
  stable:    { emoji: "➡️", label: "Stable",     color: "text-white/40" },
  fading:    { emoji: "📉", label: "Fading",     color: "text-white/25" },
};

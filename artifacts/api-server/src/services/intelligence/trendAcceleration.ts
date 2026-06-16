// ============================================================
// TREND ACCELERATION ENGINE — Sprint 11 Task A
//
// Detects narrative acceleration, deceleration, and emergence.
//
// Classifications:
//   Emerging   — new narrative, < 6h old, < 3 sources
//   Accelerating — mentions velocity rising > 50% vs prior window
//   Peak         — max velocity reached, growth plateauing
//   Declining    — velocity falling > 30% vs prior window
//   Dormant      — no activity for > 48h
//
// Momentum score: 0-100
//   0-20  = dormant/declining
//   20-40 = stable/slow
//   40-60 = emerging/growing
//   60-80 = accelerating
//   80-100 = peak acceleration
//
// Key algorithm:
//   Velocity = mentions/hour in window W
//   Acceleration = (velocity_W - velocity_W-1) / velocity_W-1
//   Momentum = f(velocity, acceleration, sourceSpread, entityDensity)
// ============================================================

import type { NarrativeThread } from "./narrativeMemory.js";
import type { EntityMemoryEntry } from "./entityMemory.js";

export type TrendClassification =
  | "emerging"
  | "accelerating"
  | "peak"
  | "declining"
  | "dormant";

export interface TrendVelocity {
  mentionsPerHour: number;       // mentions in the most recent window
  prevMentionsPerHour: number;   // mentions in prior window
  acceleration: number;          // normalised delta (-1.0 to +inf)
  windowHours: number;           // window size used
}

export interface NarrativeTrend {
  narrativeId: string;
  canonicalHeadline: string;
  classification: TrendClassification;
  momentumScore: number;          // 0-100
  velocity: TrendVelocity;
  sourceSpread: number;           // unique sources in last 24h
  entityDensity: number;          // related entities count
  dominantEntity: string | null;
  isEarlySignal: boolean;         // true if new + multi-source
  detectedAt: string;
  peakMomentumAt: string | null;  // when momentum was highest
}

export interface EntityTrend {
  entityId: string;
  label: string;
  classification: TrendClassification;
  momentumScore: number;
  velocity: TrendVelocity;
  narrativeCount: number;          // narratives this entity appears in
  detectedAt: string;
}

export interface TrendSummary {
  topAccelerating: NarrativeTrend[];
  emerging: NarrativeTrend[];
  peaking: NarrativeTrend[];
  declining: NarrativeTrend[];
  entityTrends: EntityTrend[];
  systemMomentum: number;          // overall feed momentum (0-100)
  generatedAt: string;
}

// ── State ────────────────────────────────────────────────────
// Window-based mention timestamps per narrative
// narrativeId → sorted array of mention timestamps (ms)
const mentionWindows = new Map<string, number[]>();

// Peak momentum tracker: narrativeId → {score, timestamp}
const peakMomentum = new Map<string, { score: number; at: number }>();

// ── Configuration ─────────────────────────────────────────────
const WINDOW_HOURS = 6;         // primary comparison window
const WINDOW_MS = WINDOW_HOURS * 3_600_000;
const MAX_WINDOW_ENTRIES = 500; // per narrative

// ── Core calculation ──────────────────────────────────────────

function calcVelocity(timestamps: number[]): TrendVelocity {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const prevWindowStart = now - WINDOW_MS * 2;

  const recent = timestamps.filter((t) => t >= windowStart).length;
  const prior = timestamps.filter((t) => t >= prevWindowStart && t < windowStart).length;

  const mentionsPerHour = recent / WINDOW_HOURS;
  const prevMentionsPerHour = prior / WINDOW_HOURS;

  let acceleration = 0;
  if (prevMentionsPerHour > 0) {
    acceleration = (mentionsPerHour - prevMentionsPerHour) / prevMentionsPerHour;
  } else if (mentionsPerHour > 0) {
    acceleration = 1.0; // new activity from zero
  }

  return { mentionsPerHour, prevMentionsPerHour, acceleration, windowHours: WINDOW_HOURS };
}

function classify(
  velocity: TrendVelocity,
  ageMs: number,
  sourceSpread: number,
): TrendClassification {
  const ageHours = ageMs / 3_600_000;
  const { mentionsPerHour, acceleration } = velocity;

  if (ageHours < 6 && mentionsPerHour === 0 && sourceSpread < 2) return "emerging";
  if (mentionsPerHour === 0 && ageHours > 48) return "dormant";
  if (acceleration > 0.5) return "accelerating";
  if (acceleration < -0.3 && ageHours > 12) return "declining";
  // Detect peak: was accelerating, now flat or slightly declining
  if (acceleration > -0.1 && acceleration < 0.2 && mentionsPerHour > 0.5) return "peak";
  if (ageHours < 12) return "emerging";
  return "declining";
}

function calcMomentumScore(
  velocity: TrendVelocity,
  classification: TrendClassification,
  sourceSpread: number,
  entityDensity: number,
): number {
  const { mentionsPerHour, acceleration } = velocity;

  // Base from velocity (0–60)
  const velocityScore = Math.min(60, mentionsPerHour * 10);

  // Acceleration contribution (0–25)
  const accelScore = Math.min(25, Math.max(0, acceleration * 20));

  // Source diversity bonus (0–10)
  const sourceScore = Math.min(10, sourceSpread * 2);

  // Entity richness bonus (0–5)
  const entityScore = Math.min(5, entityDensity * 0.5);

  let raw = velocityScore + accelScore + sourceScore + entityScore;

  // Dampen dormant/declining
  if (classification === "dormant") raw *= 0.1;
  if (classification === "declining") raw *= 0.5;

  return Math.round(Math.min(100, Math.max(0, raw)));
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Record a mention of a narrative. Called during feed processing.
 */
export function recordNarrativeMention(narrativeId: string, timestamp?: number): void {
  const ts = timestamp ?? Date.now();
  const existing = mentionWindows.get(narrativeId) ?? [];
  existing.push(ts);

  // Keep ring buffer
  const trimmed = existing.length > MAX_WINDOW_ENTRIES
    ? existing.slice(-MAX_WINDOW_ENTRIES)
    : existing;
  mentionWindows.set(narrativeId, trimmed);
}

/**
 * Compute trend data for a single NarrativeThread.
 */
export function computeNarrativeTrend(thread: NarrativeThread): NarrativeTrend {
  const timestamps = mentionWindows.get(thread.id) ?? [];
  const velocity = calcVelocity(timestamps);
  const ageMs = Date.now() - new Date(thread.firstSeen).getTime();
  const classification = classify(velocity, ageMs, thread.relatedEntities.length);

  const entityDensity = (thread.relatedEntities ?? []).length;

  // For sourceSpread, count distinct sources in recent developments (last 24h)
  const recentDevSources = new Set<string>();
  const cutoff = Date.now() - 86_400_000;
  for (const dev of thread.developments ?? []) {
    if (new Date(dev.recordedAt).getTime() >= cutoff) {
      dev.sources.forEach((s) => recentDevSources.add(s));
    }
  }

  const momentumScore = calcMomentumScore(velocity, classification, recentDevSources.size, entityDensity);

  // Track peak
  const existing = peakMomentum.get(thread.id);
  let peakMomentumAt: string | null = null;
  if (!existing || momentumScore > existing.score) {
    peakMomentum.set(thread.id, { score: momentumScore, at: Date.now() });
    if (existing) peakMomentumAt = new Date().toISOString();
  } else {
    peakMomentumAt = existing ? new Date(existing.at).toISOString() : null;
  }

  return {
    narrativeId: thread.id,
    canonicalHeadline: thread.canonicalHeadline,
    classification,
    momentumScore,
    velocity,
    sourceSpread: recentDevSources.size,
    entityDensity,
    dominantEntity: thread.dominantEntity,
    isEarlySignal: ageMs < 6 * 3_600_000 && recentDevSources.size >= 2,
    detectedAt: thread.firstSeen,
    peakMomentumAt,
  };
}

/**
 * Compute trend for an entity.
 */
export function computeEntityTrend(
  entity: EntityMemoryEntry,
  narrativeCount: number,
): EntityTrend {
  // Reconstruct timestamps from mentionsLast24h/7d as approximation
  const now = Date.now();
  const syntheticTimestamps: number[] = [];

  // Distribute mentions over 24h window for velocity calculation
  for (let i = 0; i < entity.mentionsLast24h; i++) {
    syntheticTimestamps.push(now - Math.random() * 86_400_000);
  }
  const prior7d = entity.mentionsLast7d - entity.mentionsLast24h;
  for (let i = 0; i < prior7d; i++) {
    syntheticTimestamps.push(now - 86_400_000 - Math.random() * (6 * 86_400_000));
  }
  syntheticTimestamps.sort();

  const velocity = calcVelocity(syntheticTimestamps);
  const ageMs = Date.now() - new Date(entity.firstSeen).getTime();
  const classification = classify(velocity, ageMs, narrativeCount);
  const momentumScore = calcMomentumScore(velocity, classification, narrativeCount, narrativeCount);

  return {
    entityId: entity.entityId,
    label: entity.label,
    classification,
    momentumScore,
    velocity,
    narrativeCount,
    detectedAt: entity.firstSeen,
  };
}

/**
 * Build full trend summary from narrative threads + entity memory.
 */
export function buildTrendSummary(
  threads: NarrativeThread[],
  entities: EntityMemoryEntry[],
  entityNarrativeCounts: Map<string, number>,
): TrendSummary {
  const narrativeTrends = threads.map(computeNarrativeTrend).sort(
    (a, b) => b.momentumScore - a.momentumScore,
  );

  const entityTrends = entities.map((e) =>
    computeEntityTrend(e, entityNarrativeCounts.get(e.entityId) ?? 0),
  ).sort((a, b) => b.momentumScore - a.momentumScore);

  const topAccelerating = narrativeTrends
    .filter((t) => t.classification === "accelerating")
    .slice(0, 5);

  const emerging = narrativeTrends
    .filter((t) => t.classification === "emerging")
    .slice(0, 5);

  const peaking = narrativeTrends
    .filter((t) => t.classification === "peak")
    .slice(0, 5);

  const declining = narrativeTrends
    .filter((t) => t.classification === "declining")
    .slice(0, 5);

  // System momentum = avg of top-5 narrative momentum scores
  const top5Scores = narrativeTrends.slice(0, 5).map((t) => t.momentumScore);
  const systemMomentum = top5Scores.length > 0
    ? Math.round(top5Scores.reduce((a, b) => a + b, 0) / top5Scores.length)
    : 0;

  return {
    topAccelerating,
    emerging,
    peaking,
    declining,
    entityTrends: entityTrends.slice(0, 20),
    systemMomentum,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get all trend data for API response.
 */
export function getAllTrends(): Map<string, number[]> {
  return new Map(mentionWindows);
}

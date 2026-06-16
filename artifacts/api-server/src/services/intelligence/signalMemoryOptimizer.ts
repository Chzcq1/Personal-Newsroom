// ============================================================
// SIGNAL MEMORY OPTIMIZER — Sprint 18 Task I
//
// Keeps long-term narrative memory efficient and meaningful.
// Without this, memory grows endlessly and degrades.
//
// Strategies:
//   - Narrative aging (importance decays over time)
//   - Strategic retention (important narratives never age out)
//   - Memory compression (merge similar narratives)
//   - Duplicate narrative fusion
//   - Dormant signal archival
//   - Hot signal prioritization
// ============================================================

import { logger } from "../../lib/logger.js";
import {
  getActiveNarratives,
  getPersistentNarratives,
  type NarrativeThread,
} from "./narrativeMemory.js";

// ── Memory health types ───────────────────────────────────────

export type MemoryHealthStatus =
  | "healthy"     // <200 narratives, no stale entries
  | "degraded"    // 200–400 narratives or >20% stale
  | "critical"    // >400 narratives or >50% stale
  | "overflow";   // >600 narratives — emergency compression needed

export interface MemoryHealthReport {
  status: MemoryHealthStatus;
  totalNarratives: number;
  activeCount: number;
  dormantCount: number;
  staleDuplicateCount: number;
  hotSignalCount: number;
  oldestNarrativeAgeDays: number;
  compressionRecommended: boolean;
  archivalRecommended: boolean;
  estimatedMemorySavingPct: number;
}

export interface NarrativeAgeResult {
  narrativeId: string;
  headline: string;
  ageScore: number;         // 0–100: higher = older/more stale
  shouldArchive: boolean;
  shouldCompress: boolean;
  decayReason: string;
}

export interface CompressionResult {
  originalCount: number;
  compressedCount: number;
  archivedCount: number;
  mergedCount: number;
  memorySavedPct: number;
  operations: CompressionOperation[];
}

export interface CompressionOperation {
  type: "archive" | "merge" | "prune" | "retain";
  narrativeId: string;
  reason: string;
  targetId?: string;  // For merge operations
}

// ── Strategic retention criteria ──────────────────────────────
// These narratives are NEVER archived regardless of age

const STRATEGIC_RETENTION_KEYWORDS = [
  // High-stakes geopolitics
  "war", "conflict", "nuclear", "crisis", "sanction",
  "election", "president", "government",
  // Major market events
  "recession", "crash", "fed", "rate", "inflation",
  "ipo", "merger", "acquisition",
  // Tech milestones
  "agi", "breakthrough", "ban", "regulation",
  "openai", "nvidia", "tesla",
  // Thai keywords
  "วิกฤต", "สงคราม", "เลือกตั้ง", "เศรษฐกิจ",
  "ตลาดหุ้น", "อัตราดอกเบี้ย", "ภาวะถดถอย",
];

function isStrategicallyImportant(narrative: NarrativeThread): boolean {
  const text = `${narrative.canonicalHeadline} ${narrative.theme} ${(narrative.relatedEntities ?? []).join(" ")}`.toLowerCase();
  return STRATEGIC_RETENTION_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

// ── Age scoring ───────────────────────────────────────────────

function computeAgeScore(narrative: NarrativeThread): number {
  const now = Date.now();
  const lastSeenMs = new Date(narrative.lastSeen).getTime();
  const firstSeenMs = new Date(narrative.firstSeen).getTime();

  const ageHours = (now - lastSeenMs) / (1000 * 60 * 60);
  const lifespanDays = (now - firstSeenMs) / (1000 * 60 * 60 * 24);

  let score = 0;

  // Time since last seen
  if (ageHours > 168) score += 40;  // > 7 days
  else if (ageHours > 72) score += 25;  // > 3 days
  else if (ageHours > 24) score += 10;  // > 1 day

  // Maturity penalty (resolved/declining narratives age faster)
  if (narrative.maturity === "resolved") score += 30;
  else if (narrative.maturity === "declining") score += 20;
  else if (narrative.maturity === "peaking") score += 5;

  // Low mention count
  if (narrative.totalMentions < 3) score += 15;

  // Long lifespan without recent activity
  if (lifespanDays > 14 && ageHours > 48) score += 20;

  // Low signal score
  if (narrative.avgScore < 20) score += 10;

  return Math.min(100, score);
}

// ── Duplicate detection ────────────────────────────────────────

function narrativeSimilarity(a: NarrativeThread, b: NarrativeThread): number {
  const aWords = new Set(
    `${a.canonicalHeadline} ${a.theme}`.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );
  const bWords = new Set(
    `${b.canonicalHeadline} ${b.theme}`.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );

  if (aWords.size === 0 || bWords.size === 0) return 0;

  const intersection = new Set([...aWords].filter((w) => bWords.has(w)));
  const union = new Set([...aWords, ...bWords]);
  return intersection.size / union.size; // Jaccard similarity
}

// ── Main optimization functions ────────────────────────────────

export function analyzeMemoryHealth(): MemoryHealthReport {
  const all = getPersistentNarratives();
  const active = getActiveNarratives(999);

  const now = Date.now();
  let dormantCount = 0;
  let staleDuplicateCount = 0;
  let hotSignalCount = 0;
  let oldestAgeMs = 0;

  for (const n of all) {
    const ageHours = (now - new Date(n.lastSeen).getTime()) / (1000 * 60 * 60);
    if (ageHours > 72) dormantCount++;
    if (n.mentionsLast24h >= 5) hotSignalCount++;
    const ageMs = now - new Date(n.firstSeen).getTime();
    if (ageMs > oldestAgeMs) oldestAgeMs = ageMs;
  }

  // Count near-duplicates
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (narrativeSimilarity(all[i], all[j]) > 0.7) {
        staleDuplicateCount++;
        break;
      }
    }
  }

  const totalCount = all.length;
  let status: MemoryHealthStatus;
  if (totalCount > 600) status = "overflow";
  else if (totalCount > 400 || dormantCount / Math.max(totalCount, 1) > 0.5) status = "critical";
  else if (totalCount > 200 || dormantCount / Math.max(totalCount, 1) > 0.2) status = "degraded";
  else status = "healthy";

  const estimatedSavingPct =
    totalCount > 0
      ? Math.round(((dormantCount + staleDuplicateCount) / totalCount) * 100)
      : 0;

  return {
    status,
    totalNarratives: totalCount,
    activeCount: active.length,
    dormantCount,
    staleDuplicateCount,
    hotSignalCount,
    oldestNarrativeAgeDays: Math.round(oldestAgeMs / (1000 * 60 * 60 * 24)),
    compressionRecommended: staleDuplicateCount > 5 || status === "critical",
    archivalRecommended: dormantCount > 20 || status === "overflow",
    estimatedMemorySavingPct: estimatedSavingPct,
  };
}

export function scoreNarrativesForAging(): NarrativeAgeResult[] {
  const all = getPersistentNarratives();
  return all.map((n) => {
    const ageScore = computeAgeScore(n);
    const strategic = isStrategicallyImportant(n);

    let shouldArchive = false;
    let shouldCompress = false;
    let decayReason = "healthy";

    if (strategic) {
      decayReason = "strategic_retention";
    } else if (ageScore >= 70) {
      shouldArchive = true;
      decayReason = "high_age_score: " + ageScore;
    } else if (ageScore >= 40) {
      shouldCompress = true;
      decayReason = "medium_age_score: " + ageScore;
    }

    return {
      narrativeId: n.id,
      headline: n.canonicalHeadline,
      ageScore,
      shouldArchive,
      shouldCompress,
      decayReason,
    };
  });
}

export function getHotSignals(limit = 10): NarrativeThread[] {
  const all = getPersistentNarratives();
  return all
    .filter((n) => n.mentionsLast24h >= 3 || n.trendAcceleration > 0.5)
    .sort(
      (a, b) =>
        b.mentionsLast24h + b.trendAcceleration * 5 -
        (a.mentionsLast24h + a.trendAcceleration * 5)
    )
    .slice(0, limit);
}

export function getDormantSignals(ageThresholdHours = 72): NarrativeThread[] {
  const all = getPersistentNarratives();
  const cutoff = Date.now() - ageThresholdHours * 60 * 60 * 1000;
  return all
    .filter((n) => {
      const lastSeen = new Date(n.lastSeen).getTime();
      return lastSeen < cutoff && !isStrategicallyImportant(n);
    })
    .sort((a, b) => new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime());
}

export function planCompression(): CompressionResult {
  const all = getPersistentNarratives();
  const operations: CompressionOperation[] = [];
  let archived = 0;
  let merged = 0;

  const ageResults = scoreNarrativesForAging();
  const toArchive = ageResults.filter((r) => r.shouldArchive);
  const toCompress = ageResults.filter((r) => r.shouldCompress);

  // Archive dormant
  for (const r of toArchive) {
    operations.push({
      type: "archive",
      narrativeId: r.narrativeId,
      reason: r.decayReason,
    });
    archived++;
  }

  // Find merge candidates
  const compressNarratives = all.filter((n) =>
    toCompress.some((r) => r.narrativeId === n.id)
  );

  const merged_ids = new Set<string>();
  for (let i = 0; i < compressNarratives.length; i++) {
    if (merged_ids.has(compressNarratives[i].id)) continue;
    for (let j = i + 1; j < compressNarratives.length; j++) {
      if (merged_ids.has(compressNarratives[j].id)) continue;
      const sim = narrativeSimilarity(compressNarratives[i], compressNarratives[j]);
      if (sim > 0.65) {
        operations.push({
          type: "merge",
          narrativeId: compressNarratives[j].id,
          reason: `Similarity ${(sim * 100).toFixed(0)}% with ${compressNarratives[i].id}`,
          targetId: compressNarratives[i].id,
        });
        merged_ids.add(compressNarratives[j].id);
        merged++;
      }
    }
  }

  const memorySavedPct = all.length > 0
    ? Math.round(((archived + merged) / all.length) * 100)
    : 0;

  logger.info(
    { archived, merged, memorySavedPct },
    "[SignalMemory] Compression plan computed"
  );

  return {
    originalCount: all.length,
    compressedCount: all.length - archived - merged,
    archivedCount: archived,
    mergedCount: merged,
    memorySavedPct,
    operations,
  };
}

export function getMemoryOptimizationReport(): {
  health: MemoryHealthReport;
  hotSignals: { id: string; headline: string; mentions24h: number }[];
  dormantCount: number;
  compressionPlan: CompressionResult;
} {
  const health = analyzeMemoryHealth();
  const hot = getHotSignals(5);
  const dormant = getDormantSignals();
  const plan = health.compressionRecommended || health.archivalRecommended
    ? planCompression()
    : { originalCount: health.totalNarratives, compressedCount: health.totalNarratives, archivedCount: 0, mergedCount: 0, memorySavedPct: 0, operations: [] };

  return {
    health,
    hotSignals: hot.map((n) => ({
      id: n.id,
      headline: n.canonicalHeadline,
      mentions24h: n.mentionsLast24h,
    })),
    dormantCount: dormant.length,
    compressionPlan: plan,
  };
}

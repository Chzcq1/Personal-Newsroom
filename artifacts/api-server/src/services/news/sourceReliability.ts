// ============================================================
// SOURCE RELIABILITY ENGINE — Sprint 12 Task E
//
// Tracks per-source quality signals across deliveries:
//   - Feed stability (parse success rate)
//   - Article quality (description length, signal score)
//   - Parse success rate
//   - Duplication frequency
//   - Signal quality distribution
//
// Automatically down-ranks unreliable sources by adjusting
// their effective tier bonus for signal scoring.
//
// Storage: in-memory ring buffer per source (max 200 events/source).
// Reset on server restart — persistence is a post-auth concern.
// ============================================================

import { logger } from "../../lib/logger.js";

// ── Types ─────────────────────────────────────────────────────

export interface SourceEvent {
  type: "fetch_success" | "fetch_failure" | "parse_error" | "duplicate" | "quality_good" | "quality_poor";
  recordedAt: string;
  detail?: string;
}

export interface SourceReliabilityRecord {
  sourceName: string;
  events: SourceEvent[];
  // Computed
  parseSuccessRate: number;   // 0–1
  duplicateRate: number;      // 0–1
  qualityRate: number;        // 0–1 (good / total quality events)
  reliabilityScore: number;   // 0–100 composite
  reliabilityTier: "reliable" | "unstable" | "poor";
  effectivePenalty: number;   // penalty subtracted from signal score bonus
  lastEventAt: string;
  totalEvents: number;
}

const MAX_EVENTS_PER_SOURCE = 200;

// ── In-memory store ───────────────────────────────────────────

const sourceStore = new Map<string, SourceEvent[]>();

// ── Event recording ───────────────────────────────────────────

export function recordSourceEvent(
  sourceName: string,
  type: SourceEvent["type"],
  detail?: string,
): void {
  if (!sourceStore.has(sourceName)) {
    sourceStore.set(sourceName, []);
  }
  const events = sourceStore.get(sourceName)!;
  events.push({ type, recordedAt: new Date().toISOString(), detail });

  // Ring buffer
  if (events.length > MAX_EVENTS_PER_SOURCE) {
    events.shift();
  }
}

// ── Reliability calculation ───────────────────────────────────

export function getSourceReliability(sourceName: string): SourceReliabilityRecord {
  const events = sourceStore.get(sourceName) ?? [];
  const total = events.length;

  if (total === 0) {
    return {
      sourceName,
      events: [],
      parseSuccessRate: 1,
      duplicateRate: 0,
      qualityRate: 1,
      reliabilityScore: 75,
      reliabilityTier: "reliable",
      effectivePenalty: 0,
      lastEventAt: "",
      totalEvents: 0,
    };
  }

  const fetches = events.filter((e) => e.type === "fetch_success" || e.type === "fetch_failure" || e.type === "parse_error");
  const successes = events.filter((e) => e.type === "fetch_success").length;
  const parseSuccessRate = fetches.length > 0 ? successes / fetches.length : 1;

  const dupeEvents = events.filter((e) => e.type === "duplicate").length;
  const duplicateRate = total > 0 ? dupeEvents / total : 0;

  const qualityEvents = events.filter((e) => e.type === "quality_good" || e.type === "quality_poor");
  const goodQuality = events.filter((e) => e.type === "quality_good").length;
  const qualityRate = qualityEvents.length > 0 ? goodQuality / qualityEvents.length : 0.8;

  // Composite reliability score (0–100)
  const reliabilityScore = Math.round(
    parseSuccessRate * 50 +       // 50% weight on parse success
    (1 - duplicateRate) * 25 +    // 25% weight on low duplication
    qualityRate * 25              // 25% weight on content quality
  );

  const reliabilityTier: SourceReliabilityRecord["reliabilityTier"] =
    reliabilityScore >= 70 ? "reliable" :
    reliabilityScore >= 45 ? "unstable" :
    "poor";

  // Penalty applied to signal score for poor sources
  const effectivePenalty =
    reliabilityTier === "poor" ? 20 :
    reliabilityTier === "unstable" ? 8 :
    0;

  return {
    sourceName,
    events: events.slice(-10), // return only last 10 for API response
    parseSuccessRate: Math.round(parseSuccessRate * 100) / 100,
    duplicateRate: Math.round(duplicateRate * 100) / 100,
    qualityRate: Math.round(qualityRate * 100) / 100,
    reliabilityScore,
    reliabilityTier,
    effectivePenalty,
    lastEventAt: events[events.length - 1]?.recordedAt ?? "",
    totalEvents: total,
  };
}

// ── Batch reliability lookup ──────────────────────────────────

export function getAllSourceReliability(): SourceReliabilityRecord[] {
  const results: SourceReliabilityRecord[] = [];
  for (const [name] of sourceStore) {
    results.push(getSourceReliability(name));
  }
  return results.sort((a, b) => a.reliabilityScore - b.reliabilityScore);
}

export function getSourcePenalty(sourceName: string): number {
  return getSourceReliability(sourceName).effectivePenalty;
}

// ── Batch recording from RSS fetch results ────────────────────

export function recordFeedFetchResult(
  sourceName: string,
  success: boolean,
  articleCount: number,
  detail?: string,
): void {
  if (success) {
    recordSourceEvent(sourceName, "fetch_success", `articles: ${articleCount}`);
    if (articleCount === 0) {
      recordSourceEvent(sourceName, "quality_poor", "empty feed");
    }
  } else {
    recordSourceEvent(sourceName, "fetch_failure", detail);
    logger.warn({ sourceName, detail }, "[SourceReliability] Feed fetch failure recorded");
  }
}

export function recordArticleQuality(
  sourceName: string,
  descriptionLength: number,
  isDuplicate: boolean,
): void {
  if (isDuplicate) {
    recordSourceEvent(sourceName, "duplicate");
    return;
  }
  // Articles with < 80 chars description are poor quality
  if (descriptionLength < 80) {
    recordSourceEvent(sourceName, "quality_poor", `desc_len: ${descriptionLength}`);
  } else if (descriptionLength >= 200) {
    recordSourceEvent(sourceName, "quality_good", `desc_len: ${descriptionLength}`);
  }
}

// ── Reset (for testing) ───────────────────────────────────────

export function resetSourceReliability(sourceName?: string): void {
  if (sourceName) {
    sourceStore.delete(sourceName);
  } else {
    sourceStore.clear();
  }
}

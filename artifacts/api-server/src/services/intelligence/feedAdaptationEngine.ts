// ============================================================
// FEED ADAPTATION ENGINE — Sprint 10 Tasks E + J
//
// Adaptive ranking layer on top of the existing relevance pipeline.
//
// Task E — Feed Adaptation Engine:
//   Signals:
//     - repeated engagement rate (open/save/complete_read)
//     - entity preference drift (which entities get opened)
//     - ignored entity penalty (repeated skips)
//     - source preference (which sources user opens)
//
// Task J — Feed Quality Autocorrection:
//   Automatic weight reduction for:
//     - low-signal entities (signal score < threshold repeatedly)
//     - incidental entities (never directly engaged)
//     - narratives the user repeatedly ignores
//
// Architecture:
//   All state is in-memory + local persistence via the adaptation
//   signal (sent from client). Interface-compatible with PostgreSQL.
//
// Public API:
//   recordFeedback(feedback)            — explicit user feedback
//   getAdaptiveBoost(entityId)          — boost multiplier for entity
//   getIgnorePenalty(entityId)          — penalty multiplier for entity
//   applyAdaptiveRanking(items, signal) — re-rank feed items
//   getAdaptationState()                — debug snapshot
//   getAutocorrectionSuggestions()      — quality autocorrection hints
// ============================================================

import { logger } from "../../lib/logger.js";

export type FeedbackType = "more_like_this" | "less_like_this" | "irrelevant" | "high_value";

export interface FeedbackRecord {
  articleUrl: string;
  articleTitle: string;
  type: FeedbackType;
  entities: string[];
  topicId: string;
  narrativeId: string | null;
  timestamp: number;
}

export interface AdaptationSignal {
  openedUrls?: string[];
  savedUrls?: string[];
  skippedUrls?: string[];
  completedUrls?: string[];
  feedbackRecords?: FeedbackRecord[];
}

export interface EntityAdaptation {
  entityId: string;
  boostMultiplier: number;    // 0.5–2.0; 1.0 = neutral
  engagements: number;        // opens + saves + complete_reads
  ignores: number;            // skips + less_like_this
  positiveFeedback: number;   // high_value + more_like_this
  negativeFeedback: number;   // irrelevant + less_like_this
  lastEngaged: string | null;
  lastIgnored: string | null;
}

// ── Configuration ─────────────────────────────────────────────

const BOOST_PER_ENGAGEMENT = 0.08;
const PENALTY_PER_IGNORE = 0.06;
const FEEDBACK_BOOST_POSITIVE = 0.20;
const FEEDBACK_BOOST_NEGATIVE = 0.25;
const MAX_BOOST = 2.0;
const MIN_BOOST = 0.3;
const DECAY_PER_DAY = 0.02; // slow decay toward neutral (1.0)
const AUTOCORRECT_IGNORE_THRESHOLD = 3;  // ≥3 ignores → autocorrect candidate
const AUTOCORRECT_MIN_ENGAGEMENT = 0;    // 0 engagements + ≥3 ignores → suppress

// ── State ──────────────────────────────────────────────────────

const entityAdaptations = new Map<string, EntityAdaptation>();
const feedbackHistory: FeedbackRecord[] = [];
const MAX_FEEDBACK_HISTORY = 1000;

// Track URL → entity mappings for retroactive learning
const urlEntityIndex = new Map<string, string[]>();

// ── Helpers ───────────────────────────────────────────────────

function getOrCreate(entityId: string): EntityAdaptation {
  const existing = entityAdaptations.get(entityId);
  if (existing) return existing;

  const fresh: EntityAdaptation = {
    entityId,
    boostMultiplier: 1.0,
    engagements: 0,
    ignores: 0,
    positiveFeedback: 0,
    negativeFeedback: 0,
    lastEngaged: null,
    lastIgnored: null,
  };
  entityAdaptations.set(entityId, fresh);
  return fresh;
}

function applyDecay(adaptation: EntityAdaptation): number {
  if (!adaptation.lastEngaged && !adaptation.lastIgnored) return adaptation.boostMultiplier;

  const lastActivity = Math.max(
    adaptation.lastEngaged ? new Date(adaptation.lastEngaged).getTime() : 0,
    adaptation.lastIgnored ? new Date(adaptation.lastIgnored).getTime() : 0,
  );
  const daysSince = (Date.now() - lastActivity) / 86_400_000;
  const decayFactor = 1.0 + (1.0 - adaptation.boostMultiplier) * (1 - Math.exp(-DECAY_PER_DAY * daysSince));

  return Math.max(MIN_BOOST, Math.min(MAX_BOOST, decayFactor));
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Record explicit feedback from user.
 */
export function recordFeedback(feedback: FeedbackRecord): void {
  feedbackHistory.push(feedback);
  if (feedbackHistory.length > MAX_FEEDBACK_HISTORY) {
    feedbackHistory.splice(0, feedbackHistory.length - MAX_FEEDBACK_HISTORY);
  }

  // Index URL → entities
  if (feedback.entities.length > 0) {
    urlEntityIndex.set(feedback.articleUrl, feedback.entities);
  }

  const now = new Date().toISOString();

  for (const entityId of feedback.entities) {
    const adaptation = getOrCreate(entityId);

    if (feedback.type === "high_value" || feedback.type === "more_like_this") {
      adaptation.positiveFeedback += 1;
      adaptation.engagements += 1;
      adaptation.boostMultiplier = Math.min(
        MAX_BOOST,
        adaptation.boostMultiplier + FEEDBACK_BOOST_POSITIVE,
      );
      adaptation.lastEngaged = now;
    } else if (feedback.type === "irrelevant" || feedback.type === "less_like_this") {
      adaptation.negativeFeedback += 1;
      adaptation.ignores += 1;
      adaptation.boostMultiplier = Math.max(
        MIN_BOOST,
        adaptation.boostMultiplier - FEEDBACK_BOOST_NEGATIVE,
      );
      adaptation.lastIgnored = now;
    }
  }

  logger.debug({ type: feedback.type, entities: feedback.entities }, "Feedback recorded");
}

/**
 * Apply implicit engagement signal (open/save/skip).
 */
export function recordEngagementSignal(
  url: string,
  type: "open" | "save" | "skip" | "complete_read",
  entities: string[],
): void {
  if (entities.length > 0) {
    urlEntityIndex.set(url, entities);
  }

  const entityList = entities.length > 0 ? entities : (urlEntityIndex.get(url) ?? []);
  const now = new Date().toISOString();

  for (const entityId of entityList) {
    const adaptation = getOrCreate(entityId);

    if (type === "open" || type === "complete_read" || type === "save") {
      const boost = type === "complete_read" ? BOOST_PER_ENGAGEMENT * 1.5 :
                    type === "save" ? BOOST_PER_ENGAGEMENT * 1.2 :
                    BOOST_PER_ENGAGEMENT;
      adaptation.engagements += 1;
      adaptation.boostMultiplier = Math.min(MAX_BOOST, adaptation.boostMultiplier + boost);
      adaptation.lastEngaged = now;
    } else if (type === "skip") {
      adaptation.ignores += 1;
      adaptation.boostMultiplier = Math.max(MIN_BOOST, adaptation.boostMultiplier - PENALTY_PER_IGNORE);
      adaptation.lastIgnored = now;
    }
  }
}

/**
 * Get the effective boost multiplier for an entity.
 * Returns 1.0 (neutral) if entity has no adaptation data.
 */
export function getAdaptiveBoost(entityId: string): number {
  const adaptation = entityAdaptations.get(entityId);
  if (!adaptation) return 1.0;
  return Math.max(MIN_BOOST, Math.min(MAX_BOOST, applyDecay(adaptation)));
}

/**
 * Get ignore penalty (convenience; same as 1 / getAdaptiveBoost for low-boost entities).
 */
export function getIgnorePenalty(entityId: string): number {
  const boost = getAdaptiveBoost(entityId);
  return boost < 1.0 ? 1.0 - boost : 0;
}

/**
 * Apply adaptive ranking to a feed.
 * Takes items with entityIds and boosts/penalizes based on adaptation state.
 * Returns re-ranked items.
 */
export function applyAdaptiveRanking<T extends {
  relevanceScore: number;
  graphMatchedEntities?: string[];
  matchedInterests?: string[];
}>(
  items: T[],
  externalSignal?: AdaptationSignal,
): T[] {
  // Apply any external signals from the client
  if (externalSignal?.feedbackRecords) {
    for (const record of externalSignal.feedbackRecords) {
      recordFeedback(record);
    }
  }

  return items
    .map((item) => {
      const entities = [
        ...(item.graphMatchedEntities ?? []),
        ...(item.matchedInterests ?? []),
      ];

      // Calculate adaptive multiplier as max boost across matched entities
      let maxBoost = 1.0;
      for (const entityId of entities) {
        const boost = getAdaptiveBoost(entityId);
        if (boost > maxBoost || maxBoost === 1.0) maxBoost = boost;
      }

      return {
        ...item,
        relevanceScore: Math.round(item.relevanceScore * maxBoost),
        _adaptiveBoost: maxBoost,
      };
    })
    .sort((a: any, b: any) => {
      // Primary: relevance class order preserved; secondary: adaptively boosted score
      return b.relevanceScore - a.relevanceScore;
    });
}

/**
 * Autocorrection suggestions — entities/narratives that should be suppressed.
 * Task J: feed quality autocorrection.
 */
export function getAutocorrectionSuggestions(): Array<{
  entityId: string;
  reason: string;
  currentBoost: number;
  recommendedAction: "suppress" | "reduce" | "monitor";
}> {
  const suggestions: ReturnType<typeof getAutocorrectionSuggestions> = [];

  for (const [entityId, adaptation] of entityAdaptations) {
    const effectiveBoost = applyDecay(adaptation);

    if (
      adaptation.ignores >= AUTOCORRECT_IGNORE_THRESHOLD &&
      adaptation.engagements <= AUTOCORRECT_MIN_ENGAGEMENT
    ) {
      suggestions.push({
        entityId,
        reason: `${adaptation.ignores} ignores, ${adaptation.engagements} engagements`,
        currentBoost: Math.round(effectiveBoost * 100) / 100,
        recommendedAction: adaptation.ignores >= 6 ? "suppress" : "reduce",
      });
    } else if (effectiveBoost < 0.6 && adaptation.negativeFeedback > 0) {
      suggestions.push({
        entityId,
        reason: `${adaptation.negativeFeedback} negative feedback`,
        currentBoost: Math.round(effectiveBoost * 100) / 100,
        recommendedAction: "monitor",
      });
    }
  }

  return suggestions.sort((a, b) => a.currentBoost - b.currentBoost);
}

/**
 * Full adaptation state for debug/admin.
 */
export function getAdaptationState(): {
  totalEntities: number;
  boosted: number;
  suppressed: number;
  neutral: number;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  topBoosted: EntityAdaptation[];
  topSuppressed: EntityAdaptation[];
  autocorrectionCandidates: number;
} {
  const adaptations = [...entityAdaptations.values()].map((a) => ({
    ...a,
    boostMultiplier: applyDecay(a),
  }));

  const boosted = adaptations.filter((a) => a.boostMultiplier > 1.1);
  const suppressed = adaptations.filter((a) => a.boostMultiplier < 0.9);
  const neutral = adaptations.filter((a) => a.boostMultiplier >= 0.9 && a.boostMultiplier <= 1.1);

  const posFeedback = feedbackHistory.filter(
    (f) => f.type === "high_value" || f.type === "more_like_this",
  ).length;
  const negFeedback = feedbackHistory.filter(
    (f) => f.type === "irrelevant" || f.type === "less_like_this",
  ).length;

  return {
    totalEntities: adaptations.length,
    boosted: boosted.length,
    suppressed: suppressed.length,
    neutral: neutral.length,
    totalFeedback: feedbackHistory.length,
    positiveFeedback: posFeedback,
    negativeFeedback: negFeedback,
    topBoosted: boosted.sort((a, b) => b.boostMultiplier - a.boostMultiplier).slice(0, 5),
    topSuppressed: suppressed.sort((a, b) => a.boostMultiplier - b.boostMultiplier).slice(0, 5),
    autocorrectionCandidates: getAutocorrectionSuggestions().length,
  };
}

/**
 * Get feedback history for a specific article URL.
 */
export function getFeedbackForUrl(url: string): FeedbackRecord[] {
  return feedbackHistory.filter((f) => f.articleUrl === url);
}

/**
 * Get all feedback records (newest first).
 */
export function getAllFeedback(limit = 50): FeedbackRecord[] {
  return [...feedbackHistory]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

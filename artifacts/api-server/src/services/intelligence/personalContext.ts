// ============================================================
// PERSONAL CONTEXT LAYER — Sprint 9 Task H
//
// Derives a bias vector from the user's declared interests
// and feed behaviour. Used to weight feed generation.
//
// Context profile components:
//   1. Interest graph expansion → entity weights
//   2. Taste signal (provided by client from localStorage)
//   3. Entity memory activity → rising entity boost
//   4. Watchlist (explicit override, highest weight)
//
// Output: PersonalContextProfile — used by feed.ts to bias scoring
//
// Architecture: stateless computation, no server-side storage.
// State lives in client localStorage (tasteLearning.ts).
// ============================================================

import { expandInterests, type ExpandedEntity } from "./interestGraph.js";
import { getRisingEntities } from "./entityMemory.js";

export interface TasteSignal {
  openedInterests: string[];       // interests associated with opened articles
  savedInterests: string[];        // interests from saved briefings
  skippedInterests: string[];      // interests of articles that were skipped
  strongInterests: string[];       // interests that scored above threshold
}

export interface PersonalContextProfile {
  expandedEntities: Map<string, ExpandedEntity>;  // full interest graph
  entityBiasMap: Map<string, number>;              // entityId → composite bias weight
  risingEntityBoost: string[];                     // entities trending up
  watchlistBoost: string[];                        // watchlist terms (×2 boost)
  contextSummary: string;                          // human-readable summary
  totalInterests: number;
}

/**
 * Build a personal context profile from user interests + optional taste signals.
 * Called per-request in feed.ts.
 */
export function buildPersonalContext(
  interests: string[],
  watchlist: string[] = [],
  tasteSignal?: TasteSignal,
): PersonalContextProfile {
  // 1. Expand interests through graph
  const expandedEntities = expandInterests(interests);

  // 2. Build entity bias map from graph expansion
  const entityBiasMap = new Map<string, number>();
  for (const [entityId, entry] of expandedEntities) {
    entityBiasMap.set(entityId, entry.weight);
  }

  // 3. Apply taste learning boost/penalty
  if (tasteSignal) {
    // Boost interests user has engaged with
    for (const interest of tasteSignal.openedInterests) {
      const current = entityBiasMap.get(interest) ?? 0;
      entityBiasMap.set(interest, Math.min(current * 1.3, 1.0));
    }
    for (const interest of tasteSignal.savedInterests) {
      const current = entityBiasMap.get(interest) ?? 0;
      entityBiasMap.set(interest, Math.min(current * 1.5, 1.0));
    }
    for (const interest of tasteSignal.strongInterests) {
      const current = entityBiasMap.get(interest) ?? 0;
      entityBiasMap.set(interest, Math.min(current * 1.2, 1.0));
    }
    // Gently downweight skipped interests
    for (const interest of tasteSignal.skippedInterests) {
      const current = entityBiasMap.get(interest) ?? 0;
      entityBiasMap.set(interest, current * 0.8);
    }
  }

  // 4. Rising entity boost (from entity memory)
  const rising = getRisingEntities(5).map((e) => e.entityId);
  for (const entityId of rising) {
    const current = entityBiasMap.get(entityId) ?? 0;
    if (current > 0) {
      entityBiasMap.set(entityId, Math.min(current * 1.2, 1.0));
    }
  }

  // 5. Watchlist always gets explicit boost
  for (const term of watchlist) {
    entityBiasMap.set(`watchlist:${term}`, 1.0);
  }

  // 6. Build context summary
  const topEntities = [...entityBiasMap.entries()]
    .filter(([, w]) => w >= 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const contextSummary = topEntities.length > 0
    ? `Profile focus: ${topEntities.join(", ")}${rising.length > 0 ? ` · Rising: ${rising.slice(0, 2).join(", ")}` : ""}`
    : `General profile: ${interests.join(", ") || "no interests set"}`;

  return {
    expandedEntities,
    entityBiasMap,
    risingEntityBoost: rising,
    watchlistBoost: watchlist,
    contextSummary,
    totalInterests: interests.length,
  };
}

/**
 * Apply a personal context profile to a relevance score.
 * Returns a boosted score.
 */
export function applyContextBoost(
  baseScore: number,
  matchedEntities: string[],
  watchlistMatches: string[],
  context: PersonalContextProfile,
): number {
  let boost = 0;

  for (const entity of matchedEntities) {
    const w = context.entityBiasMap.get(entity) ?? 0;
    boost += w * 20;
    if (context.risingEntityBoost.includes(entity)) {
      boost += 8; // extra boost for trending entities
    }
  }

  // Watchlist is strongest signal
  boost += watchlistMatches.length * 40;

  return Math.round(baseScore + boost);
}

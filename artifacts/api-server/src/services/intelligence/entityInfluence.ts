// ============================================================
// ENTITY INFLUENCE SYSTEM — Sprint 11 Task H
//
// Tracks and scores entity influence across the ecosystem.
//
// Influence = how much an entity shapes other narratives, entities,
// and information flow — not just how often it appears.
//
// Example: Nvidia influences
//   semiconductors, AI infra, cloud providers,
//   energy demand, sovereign AI strategies
//
// Influence score components (0-100):
//   Breadth      — unique entities connected (0-35)
//   Depth        — avg edge weight in interest graph (0-25)
//   Velocity     — recent mention growth rate (0-20)
//   Spread       — unique topics / narratives (0-15)
//   Centrality   — how often entity bridges other pairs (0-5)
//
// ============================================================

import { INTEREST_GRAPH } from "./interestGraph.js";
import type { EntityMemoryEntry } from "./entityMemory.js";
import type { NarrativeThread } from "./narrativeMemory.js";

export interface EntityInfluenceScore {
  entityId: string;
  label: string;
  influenceScore: number;    // 0-100
  breadthScore: number;
  depthScore: number;
  velocityScore: number;
  spreadScore: number;
  centralityScore: number;
  connectedEntities: string[];
  narrativeIds: string[];
  topicCoverage: string[];
  tier: "dominant" | "major" | "moderate" | "minor";
  influenceDirection: "expanding" | "stable" | "contracting";
  lastUpdated: string;
}

export interface InfluenceMap {
  scores: EntityInfluenceScore[];
  topInfluencers: EntityInfluenceScore[];
  expandingInfluencers: EntityInfluenceScore[];
  ecosystemDominants: EntityInfluenceScore[];
  generatedAt: string;
}

// ── Tier classification ────────────────────────────────────────
function classifyTier(score: number): EntityInfluenceScore["tier"] {
  if (score >= 75) return "dominant";
  if (score >= 50) return "major";
  if (score >= 25) return "moderate";
  return "minor";
}

// ── Compute breadth score ─────────────────────────────────────
function computeBreadth(entityId: string): { score: number; connected: string[] } {
  const node = INTEREST_GRAPH[entityId];
  if (!node) return { score: 0, connected: [] };

  const connected = (node.related ?? []).map((e) => e.target);
  // Also count reverse edges
  const reverseConnected: string[] = [];
  for (const [otherId, otherNode] of Object.entries(INTEREST_GRAPH)) {
    if (otherId !== entityId && (otherNode.related ?? []).some((e) => e.target === entityId)) {
      reverseConnected.push(otherId);
    }
  }

  const allConnected = [...new Set([...connected, ...reverseConnected])];
  const score = Math.min(35, allConnected.length * 3);
  return { score, connected: allConnected };
}

// ── Compute depth score ───────────────────────────────────────
function computeDepth(entityId: string): number {
  const node = INTEREST_GRAPH[entityId];
  if (!node) return 0;
  const edges = (node.related ?? []).length;
  // Depth = edge density relative to total graph
  const totalNodes = Object.keys(INTEREST_GRAPH).length;
  const density = edges / Math.max(1, totalNodes - 1);
  return Math.round(Math.min(25, density * 500));
}

// ── Compute velocity score ────────────────────────────────────
function computeVelocity(entity: EntityMemoryEntry): number {
  const { mentionsLast24h, mentionsLast7d } = entity;
  const dailyAvg7d = mentionsLast7d / 7;
  if (dailyAvg7d === 0) return mentionsLast24h > 0 ? 10 : 0;
  const ratio = mentionsLast24h / dailyAvg7d;
  return Math.round(Math.min(20, ratio * 7));
}

// ── Compute spread score ──────────────────────────────────────
function computeSpread(entityId: string, narratives: NarrativeThread[]): { score: number; narrativeIds: string[]; topics: string[] } {
  const relevantNarratives = narratives.filter((n) => {
    const entities = [n.dominantEntity, ...(n.relatedEntities ?? [])].filter(Boolean);
    return entities.some((e) => (e ?? "").toLowerCase() === entityId.toLowerCase());
  });

  const narrativeIds = relevantNarratives.map((n) => n.id);
  const topics = [...new Set(relevantNarratives.map((n) => n.theme))];
  const score = Math.round(Math.min(15, narrativeIds.length * 2 + topics.length));
  return { score, narrativeIds, topics };
}

// ── Compute centrality ────────────────────────────────────────
// Betweenness approximation: entity is central if it connects otherwise-disconnected entities
function computeCentrality(entityId: string): number {
  const node = INTEREST_GRAPH[entityId];
  if (!node) return 0;

  const neighbors = new Set((node.related ?? []).map((e) => e.target));
  let bridgeCount = 0;

  // For each pair of neighbors, check if this entity is the only path
  const neighborList = [...neighbors];
  for (let i = 0; i < neighborList.length; i++) {
    for (let j = i + 1; j < neighborList.length; j++) {
      const na = INTEREST_GRAPH[neighborList[i]];
      const nb = INTEREST_GRAPH[neighborList[j]];
      if (!na || !nb) continue;
      // If the two neighbors are NOT directly connected, this entity bridges them
      if (!(na.related ?? []).some((e) => e.target === neighborList[j])) {
        bridgeCount++;
      }
    }
  }
  return Math.min(5, bridgeCount);
}

// ── Influence direction ───────────────────────────────────────
function computeDirection(entity: EntityMemoryEntry): EntityInfluenceScore["influenceDirection"] {
  const { mentionsLast24h, mentionsLast7d } = entity;
  const dailyAvg = mentionsLast7d / 7;
  if (dailyAvg === 0) return "stable";
  const ratio = mentionsLast24h / dailyAvg;
  if (ratio >= 1.5) return "expanding";
  if (ratio <= 0.5) return "contracting";
  return "stable";
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Compute influence score for a single entity.
 */
export function computeEntityInfluence(
  entity: EntityMemoryEntry,
  narratives: NarrativeThread[],
): EntityInfluenceScore {
  const { score: breadthScore, connected: connectedEntities } = computeBreadth(entity.entityId);
  const depthScore = computeDepth(entity.entityId);
  const velocityScore = computeVelocity(entity);
  const { score: spreadScore, narrativeIds, topics } = computeSpread(entity.entityId, narratives);
  const centralityScore = computeCentrality(entity.entityId);

  const influenceScore = Math.round(
    breadthScore + depthScore + velocityScore + spreadScore + centralityScore,
  );

  return {
    entityId: entity.entityId,
    label: entity.label,
    influenceScore: Math.min(100, influenceScore),
    breadthScore,
    depthScore,
    velocityScore,
    spreadScore,
    centralityScore,
    connectedEntities,
    narrativeIds,
    topicCoverage: topics,
    tier: classifyTier(influenceScore),
    influenceDirection: computeDirection(entity),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Build complete influence map from all tracked entities.
 */
export function buildInfluenceMap(
  entities: EntityMemoryEntry[],
  narratives: NarrativeThread[],
): InfluenceMap {
  const scores = entities
    .map((e) => computeEntityInfluence(e, narratives))
    .sort((a, b) => b.influenceScore - a.influenceScore);

  return {
    scores,
    topInfluencers: scores.filter((s) => s.tier === "dominant" || s.tier === "major").slice(0, 10),
    expandingInfluencers: scores.filter((s) => s.influenceDirection === "expanding").slice(0, 10),
    ecosystemDominants: scores.filter((s) => s.centralityScore >= 3).slice(0, 5),
    generatedAt: new Date().toISOString(),
  };
}

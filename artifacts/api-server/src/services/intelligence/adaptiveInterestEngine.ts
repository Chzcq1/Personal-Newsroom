// ============================================================
// ADAPTIVE INTEREST ENGINE — Sprint 10 Task A
//
// Dynamically learns and expands interest relationships from
// user behavior — reading patterns, saves, entity co-occurrence.
//
// How it works:
//   - Observes which entities co-appear in articles the user reads
//   - Builds learned edges on top of the static INTEREST_GRAPH
//   - Applies confidence decay so stale signals lose influence
//   - Detects "expansion clusters" (e.g. MicroStrategy + Coinbase
//     repeatedly co-read → infer "institutional BTC infrastructure")
//
// Storage: in-memory. Architecture is interface-compatible with
// PostgreSQL (see longTermMemory.ts for migration contracts).
//
// Confidence scoring:
//   Each learned edge has confidence 0.0–1.0
//   Initial: 0.1 per co-occurrence
//   Decays by 0.05/day of inactivity (min 0.0, pruned at 0.0)
//   Saturates at 1.0
//
// Public API:
//   recordEngagement(entities, type)   — log what user engaged with
//   getLearnedEdges(entityId)          — edges learned from behavior
//   getAdaptiveWeight(from, to)        — effective weight (static + learned)
//   getExpansionClusters()             — auto-detected clusters
//   getAdaptiveSummary()               — debug snapshot
// ============================================================

import { INTEREST_GRAPH } from "./interestGraph.js";
import { logger } from "../../lib/logger.js";

export type EngagementType = "open" | "save" | "complete_read" | "feedback_positive" | "feedback_negative";

export interface LearnedEdge {
  from: string;
  to: string;
  confidence: number;        // 0.0–1.0
  coOccurrences: number;     // raw count
  firstSeen: string;
  lastSeen: string;
  decayedAt: string | null;  // set when pruned
}

export interface EngagementRecord {
  entities: string[];
  type: EngagementType;
  weight: number;            // engagement weight by type
  timestamp: number;
}

export interface ExpansionCluster {
  label: string;
  coreEntities: string[];
  confidence: number;
  detectedAt: string;
  lastReinforced: string;
}

// ── Configuration ─────────────────────────────────────────────

const CONFIDENCE_INCREMENTS: Record<EngagementType, number> = {
  complete_read: 0.15,
  save: 0.12,
  feedback_positive: 0.18,
  open: 0.06,
  feedback_negative: -0.20,
};

const DECAY_PER_DAY = 0.05;
const MIN_CONFIDENCE = 0.0;
const MAX_CONFIDENCE = 1.0;
const PRUNE_THRESHOLD = 0.02;
const CLUSTER_MIN_CONFIDENCE = 0.4;
const CLUSTER_MIN_ENTITIES = 2;
const MAX_ENGAGEMENT_HISTORY = 500;
const MAX_LEARNED_EDGES = 300;

// ── State ──────────────────────────────────────────────────────

const learnedEdges = new Map<string, LearnedEdge>();      // "A→B" → edge
const engagementHistory: EngagementRecord[] = [];
const expansionClusters = new Map<string, ExpansionCluster>();

// ── Helpers ───────────────────────────────────────────────────

function edgeKey(from: string, to: string): string {
  return `${from}→${to}`;
}

function applyDecay(edge: LearnedEdge): number {
  const daysSinceLastSeen = (Date.now() - new Date(edge.lastSeen).getTime()) / 86_400_000;
  const decayed = edge.confidence - (daysSinceLastSeen * DECAY_PER_DAY);
  return Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, decayed));
}

function pruneStaleEdges(): void {
  for (const [key, edge] of learnedEdges) {
    const effective = applyDecay(edge);
    if (effective <= PRUNE_THRESHOLD) {
      learnedEdges.delete(key);
    } else {
      edge.confidence = effective;
    }
  }
}

function detectEntitiesInText(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [entityId, node] of Object.entries(INTEREST_GRAPH)) {
    for (const kw of node.coreKeywords) {
      if (lower.includes(kw.toLowerCase())) {
        found.push(entityId);
        break;
      }
    }
  }
  return found;
}

// ── Edge learning ─────────────────────────────────────────────

function learnEdge(from: string, to: string, increment: number): void {
  if (from === to) return;

  const key = edgeKey(from, to);
  const now = new Date().toISOString();
  const existing = learnedEdges.get(key);

  if (existing) {
    const current = applyDecay(existing);
    const updated = Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, current + increment));
    existing.confidence = updated;
    existing.coOccurrences += (increment > 0 ? 1 : 0);
    existing.lastSeen = now;
    existing.decayedAt = null;
  } else {
    if (learnedEdges.size >= MAX_LEARNED_EDGES) {
      // Evict weakest edge
      let weakestKey = "";
      let weakestConf = Infinity;
      for (const [k, e] of learnedEdges) {
        const eff = applyDecay(e);
        if (eff < weakestConf) { weakestConf = eff; weakestKey = k; }
      }
      if (weakestKey) learnedEdges.delete(weakestKey);
    }

    learnedEdges.set(key, {
      from, to,
      confidence: Math.max(0, increment),
      coOccurrences: increment > 0 ? 1 : 0,
      firstSeen: now,
      lastSeen: now,
      decayedAt: null,
    });
  }
}

// ── Cluster detection ─────────────────────────────────────────

function updateExpansionClusters(): void {
  // Find groups of entities that are all strongly connected to each other
  const strongEntities = [...learnedEdges.values()]
    .filter((e) => applyDecay(e) >= CLUSTER_MIN_CONFIDENCE)
    .map((e) => [e.from, e.to])
    .flat();

  const freq = new Map<string, number>();
  for (const entity of strongEntities) {
    freq.set(entity, (freq.get(entity) ?? 0) + 1);
  }

  const clustered = [...freq.entries()]
    .filter(([, count]) => count >= CLUSTER_MIN_ENTITIES)
    .sort((a, b) => b[1] - a[1]);

  if (clustered.length < CLUSTER_MIN_ENTITIES) return;

  const coreEntities = clustered.slice(0, 5).map(([e]) => e);
  const avgConf = coreEntities.reduce((sum, e) => {
    const edges = [...learnedEdges.values()].filter(
      (edge) => edge.from === e || edge.to === e,
    );
    const avg = edges.length > 0
      ? edges.reduce((s, edge) => s + applyDecay(edge), 0) / edges.length
      : 0;
    return sum + avg;
  }, 0) / coreEntities.length;

  // Generate label from known entity names
  const labels = coreEntities
    .map((e) => INTEREST_GRAPH[e]?.label ?? e)
    .slice(0, 3)
    .join(" + ");

  const clusterKey = coreEntities.slice(0, 3).sort().join("-");
  const existing = expansionClusters.get(clusterKey);
  const now = new Date().toISOString();

  if (existing) {
    existing.confidence = avgConf;
    existing.lastReinforced = now;
    existing.coreEntities = coreEntities;
  } else {
    expansionClusters.set(clusterKey, {
      label: labels,
      coreEntities,
      confidence: avgConf,
      detectedAt: now,
      lastReinforced: now,
    });
    logger.debug({ cluster: labels }, "Adaptive: new expansion cluster detected");
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * Record a user engagement event with an article.
 * Entities can be from the interest graph or watchlist terms.
 */
export function recordEngagement(
  entities: string[],
  type: EngagementType,
  articleText?: string,
): void {
  pruneStaleEdges();

  const increment = CONFIDENCE_INCREMENTS[type] ?? 0.05;

  // Add entities detected from article text if provided
  const allEntities = [...new Set([
    ...entities,
    ...(articleText ? detectEntitiesInText(articleText) : []),
  ])];

  if (allEntities.length < 2) return; // need at least 2 entities to form an edge

  // Record engagement
  engagementHistory.push({
    entities: allEntities,
    type,
    weight: Math.abs(increment),
    timestamp: Date.now(),
  });

  if (engagementHistory.length > MAX_ENGAGEMENT_HISTORY) {
    engagementHistory.splice(0, engagementHistory.length - MAX_ENGAGEMENT_HISTORY);
  }

  // Learn pairwise edges from co-occurring entities
  for (let i = 0; i < allEntities.length; i++) {
    for (let j = i + 1; j < allEntities.length; j++) {
      learnEdge(allEntities[i], allEntities[j], increment);
      learnEdge(allEntities[j], allEntities[i], increment); // bidirectional
    }
  }

  // Periodically update clusters (every 10 engagements)
  if (engagementHistory.length % 10 === 0) {
    updateExpansionClusters();
  }
}

/**
 * Get all learned edges from a given entity.
 * Returns edges sorted by effective confidence descending.
 */
export function getLearnedEdges(entityId: string): LearnedEdge[] {
  return [...learnedEdges.values()]
    .filter((e) => e.from === entityId)
    .map((e) => ({ ...e, confidence: applyDecay(e) }))
    .filter((e) => e.confidence > PRUNE_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get the effective weight between two entities.
 * Returns: static graph weight + learned weight (capped at 1.0).
 */
export function getAdaptiveWeight(from: string, to: string): number {
  const edge = learnedEdges.get(edgeKey(from, to));
  const learnedConf = edge ? applyDecay(edge) : 0;

  // Static graph weight
  const staticNode = INTEREST_GRAPH[from];
  const staticEdge = staticNode?.related.find((e) => e.target === to);
  const staticWeight = staticEdge?.weight ?? 0;

  return Math.min(MAX_CONFIDENCE, staticWeight + learnedConf * 0.4);
}

/**
 * Get detected expansion clusters — groups of entities the user
 * repeatedly engages with together.
 */
export function getExpansionClusters(): ExpansionCluster[] {
  return [...expansionClusters.values()]
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get the top N entity expansions based on learned behavior.
 * Returns entities ranked by their accumulated engagement confidence.
 */
export function getAdaptiveExpansions(
  interests: string[],
  limit = 10,
): Array<{ entityId: string; label: string; confidence: number; sourceInterest: string }> {
  const results: Array<{ entityId: string; label: string; confidence: number; sourceInterest: string }> = [];

  for (const interest of interests) {
    const edges = getLearnedEdges(interest);
    for (const edge of edges) {
      const label = INTEREST_GRAPH[edge.to]?.label ?? edge.to;
      results.push({
        entityId: edge.to,
        label,
        confidence: edge.confidence,
        sourceInterest: interest,
      });
    }
  }

  // Deduplicate: keep highest confidence per entity
  const deduped = new Map<string, typeof results[0]>();
  for (const r of results) {
    const existing = deduped.get(r.entityId);
    if (!existing || existing.confidence < r.confidence) {
      deduped.set(r.entityId, r);
    }
  }

  return [...deduped.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

/**
 * Debug snapshot of the entire adaptive engine state.
 */
export function getAdaptiveSummary(): {
  totalLearnedEdges: number;
  totalEngagements: number;
  expansionClusters: ExpansionCluster[];
  topLearnedEdges: Array<LearnedEdge & { effectiveConfidence: number }>;
} {
  pruneStaleEdges();

  const topEdges = [...learnedEdges.values()]
    .map((e) => ({ ...e, effectiveConfidence: applyDecay(e) }))
    .sort((a, b) => b.effectiveConfidence - a.effectiveConfidence)
    .slice(0, 20);

  return {
    totalLearnedEdges: learnedEdges.size,
    totalEngagements: engagementHistory.length,
    expansionClusters: getExpansionClusters(),
    topLearnedEdges: topEdges,
  };
}

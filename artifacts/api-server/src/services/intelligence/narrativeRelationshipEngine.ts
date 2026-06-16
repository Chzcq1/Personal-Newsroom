// ============================================================
// NARRATIVE RELATIONSHIP ENGINE — Sprint 11 Task D
//
// Detects relationships between narratives and builds an
// ecosystem graph of connected story threads.
//
// Example ecosystem:
//   AI infrastructure boom
//     ↔ Nvidia demand
//     ↔ TSMC supply chain
//     ↔ energy consumption
//     ↔ data center expansion
//
// Relationship types:
//   entity_overlap  — share ≥ 2 entities
//   entity_chain    — entity A → entity B → entity C (2-hop)
//   temporal_comovement — spike at same time (within 6h)
//   causal_inference — one narrative precedes another by trend
//
// Edge strength: 0.0-1.0 (Jaccard of entity sets + temporal weight)
// ============================================================

import type { NarrativeThread } from "./narrativeMemory.js";

export type RelationshipType =
  | "entity_overlap"
  | "entity_chain"
  | "temporal_comovement"
  | "causal_inference";

export interface NarrativeEdge {
  fromId: string;
  toId: string;
  type: RelationshipType;
  strength: number;        // 0.0–1.0
  sharedEntities: string[];
  detectedAt: string;
}

export interface NarrativeNode {
  id: string;
  canonicalHeadline: string;
  dominantEntity: string | null;
  entities: string[];
  momentumScore: number;
  maturity: string;
  firstSeen: string;
}

export interface NarrativeGraph {
  nodes: NarrativeNode[];
  edges: NarrativeEdge[];
  ecosystems: NarrativeEcosystem[];
  generatedAt: string;
}

export interface NarrativeEcosystem {
  id: string;
  label: string;
  coreNarrativeIds: string[];
  dominantEntities: string[];
  totalNodes: number;
  avgStrength: number;
  description: string;
}

// ── State ─────────────────────────────────────────────────────

const edgeCache = new Map<string, NarrativeEdge>();
const EDGE_TTL_MS = 6 * 3_600_000; // refresh edges every 6h
let lastBuildAt = 0;

// ── Helpers ───────────────────────────────────────────────────

function entityJaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a.map((e) => e.toLowerCase()));
  const setB = new Set(b.map((e) => e.toLowerCase()));
  const intersection = [...setA].filter((e) => setB.has(e)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

function getSharedEntities(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((e) => e.toLowerCase()));
  return a.filter((e) => setB.has(e.toLowerCase()));
}

function detectEntityChain(
  a: NarrativeThread,
  b: NarrativeThread,
  allThreads: NarrativeThread[],
): { hasChain: boolean; bridgeEntity: string | null } {
  // Check if any entity in A appears in a third narrative that also has an entity in B
  for (const bridgeThread of allThreads) {
    if (bridgeThread.id === a.id || bridgeThread.id === b.id) continue;
    const bridgeEntities = bridgeThread.relatedEntities ?? [];
    const aEntities = new Set((a.relatedEntities ?? []).map((e) => e.toLowerCase()));
    const bEntities = new Set((b.relatedEntities ?? []).map((e) => e.toLowerCase()));
    const bridgesA = bridgeEntities.some((e) => aEntities.has(e.toLowerCase()));
    const bridgesB = bridgeEntities.some((e) => bEntities.has(e.toLowerCase()));
    if (bridgesA && bridgesB) {
      return {
        hasChain: true,
        bridgeEntity: bridgeThread.dominantEntity ?? bridgeEntities[0] ?? null,
      };
    }
  }
  return { hasChain: false, bridgeEntity: null };
}

function detectTemporalComovement(a: NarrativeThread, b: NarrativeThread): boolean {
  // Check if recent developments overlap in time (within 6h)
  const WINDOW = 6 * 3_600_000;
  for (const devA of (a.developments ?? []).slice(-5)) {
    for (const devB of (b.developments ?? []).slice(-5)) {
      const tA = new Date(devA.recordedAt).getTime();
      const tB = new Date(devB.recordedAt).getTime();
      if (Math.abs(tA - tB) < WINDOW) return true;
    }
  }
  return false;
}

// ── Graph construction ────────────────────────────────────────

export function buildNarrativeGraph(threads: NarrativeThread[]): NarrativeGraph {
  const now = Date.now();

  // Only rebuild if stale
  if (now - lastBuildAt < EDGE_TTL_MS && edgeCache.size > 0) {
    // Return cached version
    return {
      nodes: threads.map(toNode),
      edges: [...edgeCache.values()],
      ecosystems: detectEcosystems(threads, [...edgeCache.values()]),
      generatedAt: new Date(lastBuildAt).toISOString(),
    };
  }

  edgeCache.clear();
  lastBuildAt = now;

  const activeThreads = threads.filter(
    (t) => t.maturity !== "resolved" && t.maturity !== "declining",
  );

  // Build edges between all pairs
  for (let i = 0; i < activeThreads.length; i++) {
    for (let j = i + 1; j < activeThreads.length; j++) {
      const a = activeThreads[i];
      const b = activeThreads[j];

      const aEntities = [a.dominantEntity, ...(a.relatedEntities ?? [])].filter(Boolean) as string[];
      const bEntities = [b.dominantEntity, ...(b.relatedEntities ?? [])].filter(Boolean) as string[];

      const shared = getSharedEntities(aEntities, bEntities);
      const jaccard = entityJaccard(aEntities, bEntities);

      if (shared.length >= 2 || jaccard >= 0.2) {
        // Direct entity overlap
        const edgeId = `${a.id}--${b.id}:entity_overlap`;
        edgeCache.set(edgeId, {
          fromId: a.id,
          toId: b.id,
          type: "entity_overlap",
          strength: Math.min(1.0, jaccard + (shared.length * 0.05)),
          sharedEntities: shared,
          detectedAt: new Date().toISOString(),
        });
      } else if (jaccard >= 0.1) {
        // Check temporal co-movement
        if (detectTemporalComovement(a, b)) {
          const edgeId = `${a.id}--${b.id}:temporal_comovement`;
          edgeCache.set(edgeId, {
            fromId: a.id,
            toId: b.id,
            type: "temporal_comovement",
            strength: 0.3 + jaccard,
            sharedEntities: shared,
            detectedAt: new Date().toISOString(),
          });
        }
      } else if (shared.length >= 1) {
        // Check 2-hop entity chain
        const { hasChain, bridgeEntity } = detectEntityChain(a, b, threads);
        if (hasChain) {
          const edgeId = `${a.id}--${b.id}:entity_chain`;
          edgeCache.set(edgeId, {
            fromId: a.id,
            toId: b.id,
            type: "entity_chain",
            strength: 0.25,
            sharedEntities: bridgeEntity ? [bridgeEntity] : [],
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  const edges = [...edgeCache.values()];

  return {
    nodes: threads.map(toNode),
    edges,
    ecosystems: detectEcosystems(threads, edges),
    generatedAt: new Date().toISOString(),
  };
}

function toNode(thread: NarrativeThread): NarrativeNode {
  return {
    id: thread.id,
    canonicalHeadline: thread.canonicalHeadline,
    dominantEntity: thread.dominantEntity,
    entities: [thread.dominantEntity, ...(thread.relatedEntities ?? [])].filter(Boolean) as string[],
    momentumScore: 0, // filled in by caller if momentum is available
    maturity: thread.maturity,
    firstSeen: thread.firstSeen,
  };
}

function detectEcosystems(
  threads: NarrativeThread[],
  edges: NarrativeEdge[],
): NarrativeEcosystem[] {
  // Connected component detection via union-find
  const parent = new Map<string, string>();
  const threadMap = new Map(threads.map((t) => [t.id, t]));

  function find(id: string): string {
    if (parent.get(id) !== id) parent.set(id, find(parent.get(id)!));
    return parent.get(id) ?? id;
  }

  function union(a: string, b: string): void {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (const thread of threads) parent.set(thread.id, thread.id);

  for (const edge of edges) {
    if (edge.strength >= 0.25) union(edge.fromId, edge.toId);
  }

  // Group into components
  const components = new Map<string, string[]>();
  for (const thread of threads) {
    const root = find(thread.id);
    const group = components.get(root) ?? [];
    group.push(thread.id);
    components.set(root, group);
  }

  const ecosystems: NarrativeEcosystem[] = [];

  for (const [, members] of components) {
    if (members.length < 2) continue; // ignore singletons

    const memberThreads = members.map((id) => threadMap.get(id)).filter(Boolean) as NarrativeThread[];
    const allEntities = memberThreads.flatMap(
      (t) => [t.dominantEntity, ...(t.relatedEntities ?? [])].filter(Boolean) as string[],
    );

    // Rank entities by frequency
    const entityFreq = new Map<string, number>();
    for (const e of allEntities) entityFreq.set(e, (entityFreq.get(e) ?? 0) + 1);
    const topEntities = [...entityFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([e]) => e);

    // Average edge strength within this component
    const componentEdges = edges.filter(
      (e) => members.includes(e.fromId) && members.includes(e.toId),
    );
    const avgStrength = componentEdges.length > 0
      ? componentEdges.reduce((a, b) => a + b.strength, 0) / componentEdges.length
      : 0;

    // Label from top entities
    const label = topEntities.slice(0, 3).join(" · ") || "Mixed Ecosystem";

    const dominantThemes = [...new Set(memberThreads.map((t) => t.theme))].slice(0, 3);
    const description = `${members.length} narratives connected via ${topEntities.slice(0, 2).join(" and ")}. Themes: ${dominantThemes.join(", ")}.`;

    ecosystems.push({
      id: `eco:${members.sort().join("-").slice(0, 40)}`,
      label,
      coreNarrativeIds: members,
      dominantEntities: topEntities,
      totalNodes: members.length,
      avgStrength: Math.round(avgStrength * 100) / 100,
      description,
    });
  }

  return ecosystems.sort((a, b) => b.totalNodes - a.totalNodes);
}

/**
 * Get narratives related to a given narrative ID.
 */
export function getRelatedNarratives(
  narrativeId: string,
  edges: NarrativeEdge[],
): { narrativeId: string; type: RelationshipType; strength: number }[] {
  return edges
    .filter((e) => e.fromId === narrativeId || e.toId === narrativeId)
    .map((e) => ({
      narrativeId: e.fromId === narrativeId ? e.toId : e.fromId,
      type: e.type,
      strength: e.strength,
    }))
    .sort((a, b) => b.strength - a.strength);
}

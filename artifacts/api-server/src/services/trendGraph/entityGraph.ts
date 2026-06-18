// ============================================================
// TREND ENTITY GRAPH — Graph Traversal & Expansion
// Sprint 29 — Real-Time Trend Intelligence
//
// Expands entities to their adjacent topics using the
// relation graph. Used for discovery injection and for
// boosting feed items that sit near active trends.
// ============================================================

import { ENTITY_RELATIONS } from "./entityRelations.js";

// ── Build full bidirectional graph at module load ────────────

interface GraphEdge {
  target: string;
  weight: number;
}

function buildFullGraph(): Map<string, GraphEdge[]> {
  const graph = new Map<string, GraphEdge[]>();

  for (const [source, relations] of Object.entries(ENTITY_RELATIONS)) {
    const key = source.toLowerCase();
    if (!graph.has(key)) graph.set(key, []);
    for (const rel of relations) {
      const targetKey = rel.target.toLowerCase();
      graph.get(key)!.push({ target: targetKey, weight: rel.weight });
      if (rel.bidirectional) {
        if (!graph.has(targetKey)) graph.set(targetKey, []);
        graph.get(targetKey)!.push({ target: key, weight: rel.weight * 0.85 });
      }
    }
  }

  return graph;
}

const FULL_GRAPH = buildFullGraph();

// ── BFS expansion ─────────────────────────────────────────────
// Returns a map of adjacent entity → cumulative weight (0.0–1.0).
// Depth decay: each hop multiplied by 0.6 (configurable).

export function expandEntity(
  entityId: string,
  maxDepth = 2,
  hopDecay = 0.60,
): Map<string, number> {
  const entityKey = entityId.toLowerCase().trim();
  const result = new Map<string, number>();

  interface QueueItem { id: string; weight: number; depth: number }
  const queue: QueueItem[] = [{ id: entityKey, weight: 1.0, depth: 0 }];
  const visited = new Set<string>([entityKey]);

  while (queue.length > 0) {
    const { id, weight, depth } = queue.shift()!;
    const edges = FULL_GRAPH.get(id) ?? [];

    for (const edge of edges) {
      if (visited.has(edge.target)) continue;
      visited.add(edge.target);

      const decayed = weight * edge.weight * (depth === 0 ? 1.0 : hopDecay);
      if (decayed < 0.04) continue; // prune weak connections

      const existing = result.get(edge.target) ?? 0;
      result.set(edge.target, Math.max(existing, decayed));

      if (depth + 1 < maxDepth) {
        queue.push({ id: edge.target, weight: decayed, depth: depth + 1 });
      }
    }
  }

  return result;
}

// ── Multi-entity expansion ────────────────────────────────────
// Expands a list of entities and merges the weight maps.

export function expandEntities(
  entityIds: string[],
  maxDepth = 2,
): Map<string, number> {
  const combined = new Map<string, number>();

  for (const entityId of entityIds) {
    const expanded = expandEntity(entityId, maxDepth);
    for (const [related, weight] of expanded) {
      const existing = combined.get(related) ?? 0;
      combined.set(related, Math.min(1.0, existing + weight));
    }
  }

  return combined;
}

// ── Get related entities (for discovery injection) ────────────

export interface RelatedEntity {
  entity: string;
  weight: number;
  sourceEntity: string; // which user entity triggered this connection
  description: string;  // human-readable Thai description
}

const DISCOVERY_DESCRIPTIONS: Record<string, string> = {
  "ai":            "ปัญญาประดิษฐ์กำลังเปลี่ยนอุตสาหกรรม",
  "crypto":        "ตลาดคริปโตกำลังเคลื่อนไหว",
  "stocks":        "ตลาดหุ้นกำลังได้รับผลกระทบ",
  "technology":    "แนวโน้มเทคโนโลยีกำลังเปลี่ยนแปลง",
  "nvidia":        "NVIDIA อยู่ในจุดสนใจ",
  "openai":        "OpenAI กำลังขับเคลื่อนการเปลี่ยนแปลง",
  "bitcoin":       "Bitcoin กำลังถูกจับตามอง",
  "ethereum":      "Ethereum กำลังพัฒนา",
  "federal reserve":"Fed กำลังส่งสัญญาณ",
  "inflation":     "ภาวะเงินเฟ้อกระทบตลาด",
  "startup funding":"การระดมทุน Startup กำลังคึกคัก",
  "semiconductor": "อุตสาหกรรมชิปกำลังเคลื่อนไหว",
  "defi":          "DeFi กำลังดึงดูดความสนใจ",
  "regulation":    "กฎระเบียบใหม่กำลังส่งผล",
  "china":         "จีนกำลังเป็นปัจจัยสำคัญ",
  "data center":   "Data Center กำลังขยายตัว",
};

function getDescription(entity: string): string {
  return DISCOVERY_DESCRIPTIONS[entity] ?? `${entity} กำลังมีแนวโน้มน่าสนใจ`;
}

export function getRelatedEntities(
  userEntities: string[],
  maxResults = 8,
): RelatedEntity[] {
  const combined = new Map<string, { weight: number; sourceEntity: string }>();
  const userEntitySet = new Set(userEntities.map((e) => e.toLowerCase().trim()));

  for (const entityId of userEntities) {
    const expanded = expandEntity(entityId, 2);
    for (const [related, weight] of expanded) {
      if (userEntitySet.has(related)) continue; // skip what user already tracks
      const existing = combined.get(related);
      if (!existing || weight > existing.weight) {
        combined.set(related, { weight, sourceEntity: entityId });
      }
    }
  }

  return Array.from(combined.entries())
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, maxResults)
    .map(([entity, { weight, sourceEntity }]) => ({
      entity,
      weight: Math.round(weight * 100) / 100,
      sourceEntity,
      description: getDescription(entity),
    }));
}

// ── Score text against entity graph ──────────────────────────
// Returns 0.0–1.0 how relevant this text is to the given entities.

export function scoreTextAgainstGraph(
  text: string,
  entityMap: Map<string, number>,
): { score: number; matchedEntities: string[] } {
  const lower = text.toLowerCase();
  let totalScore = 0;
  const matchedEntities: string[] = [];

  for (const [entity, weight] of entityMap) {
    if (lower.includes(entity)) {
      totalScore += weight;
      matchedEntities.push(entity);
    }
  }

  return {
    score: Math.min(1.0, totalScore),
    matchedEntities,
  };
}

// ── Get full graph snapshot (for API) ─────────────────────────

export function getGraphSnapshot(): {
  nodeCount: number;
  edgeCount: number;
  nodes: Array<{ id: string; connections: number }>;
} {
  const nodes: Array<{ id: string; connections: number }> = [];
  let totalEdges = 0;

  for (const [id, edges] of FULL_GRAPH) {
    nodes.push({ id, connections: edges.length });
    totalEdges += edges.length;
  }

  return {
    nodeCount: FULL_GRAPH.size,
    edgeCount: totalEdges,
    nodes: nodes.sort((a, b) => b.connections - a.connections),
  };
}

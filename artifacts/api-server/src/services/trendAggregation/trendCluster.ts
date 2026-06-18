// ============================================================
// TREND CLUSTER ENGINE
// Sprint 28 — Product Realignment
//
// Groups related trend entities into clusters.
// A cluster represents ONE trend story from multiple angles/sources.
// ============================================================

import type { ScoredTrend } from "./trendScoring.js";

export interface TrendCluster {
  id: string;
  headline: string;           // best headline from the cluster
  platformCount: number;      // distinct platforms covering this
  articleCount: number;
  topScore: number;           // highest trendScore in cluster
  avgScore: number;
  items: ScoredTrend[];
  tags: string[];             // union of all tags
  dominantPlatform: string;   // platform with most items
  isCrossPlatform: boolean;   // appears on 2+ platforms
}

// ── Similarity: Jaccard on tags ───────────────────────────────

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const tag of setA) if (setB.has(tag)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ── Title word overlap ────────────────────────────────────────

function titleWordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  let overlap = 0;
  for (const word of wordsA) if (wordsB.has(word)) overlap++;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : overlap / union;
}

// ── Combined similarity ───────────────────────────────────────

function areSimilar(a: ScoredTrend, b: ScoredTrend, threshold = 0.25): boolean {
  const tagSim = jaccardSimilarity(a.tags, b.tags);
  const titleSim = titleWordOverlap(a.title, b.title);
  return (tagSim * 0.6 + titleSim * 0.4) >= threshold;
}

// ── Greedy clustering ─────────────────────────────────────────

export function clusterTrends(
  scored: ScoredTrend[],
  threshold = 0.25,
): TrendCluster[] {
  const assigned = new Set<string>();
  const clusters: TrendCluster[] = [];

  // Sort by score descending — seed each cluster with the highest-scoring item
  const sorted = [...scored].sort((a, b) => b.trendScore - a.trendScore);

  for (const seed of sorted) {
    if (assigned.has(seed.id)) continue;

    const cluster: ScoredTrend[] = [seed];
    assigned.add(seed.id);

    for (const candidate of sorted) {
      if (assigned.has(candidate.id)) continue;
      if (areSimilar(seed, candidate, threshold)) {
        cluster.push(candidate);
        assigned.add(candidate.id);
      }
    }

    clusters.push(buildCluster(cluster));
  }

  return clusters;
}

function buildCluster(items: ScoredTrend[]): TrendCluster {
  const allTags = [...new Set(items.flatMap((i) => i.tags))];
  const platforms = items.map((i) => i.platform);
  const platformCounts = platforms.reduce((acc, p) => {
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dominantPlatform = Object.entries(platformCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? "unknown";

  const distinctPlatforms = new Set(platforms).size;
  const topItem = items[0]; // already sorted by score

  // Seed ID from top item
  let hash = 0;
  for (const ch of topItem.id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffff;
  const id = `cluster_${hash.toString(36)}`;

  return {
    id,
    headline: topItem.title,
    platformCount: distinctPlatforms,
    articleCount: items.length,
    topScore: Math.max(...items.map((i) => i.trendScore)),
    avgScore: Math.round(items.reduce((s, i) => s + i.trendScore, 0) / items.length),
    items,
    tags: allTags,
    dominantPlatform,
    isCrossPlatform: distinctPlatforms >= 2,
  };
}

// ── Update platform coverage on scored trends ─────────────────

export function enrichWithClusterData(
  clusters: TrendCluster[],
  scored: ScoredTrend[],
): ScoredTrend[] {
  const coverageMap = new Map<string, number>();
  for (const cluster of clusters) {
    for (const item of cluster.items) {
      coverageMap.set(item.id, cluster.platformCount);
    }
  }
  return scored.map((s) => ({
    ...s,
    platformCoverage: coverageMap.get(s.id) ?? 1,
  }));
}

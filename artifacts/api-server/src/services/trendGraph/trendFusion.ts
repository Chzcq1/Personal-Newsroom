// ============================================================
// TREND FUSION — Discovery Injection Engine
// Sprint 29 — Real-Time Trend Intelligence
//
// Uses the entity graph to:
//   1. Find adjacent trends the user doesn't already follow
//   2. Explain WHY each trend is relevant to user interests
//   3. Inject discovery items every 6-8 feed positions
//
// Token cost: ZERO — purely rule-based, no AI calls.
// ============================================================

import { getRelatedEntities, expandEntities, scoreTextAgainstGraph } from "./entityGraph.js";
import type { TrendItem } from "../trendIngestion/index.js";

// ── Discovery injection item ──────────────────────────────────

export interface DiscoveryItem {
  entity: string;
  weight: number;
  sourceEntity: string;
  description: string;
  reason: string;          // human-readable "Why this?"
  trendItems: TrendItem[];  // supporting live trends (if any)
}

// ── Build discovery injections ────────────────────────────────
// Given user interests + active trend items, returns ranked
// discovery suggestions from adjacent entities in the graph.

export function buildDiscoveryInjections(
  userInterests: string[],
  activeTrends: TrendItem[],
  maxInjections = 5,
): DiscoveryItem[] {
  if (userInterests.length === 0) return [];

  const related = getRelatedEntities(userInterests, 12);

  return related.slice(0, maxInjections).map((rel) => {
    // Find any active trend items that match this adjacent entity
    const supportingTrends = activeTrends.filter((t) => {
      const text = `${t.title} ${t.summary ?? ""}`.toLowerCase();
      return text.includes(rel.entity.toLowerCase()) ||
        t.entityTags.some((tag) => tag.toLowerCase().includes(rel.entity.toLowerCase()));
    }).slice(0, 3);

    const reason = buildDiscoveryReason(rel.entity, rel.sourceEntity, supportingTrends);

    return {
      entity: rel.entity,
      weight: rel.weight,
      sourceEntity: rel.sourceEntity,
      description: rel.description,
      reason,
      trendItems: supportingTrends,
    };
  });
}

function buildDiscoveryReason(
  entity: string,
  sourceEntity: string,
  supportingTrends: TrendItem[],
): string {
  const parts: string[] = [];

  parts.push(`เชื่อมกับ ${sourceEntity} ที่คุณติดตาม`);

  if (supportingTrends.length > 0) {
    const platforms = [...new Set(supportingTrends.map((t) => t.source))];
    if (platforms.length > 1) {
      parts.push(`กำลัง trend ใน ${platforms.slice(0, 2).join(" + ")}`);
    } else if (platforms[0]) {
      parts.push(`กำลัง trend ใน ${platforms[0]}`);
    }
  }

  return parts.join(" · ");
}

// ── Fuse trends by entity graph ───────────────────────────────
// Groups trend items that are connected in the entity graph.
// Returns clusters of related trends with their connection reason.

export interface TrendClusterFused {
  coreEntity: string;
  items: TrendItem[];
  adjacentEntities: string[];
  platformCount: number;
  platforms: string[];
  totalEngagement: number;
  momentumDescription: string;
}

export function fuseByEntityGraph(
  trends: TrendItem[],
  userInterests: string[],
): TrendClusterFused[] {
  if (trends.length === 0) return [];

  // Build entity map from user interests
  const entityMap = expandEntities(userInterests, 2);

  // Group trends by their dominant entity tag
  const byEntity = new Map<string, TrendItem[]>();

  for (const trend of trends) {
    // Find best matching entity
    let bestEntity = "";
    let bestScore = 0;

    const text = `${trend.title} ${trend.summary ?? ""}`;
    for (const [entity, weight] of entityMap) {
      if (text.toLowerCase().includes(entity) && weight > bestScore) {
        bestScore = weight;
        bestEntity = entity;
      }
    }

    // Also check entity tags directly
    for (const tag of trend.entityTags) {
      const tagLower = tag.toLowerCase();
      if (entityMap.has(tagLower)) {
        const w = entityMap.get(tagLower) ?? 0;
        if (w > bestScore) {
          bestScore = w;
          bestEntity = tagLower;
        }
      }
    }

    const key = bestEntity || trend.topicTags[0] || "general";
    if (!byEntity.has(key)) byEntity.set(key, []);
    byEntity.get(key)!.push(trend);
  }

  // Convert to fused clusters
  const clusters: TrendClusterFused[] = [];

  for (const [entity, items] of byEntity) {
    const platforms = [...new Set(items.map((i) => i.source))];
    const totalEngagement = items.reduce((s, i) => s + i.engagementScore, 0);
    const adjacentMap = expandEntities([entity], 1);
    const adjacentEntities = Array.from(adjacentMap.keys())
      .filter((e) => e !== entity)
      .slice(0, 4);

    clusters.push({
      coreEntity: entity,
      items,
      adjacentEntities,
      platformCount: platforms.length,
      platforms,
      totalEngagement,
      momentumDescription: buildMomentumDescription(platforms, totalEngagement),
    });
  }

  return clusters.sort((a, b) => b.totalEngagement - a.totalEngagement);
}

function buildMomentumDescription(platforms: string[], engagement: number): string {
  if (platforms.length >= 3) return "กำลัง trend ทุกแพลตฟอร์ม";
  if (platforms.length === 2) return `กำลัง trend ใน ${platforms.join(" + ")}`;
  if (engagement > 10000) return "ความสนใจสูงมาก";
  if (engagement > 1000) return "ความสนใจกำลังเพิ่มขึ้น";
  return "อยู่ในความสนใจ";
}

// ── Article-to-trend matching ─────────────────────────────────
// Given an article's text + topic, find matching active trends.

export interface ArticleTrendMatch {
  trend: TrendItem;
  matchScore: number;  // 0.0–1.0
  matchedPlatforms: string[];
  matchedEntities: string[];
  region: string | null;
}

export function matchArticleToTrends(
  articleTitle: string,
  articleDescription: string | null,
  articleTopicId: string,
  activeTrends: TrendItem[],
  userInterests: string[],
): ArticleTrendMatch[] {
  const text = `${articleTitle} ${articleDescription ?? ""}`.toLowerCase();
  const matches: ArticleTrendMatch[] = [];
  const entityMap = expandEntities(userInterests, 2);

  for (const trend of activeTrends) {
    const trendText = `${trend.title} ${trend.summary ?? ""}`.toLowerCase();

    // 1. Word overlap score
    const articleWords = tokenize(text);
    const trendWords = tokenize(trendText);
    const sharedWords = articleWords.filter((w) => trendWords.includes(w));
    const wordOverlap = sharedWords.length >= 2
      ? Math.min(0.5, sharedWords.length * 0.12)
      : 0;

    // 2. Entity tag overlap
    const matchedEntities: string[] = [];
    let entityScore = 0;
    for (const tag of trend.entityTags) {
      if (text.includes(tag.toLowerCase())) {
        matchedEntities.push(tag);
        entityScore += 0.20;
      }
    }

    // 3. Topic match
    const topicScore = trend.topicTags.includes(articleTopicId) ? 0.20 : 0;

    // 4. Graph proximity bonus
    const { score: graphScore } = scoreTextAgainstGraph(
      `${articleTitle} ${articleDescription ?? ""}`,
      entityMap,
    );
    const graphBonus = graphScore * 0.15;

    const totalScore = Math.min(1.0, wordOverlap + entityScore + topicScore + graphBonus);

    if (totalScore >= 0.18) {
      // Detect region from trend metadata
      const region = detectRegion(trend);

      matches.push({
        trend,
        matchScore: totalScore,
        matchedPlatforms: [trend.source],
        matchedEntities,
        region,
      });
    }
  }

  // Deduplicate by source + entity, take top 3
  return matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .filter((w) => !STOPWORDS.has(w));
}

const STOPWORDS = new Set([
  "this", "that", "with", "from", "have", "will", "been",
  "what", "when", "where", "which", "their", "there",
  "about", "more", "than", "into", "some", "over", "after",
  "also", "they", "were", "said", "each", "many", "most",
]);

function detectRegion(trend: TrendItem): string | null {
  const text = `${trend.title} ${trend.summary ?? ""}`.toLowerCase();
  if (text.includes("thailand") || text.includes("thai") || text.includes("ไทย")) return "Thailand";
  if (trend.source === "reddit") return "Global";
  if (trend.source === "googlenews") return "Global";
  return null;
}

// ── Build trend meta for a feed item ─────────────────────────
// Returns the trendMeta object attached to each feed item.

export interface TrendMeta {
  momentumScore: number;                                          // 0–100
  momentumLabel: "exploding" | "rising" | "stable" | "fading";
  platforms: string[];
  regions: string[];
  whyTrending: string;
  discussionCount: number;
  adjacentEntities: string[];
  matchedTrends: number;
}

export function buildTrendMeta(
  matches: ArticleTrendMatch[],
  entityMap: Map<string, number>,
  articleTitle: string,
  articleDescription: string | null,
): TrendMeta {
  if (matches.length === 0) {
    return {
      momentumScore: 0,
      momentumLabel: "stable",
      platforms: [],
      regions: [],
      whyTrending: "",
      discussionCount: 0,
      adjacentEntities: [],
      matchedTrends: 0,
    };
  }

  const platforms = [...new Set(matches.flatMap((m) => m.matchedPlatforms))];
  const regions = [...new Set(matches.map((m) => m.region).filter(Boolean) as string[])];
  const totalEngagement = matches.reduce((s, m) => s + m.trend.engagementScore, 0);
  const topMatch = matches[0];

  const momentumScore = Math.min(
    100,
    Math.round(
      topMatch.matchScore * 60 +
      Math.min(30, platforms.length * 10) +
      Math.min(10, Math.log10(totalEngagement + 1) * 3),
    ),
  );

  const momentumLabel: TrendMeta["momentumLabel"] =
    momentumScore >= 75 ? "exploding" :
    momentumScore >= 50 ? "rising" :
    momentumScore >= 25 ? "stable" : "fading";

  const { matchedEntities: graphEntities } = scoreTextAgainstGraph(
    `${articleTitle} ${articleDescription ?? ""}`,
    entityMap,
  );

  const whyTrending = buildWhyTrending(platforms, regions, topMatch.matchedEntities);

  return {
    momentumScore,
    momentumLabel,
    platforms,
    regions,
    whyTrending,
    discussionCount: totalEngagement,
    adjacentEntities: graphEntities.slice(0, 4),
    matchedTrends: matches.length,
  };
}

function buildWhyTrending(
  platforms: string[],
  regions: string[],
  entities: string[],
): string {
  const parts: string[] = [];

  if (platforms.length >= 2) {
    parts.push(`Trending across ${platforms.slice(0, 2).join(" + ")}`);
  } else if (platforms[0]) {
    parts.push(`Trending on ${platforms[0]}`);
  }

  if (regions.includes("Thailand")) {
    parts.push("Exploding in Thailand");
  }

  if (entities.length > 0) {
    parts.push(`${entities.slice(0, 2).join(", ")} in focus`);
  }

  return parts.join(" · ");
}

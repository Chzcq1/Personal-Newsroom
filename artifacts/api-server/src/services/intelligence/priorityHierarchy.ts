// ============================================================
// PRIORITY HIERARCHY ENGINE — Sprint 16 Task B
//
// Classifies narratives and articles into a 5-tier hierarchy:
//   Critical   — breaking, market-moving, geopolitically significant
//   Major      — confirmed multi-source, high-entity, strong trend
//   Emerging   — 1–2 sources, early signal, accelerating
//   Contextual — background, low urgency, single-source
//   Noise      — low-quality, clickbait, no entity, not confirmed
//
// Inputs:
//   - PrioritizedArticle[] from signalPriorityEngine
//   - NarrativeCluster[] from narrativeCluster
//   - SignalMode from signalModeEngine (thresholds shift per mode)
//
// Output:
//   HierarchyResult — tiered structure ready for feed rendering
//
// Architecture: pure functions, no I/O, no side effects.
// ============================================================

import type { PrioritizedArticle } from "./signalPriorityEngine.js";
import type { NarrativeCluster } from "./narrativeCluster.js";
import { getSignalMode, getSignalModeConfig } from "./signalModeEngine.js";

// ── Hierarchy tier definitions ────────────────────────────────

export type HierarchyTier = "critical" | "major" | "emerging" | "contextual" | "noise";

export interface TierConfig {
  id: HierarchyTier;
  label: string;
  emoji: string;
  minPriorityScore: number;  // baseline (adjusted by signal mode)
  color: string;             // Tailwind color key
  showInFeed: boolean;
  collapseByDefault: boolean;
}

export const TIER_CONFIGS: Record<HierarchyTier, TierConfig> = {
  critical: {
    id: "critical",
    label: "Breaking Signal",
    emoji: "⚡",
    minPriorityScore: 100,
    color: "red",
    showInFeed: true,
    collapseByDefault: false,
  },
  major: {
    id: "major",
    label: "Major Development",
    emoji: "◆",
    minPriorityScore: 70,
    color: "orange",
    showInFeed: true,
    collapseByDefault: false,
  },
  emerging: {
    id: "emerging",
    label: "Emerging Signal",
    emoji: "▲",
    minPriorityScore: 40,
    color: "amber",
    showInFeed: true,
    collapseByDefault: false,
  },
  contextual: {
    id: "contextual",
    label: "Context",
    emoji: "◎",
    minPriorityScore: 20,
    color: "slate",
    showInFeed: true,
    collapseByDefault: true,
  },
  noise: {
    id: "noise",
    label: "Filtered",
    emoji: "–",
    minPriorityScore: 0,
    color: "zinc",
    showInFeed: false,
    collapseByDefault: true,
  },
};

// ── Classified narrative ──────────────────────────────────────

export interface ClassifiedNarrative {
  cluster: NarrativeCluster;
  tier: HierarchyTier;
  tierConfig: TierConfig;
  heroArticle: PrioritizedArticle | null;
  supportingArticles: PrioritizedArticle[];
  peakScore: number;
  urgencySignals: string[];   // human-readable reasons for tier assignment
  momentumLabel: "accelerating" | "stable" | "fading";
}

export interface ClassifiedArticle {
  article: PrioritizedArticle;
  tier: HierarchyTier;
  tierConfig: TierConfig;
  urgencySignals: string[];
}

export interface HierarchyResult {
  critical: ClassifiedNarrative[];
  major: ClassifiedNarrative[];
  emerging: ClassifiedNarrative[];
  contextual: ClassifiedNarrative[];
  noise: ClassifiedNarrative[];
  unclusteredArticles: ClassifiedArticle[];
  stats: {
    totalNarratives: number;
    totalArticles: number;
    noiseFiltered: number;
    signalRatio: number;
    signalMode: string;
    topTier: HierarchyTier | null;
  };
}

// ── Tier assignment ───────────────────────────────────────────

function assignTier(
  score: number,
  isMultiSource: boolean,
  signalMode: string,
): HierarchyTier {
  const config = getSignalModeConfig();

  // In RAW mode: lower thresholds — accept emerging signals faster
  // In SAFE mode: raise thresholds — only confirmed signals advance
  const modeMultiplier =
    signalMode === "raw" ? 0.75 :
    signalMode === "safe" ? 1.3 :
    1.0;

  const adjustedScore = score / modeMultiplier;

  if (adjustedScore >= 100) return "critical";
  if (adjustedScore >= 70 && isMultiSource) return "major";
  if (adjustedScore >= 70) return "emerging";   // single-source high score
  if (adjustedScore >= 40) return "emerging";
  if (adjustedScore >= config.minPriorityScore) return "contextual";
  return "noise";
}

function buildUrgencySignals(
  cluster: NarrativeCluster,
  topArticle: PrioritizedArticle | null,
): string[] {
  const signals: string[] = [];

  if (cluster.isMultiSource) {
    signals.push(`Confirmed by ${cluster.sourceCount} sources`);
  }
  if (topArticle) {
    const bd = topArticle.priorityScore.breakdown;
    if (bd.impact >= 20) signals.push("High market/geopolitical impact");
    if (bd.acceleration >= 14) signals.push("Story accelerating rapidly");
    if (bd.entityImportance >= 16) signals.push("Major entity involved");
    if (bd.sourceTrust >= 28) signals.push("Tier A source confirmed");
    if (bd.narrativePersistence >= 10) signals.push("Ongoing narrative");
  }

  return signals.slice(0, 3);
}

function getMomentumLabel(
  cluster: NarrativeCluster,
): ClassifiedNarrative["momentumLabel"] {
  const count = cluster.articles.length;
  if (count >= 4) return "accelerating";
  if (count >= 2) return "stable";
  return "fading";
}

// ── Main classification function ──────────────────────────────

/**
 * Classify narratives and standalone articles into a 5-tier hierarchy.
 * The result is directly consumed by the feed rendering layer.
 */
export function classifyHierarchy(
  clusters: NarrativeCluster[],
  articles: PrioritizedArticle[],
): HierarchyResult {
  const mode = getSignalMode();
  const result: HierarchyResult = {
    critical: [],
    major: [],
    emerging: [],
    contextual: [],
    noise: [],
    unclusteredArticles: [],
    stats: {
      totalNarratives: clusters.length,
      totalArticles: articles.length,
      noiseFiltered: 0,
      signalRatio: 0,
      signalMode: mode,
      topTier: null,
    },
  };

  // Build article URL → article map for fast lookup
  const articleMap = new Map<string, PrioritizedArticle>(
    articles.map((a) => [a.url, a]),
  );

  const clusteredUrls = new Set<string>();

  // ── Classify clusters ──────────────────────────────────────
  for (const cluster of clusters) {
    const clusterArticles: PrioritizedArticle[] = cluster.articles
      .map((a) => articleMap.get(a.url))
      .filter((a): a is PrioritizedArticle => a !== undefined);

    // Mark as clustered
    for (const a of clusterArticles) clusteredUrls.add(a.url);

    const peakScore = clusterArticles.reduce(
      (max, a) => Math.max(max, a.priorityScore.total), 0,
    );

    const heroArticle = clusterArticles.sort(
      (a, b) => b.priorityScore.total - a.priorityScore.total,
    )[0] ?? null;

    const supporting = clusterArticles.filter((a) => a.url !== heroArticle?.url);

    const tier = assignTier(peakScore, cluster.isMultiSource, mode);
    const tierConfig = TIER_CONFIGS[tier];

    const classified: ClassifiedNarrative = {
      cluster,
      tier,
      tierConfig,
      heroArticle,
      supportingArticles: supporting,
      peakScore,
      urgencySignals: buildUrgencySignals(cluster, heroArticle),
      momentumLabel: getMomentumLabel(cluster),
    };

    result[tier].push(classified);
  }

  // ── Classify unclustered articles ─────────────────────────
  const unclustered = articles.filter((a) => !clusteredUrls.has(a.url));
  for (const article of unclustered) {
    const tier = assignTier(
      article.priorityScore.total,
      false,
      mode,
    );
    const tierConfig = TIER_CONFIGS[tier];
    result.unclusteredArticles.push({
      article,
      tier,
      tierConfig,
      urgencySignals: buildUrgencySignals(
        {
          id: article.url,
          headline: article.title,
          theme: "standalone",
          isMultiSource: false,
          articles: [{ url: article.url, title: article.title, source: article.source }],
          dominantEntity: null,
          sourceCount: 1,
          avgCombinedScore: article.priorityScore.total,
          agentContext: {
            clusterType: "event" as const,
            keyTerms: [],
            canBeSharedBetweenAgents: false,
          },
        } satisfies NarrativeCluster,
        article,
      ),
    });
  }

  // ── Stats ──────────────────────────────────────────────────
  const noiseCount =
    result.noise.length +
    result.unclusteredArticles.filter((a) => a.tier === "noise").length;

  const signalCount =
    result.critical.length + result.major.length + result.emerging.length;

  result.stats.noiseFiltered = noiseCount;
  result.stats.signalRatio =
    result.stats.totalNarratives > 0
      ? Math.round((signalCount / result.stats.totalNarratives) * 100)
      : 0;

  if (result.critical.length > 0) result.stats.topTier = "critical";
  else if (result.major.length > 0) result.stats.topTier = "major";
  else if (result.emerging.length > 0) result.stats.topTier = "emerging";
  else if (result.contextual.length > 0) result.stats.topTier = "contextual";
  else result.stats.topTier = null;

  return result;
}

/**
 * Flatten the hierarchy into a ranked feed order for the main feed.
 * Critical > Major > Emerging > Contextual (noise always hidden).
 */
export function flattenHierarchy(
  hierarchy: HierarchyResult,
): ClassifiedNarrative[] {
  return [
    ...hierarchy.critical,
    ...hierarchy.major,
    ...hierarchy.emerging,
    ...hierarchy.contextual,
  ];
}

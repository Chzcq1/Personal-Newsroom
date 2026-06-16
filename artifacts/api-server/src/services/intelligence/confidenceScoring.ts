// ============================================================
// CONFIDENCE SCORING — Sprint 16 Task D
//
// Generates a confidence score (0–100) for each article/narrative.
//
// Dimensions:
//   sourceAgreement  — how many independent sources confirm
//   freshnessScore   — how recent the signal is
//   signalMaturity   — emerging → developing → confirmed → institutional
//   trustLevel       — source tier quality
//
// Signal classes:
//   Experimental      0–19   single source, unverified, fresh rumour
//   Early Signal     20–39   1–2 sources, recent, low entity weight
//   Developing       40–59   2+ sources, moderate entity, ongoing
//   Confirmed        60–79   multi-source, Tier A confirmed, recent
//   Institutional    80–100  Tier A + multi-source + high impact + fresh
//
// Architecture: pure functions, no I/O, no side effects.
// ============================================================

import type { RssArticle } from "../news/rssService.js";
import type { PriorityScore } from "./signalPriorityEngine.js";
import { getSourceTier } from "../news/sourceRegistry.js";

// ── Signal class ──────────────────────────────────────────────

export type SignalClass =
  | "experimental"
  | "early_signal"
  | "developing"
  | "confirmed"
  | "institutional";

export interface SignalClassConfig {
  id: SignalClass;
  label: string;
  shortLabel: string;
  description: string;
  minScore: number;
  color: string;      // Tailwind color key
  badgeBg: string;    // Tailwind bg class
  badgeText: string;  // Tailwind text class
  icon: string;       // Lucide icon name
}

export const SIGNAL_CLASS_CONFIGS: Record<SignalClass, SignalClassConfig> = {
  experimental: {
    id: "experimental",
    label: "Experimental",
    shortLabel: "EXP",
    description: "Unverified signal — single source, no confirmation",
    minScore: 0,
    color: "zinc",
    badgeBg: "bg-zinc-500/10",
    badgeText: "text-zinc-400",
    icon: "flask-conical",
  },
  early_signal: {
    id: "early_signal",
    label: "Early Signal",
    shortLabel: "EARLY",
    description: "Emerging signal — limited confirmation, watch closely",
    minScore: 20,
    color: "yellow",
    badgeBg: "bg-yellow-500/10",
    badgeText: "text-yellow-400",
    icon: "radar",
  },
  developing: {
    id: "developing",
    label: "Developing",
    shortLabel: "DEV",
    description: "Story developing — multiple sources, not yet confirmed",
    minScore: 40,
    color: "blue",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-400",
    icon: "trending-up",
  },
  confirmed: {
    id: "confirmed",
    label: "Confirmed",
    shortLabel: "CONF",
    description: "Confirmed signal — multi-source, Tier A verified",
    minScore: 60,
    color: "emerald",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
    icon: "check-circle",
  },
  institutional: {
    id: "institutional",
    label: "Institutional",
    shortLabel: "INST",
    description: "Institutional-grade signal — highest verification standard",
    minScore: 80,
    color: "violet",
    badgeBg: "bg-violet-500/10",
    badgeText: "text-violet-400",
    icon: "shield-check",
  },
};

// ── Confidence score result ───────────────────────────────────

export interface ConfidenceScore {
  total: number;                  // 0–100 composite
  breakdown: {
    sourceAgreement: number;      // 0–30: unique sources confirming
    freshness: number;            // 0–25: how recent
    sourceTrust: number;          // 0–25: tier quality
    narrativeMaturity: number;    // 0–20: story persistence
  };
  signalClass: SignalClass;
  signalClassConfig: SignalClassConfig;
  trustLabel: string;
  sourceAgreementCount: number;   // raw count of confirming sources
  freshnessHours: number;         // age of article in hours
  isMultiSource: boolean;
}

// ── Scoring helpers ───────────────────────────────────────────

function scoreSourceAgreement(
  article: RssArticle,
  allArticles: RssArticle[],
): { score: number; count: number } {
  const titleWords = article.title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);

  if (titleWords.length < 3) return { score: 0, count: 1 };

  const coreWords = new Set(titleWords.slice(0, 8));

  const confirming = allArticles.filter((other) => {
    if (other.url === article.url) return false;
    if (other.source === article.source) return false;
    const otherWords = other.title.toLowerCase().split(/\s+/);
    const overlap = otherWords.filter((w) => coreWords.has(w)).length;
    return overlap >= 3;
  });

  const uniqueSources = new Set(confirming.map((a) => a.source)).size;

  let score = 0;
  if (uniqueSources === 0) score = 0;
  else if (uniqueSources === 1) score = 10;
  else if (uniqueSources === 2) score = 18;
  else if (uniqueSources === 3) score = 25;
  else score = 30;

  return { score, count: uniqueSources + 1 };
}

function scoreFreshness(article: RssArticle): { score: number; hours: number } {
  if (!article.pubDate) return { score: 10, hours: 12 };
  const hours = (Date.now() - new Date(article.pubDate).getTime()) / 3_600_000;

  let score: number;
  if (hours <= 1) score = 25;
  else if (hours <= 3) score = 22;
  else if (hours <= 6) score = 18;
  else if (hours <= 12) score = 12;
  else if (hours <= 24) score = 7;
  else score = 2;

  return { score, hours: Math.round(hours * 10) / 10 };
}

function scoreSourceTrust(article: RssArticle): number {
  const tier = getSourceTier(article.source);
  switch (tier) {
    case "A": return 25;
    case "B": return 15;
    default:  return 5;
  }
}

function scoreNarrativeMaturity(priorityScore?: PriorityScore): number {
  if (!priorityScore) return 5;
  const persistence = priorityScore.breakdown.narrativePersistence;
  const acceleration = priorityScore.breakdown.acceleration;
  // High persistence + acceleration = mature narrative
  return Math.min(20, Math.round((persistence + acceleration) / 3.5));
}

function classifySignal(score: number): SignalClass {
  if (score >= 80) return "institutional";
  if (score >= 60) return "confirmed";
  if (score >= 40) return "developing";
  if (score >= 20) return "early_signal";
  return "experimental";
}

function buildTrustLabel(
  signalClass: SignalClass,
  sourceCount: number,
  isMultiSource: boolean,
): string {
  switch (signalClass) {
    case "institutional":
      return `Institutional-grade · ${sourceCount} verified sources`;
    case "confirmed":
      return isMultiSource
        ? `Confirmed · ${sourceCount} independent sources`
        : "Confirmed · Tier A source";
    case "developing":
      return `Developing · ${sourceCount} source${sourceCount > 1 ? "s" : ""}`;
    case "early_signal":
      return "Early signal · limited confirmation";
    default:
      return "Experimental · unverified signal";
  }
}

// ── Main scoring function ─────────────────────────────────────

export function scoreConfidence(
  article: RssArticle,
  allArticles: RssArticle[],
  priorityScore?: PriorityScore,
): ConfidenceScore {
  const { score: agreementScore, count: sourceCount } =
    scoreSourceAgreement(article, allArticles);
  const { score: freshnessScore, hours: freshnessHours } =
    scoreFreshness(article);
  const trustScore = scoreSourceTrust(article);
  const maturityScore = scoreNarrativeMaturity(priorityScore);

  const total = Math.min(
    100,
    agreementScore + freshnessScore + trustScore + maturityScore,
  );
  const signalClass = classifySignal(total);
  const signalClassConfig = SIGNAL_CLASS_CONFIGS[signalClass];
  const isMultiSource = sourceCount >= 2;

  return {
    total,
    breakdown: {
      sourceAgreement: agreementScore,
      freshness: freshnessScore,
      sourceTrust: trustScore,
      narrativeMaturity: maturityScore,
    },
    signalClass,
    signalClassConfig,
    trustLabel: buildTrustLabel(signalClass, sourceCount, isMultiSource),
    sourceAgreementCount: sourceCount,
    freshnessHours,
    isMultiSource,
  };
}

/**
 * Score confidence for a cluster of articles.
 * Uses the best-scoring article as the hero and aggregates sources.
 */
export function scoreClusterConfidence(
  articles: RssArticle[],
  priorityScore?: PriorityScore,
): ConfidenceScore {
  if (articles.length === 0) {
    return scoreConfidence(
      { title: "", url: "", source: "", pubDate: undefined, description: undefined, imageUrl: undefined },
      [],
    );
  }

  // Score each article against the full cluster
  const scores = articles.map((a) => scoreConfidence(a, articles, priorityScore));

  // Take the highest total
  const best = scores.reduce(
    (max, s) => (s.total > max.total ? s : max),
    scores[0],
  );

  // Amplify source agreement for clusters
  const uniqueSources = new Set(articles.map((a) => a.source)).size;
  const amplifiedAgreement = Math.min(30, best.breakdown.sourceAgreement + uniqueSources * 3);
  const amplifiedTotal = Math.min(
    100,
    amplifiedAgreement +
    best.breakdown.freshness +
    best.breakdown.sourceTrust +
    best.breakdown.narrativeMaturity,
  );

  const signalClass = classifySignal(amplifiedTotal);

  return {
    ...best,
    total: amplifiedTotal,
    breakdown: { ...best.breakdown, sourceAgreement: amplifiedAgreement },
    signalClass,
    signalClassConfig: SIGNAL_CLASS_CONFIGS[signalClass],
    sourceAgreementCount: uniqueSources,
    isMultiSource: uniqueSources >= 2,
    trustLabel: buildTrustLabel(signalClass, uniqueSources, uniqueSources >= 2),
  };
}

// ============================================================
// USER INTELLIGENCE PROFILE — Sprint 11 Task I
//
// Creates an evolving, dynamic intelligence profile of the user.
//
// This synthesizes signals from:
//   - Adaptive interest engine (behavioral edges)
//   - Entity memory (what entities keep appearing)
//   - Feed adaptation (explicit feedback)
//   - Narrative memory (which threads the user keeps seeing)
//   - Interest graph (declared interests + graph expansion)
//
// Profile structure:
//   Primary interests  — top 3 topics by engagement
//   Secondary interests — topics 4-8 by engagement
//   Entity focus areas  — top entities user engages with
//   Blind spots         — graph neighbors never engaged
//   Reading patterns    — when/how often user reads
//   Trend following     — which trend types user responds to
//
// Profile evolves over time and is recalculated on each feed load.
// ============================================================

import { getAdaptiveSummary } from "./adaptiveInterestEngine.js";
import { getAdaptationState } from "./feedAdaptationEngine.js";
import { getAllTrackedEntities } from "./entityMemory.js";
import { INTEREST_GRAPH } from "./interestGraph.js";

export interface InterestArea {
  id: string;
  label: string;
  confidence: number;     // 0-1 — how confident we are this is a genuine interest
  evidenceCount: number;  // number of signals supporting this
  lastSeen: string;
  trend: "growing" | "stable" | "fading";
}

export interface EntityFocus {
  entityId: string;
  label: string;
  engagementScore: number;   // 0-100
  engagements: number;
  ignores: number;
  boostMultiplier: number;
}

export interface ReadingPattern {
  avgArticlesPerSession: number;
  preferredDensity: "compact" | "detailed" | "unknown";
  feedbackRate: number;          // % of articles rated
  engagementDepth: "deep" | "shallow" | "unknown";
}

export interface UserIntelligenceProfile {
  primaryInterests: InterestArea[];
  secondaryInterests: InterestArea[];
  entityFocusAreas: EntityFocus[];
  blindSpots: string[];           // graph neighbors never engaged
  readingPattern: ReadingPattern;
  trendPreference: {
    likesEarlySignals: boolean;
    likesPeakNarratives: boolean;
    prefersEstablishedEntities: boolean;
  };
  profileStrength: number;        // 0-100, how data-rich the profile is
  lastUpdated: string;
  summary: string;                // human-readable 1-line summary
}

// ── TOPIC_LABELS for readable output ──────────────────────────
const TOPIC_LABELS: Record<string, string> = {
  ai: "AI & Machine Learning",
  technology: "Technology",
  stocks: "Financial Markets",
  economy: "Economics & Macro",
  politics: "Politics & Policy",
  crypto: "Cryptocurrency",
  climate: "Climate & Energy",
};

// ── Helpers ───────────────────────────────────────────────────

function calcTrend(current: number, baseline: number): InterestArea["trend"] {
  if (baseline === 0) return current > 0 ? "growing" : "stable";
  const ratio = current / baseline;
  if (ratio >= 1.3) return "growing";
  if (ratio <= 0.7) return "fading";
  return "stable";
}

function buildSummary(profile: Omit<UserIntelligenceProfile, "summary">): string {
  const top = profile.primaryInterests.slice(0, 2).map((i) => i.label);
  const topEntities = profile.entityFocusAreas.slice(0, 2).map((e) => e.label);
  const strength = profile.profileStrength;

  if (strength < 20) return "Building your intelligence profile — keep reading to personalise your feed";
  if (top.length === 0) return "Your interests are being discovered — rate articles to help personalise";

  let s = `Primarily follows ${top.join(" and ")}`;
  if (topEntities.length > 0) s += `. Engages most with ${topEntities.join(", ")}`;
  if (profile.trendPreference.likesEarlySignals) s += ". Responds to early signals";
  return s;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Build the user's current intelligence profile from all available signals.
 */
export function buildIntelligenceProfile(
  declaredInterests: string[],
): UserIntelligenceProfile {
  const adaptiveSummary = getAdaptiveSummary();
  const adaptationState = getAdaptationState();
  const entityMemory = getAllTrackedEntities();

  // ── Primary / secondary interests ────────────────────────────
  // Combine declared interests with behavioral signals

  const interestEngagement = new Map<string, number>();

  // Start with declared interests at baseline confidence
  for (const interest of declaredInterests) {
    interestEngagement.set(interest, 10);
  }

  // Boost from adaptive engine edges
  for (const edge of adaptiveSummary.topLearnedEdges ?? []) {
    const current = interestEngagement.get(edge.from) ?? 0;
    interestEngagement.set(edge.from, current + edge.coOccurrences * 2);
  }

  // Boost from entity adaptation
  const entityAdaptations = [...(adaptationState.topBoosted ?? []), ...(adaptationState.topSuppressed ?? [])];
  for (const ea of entityAdaptations) {
    if (ea.boostMultiplier > 1.2) {
      // Entity is boosted — infer interest
      const graphNode = INTEREST_GRAPH[ea.entityId];
      if (graphNode) {
        const current = interestEngagement.get(ea.entityId) ?? 0;
        interestEngagement.set(ea.entityId, current + ea.engagements * 3);
      }
    }
  }

  // Sort by engagement
  const sortedInterests = [...interestEngagement.entries()]
    .sort((a, b) => b[1] - a[1]);

  const allInterests: InterestArea[] = sortedInterests.map(([id, score]) => {
    const label = TOPIC_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
    return {
      id,
      label,
      confidence: Math.min(1.0, score / 50),
      evidenceCount: Math.round(score / 5),
      lastSeen: new Date().toISOString(),
      trend: "stable" as const,
    };
  });

  const primaryInterests = allInterests.slice(0, 3);
  const secondaryInterests = allInterests.slice(3, 8);

  // ── Entity focus areas ────────────────────────────────────────
  const entityFocusAreas: EntityFocus[] = entityAdaptations
    .filter((ea) => ea.engagements > 0 || ea.boostMultiplier > 1.1)
    .sort((a, b) => b.engagements - a.engagements)
    .slice(0, 10)
    .map((ea) => {
      const memEntry = entityMemory.find((e) => e.entityId === ea.entityId);
      return {
        entityId: ea.entityId,
        label: memEntry?.label ?? ea.entityId,
        engagementScore: Math.round(Math.min(100, (ea.engagements / 20) * 100)),
        engagements: ea.engagements,
        ignores: ea.ignores,
        boostMultiplier: ea.boostMultiplier,
      };
    });

  // ── Blind spots ───────────────────────────────────────────────
  // Graph neighbors of primary interests that user has never engaged with
  const engagedEntityIds = new Set(entityFocusAreas.map((e) => e.entityId));
  const blindSpots: string[] = [];

  for (const interest of primaryInterests.slice(0, 2)) {
    const graphNode = INTEREST_GRAPH[interest.id];
    if (!graphNode) continue;
    for (const edge of (graphNode.related ?? []).slice(0, 5)) {
      if (!engagedEntityIds.has(edge.target) && !declaredInterests.includes(edge.target)) {
        blindSpots.push(edge.target);
      }
    }
  }

  // ── Reading patterns ──────────────────────────────────────────
  const totalFeedback = entityAdaptations.reduce(
    (a, b) => a + b.positiveFeedback + b.negativeFeedback, 0,
  );
  const totalEngagements = entityAdaptations.reduce((a, b) => a + b.engagements, 0);
  const feedbackRate = totalEngagements > 0
    ? Math.round((totalFeedback / totalEngagements) * 100)
    : 0;

  const readingPattern: ReadingPattern = {
    avgArticlesPerSession: Math.round(totalEngagements / Math.max(1, 3)), // assume 3 sessions
    preferredDensity: "unknown",
    feedbackRate,
    engagementDepth: totalFeedback > 5 ? "deep" : totalEngagements > 10 ? "shallow" : "unknown",
  };

  // ── Trend preferences ─────────────────────────────────────────
  const expansionClusters = adaptiveSummary.expansionClusters ?? [];
  const trendPreference = {
    likesEarlySignals: expansionClusters.length > 2,
    likesPeakNarratives: entityFocusAreas.some((e) => (e.engagements ?? 0) > 5),
    prefersEstablishedEntities: entityFocusAreas.length === 0 ? true :
      entityFocusAreas.filter((e) => INTEREST_GRAPH[e.entityId]).length > entityFocusAreas.length * 0.6,
  };

  // ── Profile strength ──────────────────────────────────────────
  let profileStrength = 0;
  profileStrength += Math.min(30, declaredInterests.length * 5);
  profileStrength += Math.min(30, totalEngagements * 2);
  profileStrength += Math.min(20, totalFeedback * 4);
  profileStrength += Math.min(10, entityFocusAreas.length * 2);
  profileStrength += Math.min(10, expansionClusters.length * 3);

  const profile: Omit<UserIntelligenceProfile, "summary"> = {
    primaryInterests,
    secondaryInterests,
    entityFocusAreas,
    blindSpots: [...new Set(blindSpots)].slice(0, 5),
    readingPattern,
    trendPreference,
    profileStrength: Math.min(100, Math.round(profileStrength)),
    lastUpdated: new Date().toISOString(),
  };

  return {
    ...profile,
    summary: buildSummary(profile),
  };
}

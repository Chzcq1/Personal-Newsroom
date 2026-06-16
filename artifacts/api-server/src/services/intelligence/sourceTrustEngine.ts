// ============================================================
// SOURCE TRUST ENGINE — Sprint 18 Task B
//
// Per-source trust scoring based on observable behavior.
// Tracks factual consistency, signal quality, noise, clickbait,
// and delivery usefulness over time.
//
// Trust score (0–100) gates source prioritization, narrative memory
// weight, and AI attention allocation.
// ============================================================

import { logger } from "../../lib/logger.js";

// ── Trust score types ──────────────────────────────────────────

export type SourceStabilityClass =
  | "tier_one"     // 85–100: premium, highly reliable
  | "reliable"     // 70–84:  consistently good
  | "mixed"        // 50–69:  variable quality
  | "unreliable"   // 30–49:  frequent noise/clickbait
  | "toxic";       // <30:    chronic misinformation/noise

export interface SourceTrustProfile {
  sourceId: string;
  sourceName: string;
  trustScore: number;           // 0–100 composite
  stabilityClass: SourceStabilityClass;

  // Sub-scores (0–100 each)
  factualConsistency: number;
  signalQuality: number;
  noiseRatio: number;           // inverted: higher = more noise
  clickbaitLikelihood: number;  // higher = more clickbait
  deliveryUsefulness: number;
  userEngagementQuality: number;

  // Decay tracking
  decayRate: number;            // 0–1: how fast trust decays without data
  lastActive: string;           // ISO timestamp
  observationCount: number;
  reliabilityHistory: TrustObservation[];

  // Flags
  hasRepeatedMisinformation: boolean;
  isCryptoHeavy: boolean;
  isClickbaitHeavy: boolean;
}

export interface TrustObservation {
  timestamp: string;
  event:
    | "article_collected"
    | "article_used_in_briefing"
    | "article_rated_useful"
    | "article_rated_noise"
    | "clickbait_detected"
    | "misinformation_flagged"
    | "high_signal_confirmed"
    | "cross_confirmed";
  weight: number;         // +positive or -negative impact
  detail?: string;
}

export interface SourceDecayResult {
  sourceId: string;
  trustBefore: number;
  trustAfter: number;
  daysSinceActive: number;
  decayApplied: number;
}

// ── Clickbait detection ────────────────────────────────────────

const CLICKBAIT_PATTERNS = [
  /you won't believe/i,
  /what happened next/i,
  /\d+ reasons why/i,
  /shocking/i,
  /bombshell/i,
  /goes viral/i,
  /breaks the internet/i,
  /mind-blowing/i,
  /destroys/i,
  /JUST IN/i,
  /everyone is talking/i,
  /this is huge/i,
  /secret/i,
  /must.?see/i,
  /\?\?\?+/,
  /\!{3,}/,
  /EXPLODES?\s/i,
];

const CRYPTO_PATTERNS = [
  /\b(moon|moonshot|hodl|fud|fomo|ape|defi|nft|dao|token|altcoin|shitcoin)\b/i,
  /\b(pump|dump|rug pull|rugpull|whale|liquidat)\b/i,
  /\b(100x|1000x)\b/i,
];

const HIGH_SIGNAL_PATTERNS = [
  /\b(earnings|revenue|profit|loss)\b/i,
  /\b(gdp|inflation|interest rate|federal reserve)\b/i,
  /\b(acquisition|merger|ipo|funding)\b/i,
  /\b(regulation|lawsuit|fine|ban)\b/i,
  /\b(record|historic|first time)\b/i,
  /\b(breakthrough|launched|released|unveiled)\b/i,
];

// ── In-memory trust store ──────────────────────────────────────

const trustStore = new Map<string, SourceTrustProfile>();

// ── Default trust profile ──────────────────────────────────────

function createDefaultProfile(sourceId: string, sourceName: string): SourceTrustProfile {
  return {
    sourceId,
    sourceName,
    trustScore: 60,             // neutral starting point
    stabilityClass: "mixed",
    factualConsistency: 60,
    signalQuality: 60,
    noiseRatio: 40,
    clickbaitLikelihood: 30,
    deliveryUsefulness: 60,
    userEngagementQuality: 60,
    decayRate: 0.02,            // 2% per day without activity
    lastActive: new Date().toISOString(),
    observationCount: 0,
    reliabilityHistory: [],
    hasRepeatedMisinformation: false,
    isCryptoHeavy: false,
    isClickbaitHeavy: false,
  };
}

// ── Stability class derivation ────────────────────────────────

function deriveStabilityClass(score: number): SourceStabilityClass {
  if (score >= 85) return "tier_one";
  if (score >= 70) return "reliable";
  if (score >= 50) return "mixed";
  if (score >= 30) return "unreliable";
  return "toxic";
}

// ── Trust score computation ───────────────────────────────────

function recomputeTrustScore(profile: SourceTrustProfile): number {
  const {
    factualConsistency,
    signalQuality,
    noiseRatio,
    clickbaitLikelihood,
    deliveryUsefulness,
    userEngagementQuality,
  } = profile;

  // Weighted composite
  const score =
    factualConsistency * 0.25 +
    signalQuality * 0.25 +
    (100 - noiseRatio) * 0.15 +
    (100 - clickbaitLikelihood) * 0.15 +
    deliveryUsefulness * 0.10 +
    userEngagementQuality * 0.10;

  // Penalties
  let penalized = score;
  if (profile.hasRepeatedMisinformation) penalized -= 20;
  if (profile.isClickbaitHeavy) penalized -= 10;

  return Math.max(0, Math.min(100, Math.round(penalized)));
}

// ── Public API ────────────────────────────────────────────────

export function getSourceTrust(sourceId: string, sourceName?: string): SourceTrustProfile {
  if (!trustStore.has(sourceId)) {
    const profile = createDefaultProfile(sourceId, sourceName ?? sourceId);
    trustStore.set(sourceId, profile);
  }
  return trustStore.get(sourceId)!;
}

export function recordArticleObservation(
  sourceId: string,
  sourceName: string,
  article: { title: string; summary?: string }
): void {
  const profile = getSourceTrust(sourceId, sourceName);
  profile.lastActive = new Date().toISOString();
  profile.observationCount++;

  const titleAndSummary = `${article.title} ${article.summary ?? ""}`;

  // Detect clickbait
  const clickbaitMatches = CLICKBAIT_PATTERNS.filter((p) => p.test(titleAndSummary)).length;
  const isCrypto = CRYPTO_PATTERNS.some((p) => p.test(titleAndSummary));
  const isHighSignal = HIGH_SIGNAL_PATTERNS.some((p) => p.test(titleAndSummary));

  const observation: TrustObservation = {
    timestamp: new Date().toISOString(),
    event: "article_collected",
    weight: 0,
  };

  if (clickbaitMatches > 0) {
    observation.event = "clickbait_detected";
    observation.weight = -clickbaitMatches * 3;
    profile.clickbaitLikelihood = Math.min(100, profile.clickbaitLikelihood + clickbaitMatches * 2);
  } else if (isHighSignal) {
    observation.event = "high_signal_confirmed";
    observation.weight = 3;
    profile.signalQuality = Math.min(100, profile.signalQuality + 1);
  }

  if (isCrypto) {
    profile.isCryptoHeavy = true;
    profile.noiseRatio = Math.min(100, profile.noiseRatio + 2);
  }

  // Rolling history (keep last 100)
  profile.reliabilityHistory.push(observation);
  if (profile.reliabilityHistory.length > 100) {
    profile.reliabilityHistory.shift();
  }

  // Check for repeated clickbait
  const recentClickbait = profile.reliabilityHistory
    .slice(-20)
    .filter((o) => o.event === "clickbait_detected").length;
  if (recentClickbait >= 5) {
    profile.isClickbaitHeavy = true;
  }

  profile.trustScore = recomputeTrustScore(profile);
  profile.stabilityClass = deriveStabilityClass(profile.trustScore);
  trustStore.set(sourceId, profile);
}

export function recordArticleUsedInBriefing(sourceId: string): void {
  const profile = trustStore.get(sourceId);
  if (!profile) return;
  profile.deliveryUsefulness = Math.min(100, profile.deliveryUsefulness + 2);
  profile.reliabilityHistory.push({
    timestamp: new Date().toISOString(),
    event: "article_used_in_briefing",
    weight: 2,
  });
  profile.trustScore = recomputeTrustScore(profile);
  trustStore.set(sourceId, profile);
}

export function recordMisinformationFlag(sourceId: string, detail?: string): void {
  const profile = trustStore.get(sourceId);
  if (!profile) return;
  profile.factualConsistency = Math.max(0, profile.factualConsistency - 15);
  profile.noiseRatio = Math.min(100, profile.noiseRatio + 10);
  profile.reliabilityHistory.push({
    timestamp: new Date().toISOString(),
    event: "misinformation_flagged",
    weight: -15,
    detail,
  });
  // Check for repeated misinformation (3+ in last 30)
  const recentMisinfo = profile.reliabilityHistory
    .slice(-30)
    .filter((o) => o.event === "misinformation_flagged").length;
  if (recentMisinfo >= 3) {
    profile.hasRepeatedMisinformation = true;
  }
  profile.trustScore = recomputeTrustScore(profile);
  profile.stabilityClass = deriveStabilityClass(profile.trustScore);
  trustStore.set(sourceId, profile);
  logger.warn({ sourceId, detail }, "[SourceTrust] Misinformation flagged");
}

export function recordCrossConfirmation(sourceId: string): void {
  const profile = trustStore.get(sourceId);
  if (!profile) return;
  profile.factualConsistency = Math.min(100, profile.factualConsistency + 3);
  profile.signalQuality = Math.min(100, profile.signalQuality + 2);
  profile.reliabilityHistory.push({
    timestamp: new Date().toISOString(),
    event: "cross_confirmed",
    weight: 3,
  });
  profile.trustScore = recomputeTrustScore(profile);
  trustStore.set(sourceId, profile);
}

// ── Apply temporal decay ──────────────────────────────────────

export function applyTrustDecay(): SourceDecayResult[] {
  const results: SourceDecayResult[] = [];
  const now = Date.now();

  for (const [sourceId, profile] of trustStore.entries()) {
    const lastActiveMs = new Date(profile.lastActive).getTime();
    const daysSinceActive = (now - lastActiveMs) / (1000 * 60 * 60 * 24);

    if (daysSinceActive < 1) continue; // No decay within 24h

    const trustBefore = profile.trustScore;
    const decayApplied = profile.decayRate * daysSinceActive;
    profile.trustScore = Math.max(30, profile.trustScore - decayApplied * 100);
    profile.stabilityClass = deriveStabilityClass(profile.trustScore);

    results.push({
      sourceId,
      trustBefore,
      trustAfter: profile.trustScore,
      daysSinceActive,
      decayApplied,
    });
    trustStore.set(sourceId, profile);
  }

  return results;
}

// ── Snapshot / admin ──────────────────────────────────────────

export function getAllSourceTrustProfiles(): SourceTrustProfile[] {
  return Array.from(trustStore.values()).sort((a, b) => b.trustScore - a.trustScore);
}

export function getHighTrustSources(minScore = 70): SourceTrustProfile[] {
  return getAllSourceTrustProfiles().filter((p) => p.trustScore >= minScore);
}

export function getLowTrustSources(maxScore = 40): SourceTrustProfile[] {
  return getAllSourceTrustProfiles().filter((p) => p.trustScore <= maxScore);
}

export function getTrustSnapshot(): {
  totalSources: number;
  byStability: Record<SourceStabilityClass, number>;
  avgTrustScore: number;
  misinformationFlaggedCount: number;
} {
  const profiles = getAllSourceTrustProfiles();
  const byStability: Record<SourceStabilityClass, number> = {
    tier_one: 0,
    reliable: 0,
    mixed: 0,
    unreliable: 0,
    toxic: 0,
  };
  let totalScore = 0;
  let misinfoCount = 0;

  for (const p of profiles) {
    byStability[p.stabilityClass]++;
    totalScore += p.trustScore;
    if (p.hasRepeatedMisinformation) misinfoCount++;
  }

  return {
    totalSources: profiles.length,
    byStability,
    avgTrustScore: profiles.length > 0 ? Math.round(totalScore / profiles.length) : 0,
    misinformationFlaggedCount: misinfoCount,
  };
}

// ============================================================
// SOURCE DEPTH TIERS — Sprint 13 Task I
//
// Classifies news sources into 3 depth tiers that affect:
//   - briefing generation trust weight
//   - signal scoring multiplier
//   - narrative trust weighting
//
// Tier A: Premium intelligence sources (FT, Bloomberg, MIT TR)
//   → trust multiplier: 1.25, article weight: full
// Tier B: Quality tech/news sources (TechCrunch, The Verge, etc.)
//   → trust multiplier: 1.0, article weight: standard
// Tier C: Generic blogs, aggregators, unknown
//   → trust multiplier: 0.75, article weight: reduced
//
// Usage: getSourceTier(sourceName) → SourceTierInfo
// ============================================================

export type SourceTier = "A" | "B" | "C";

export interface SourceTierInfo {
  tier: SourceTier;
  trustMultiplier: number;
  label: string;
  reason: string;
}

// ── Tier A: Premium Intelligence ─────────────────────────────

const TIER_A_SOURCES = new Set([
  "Financial Times",
  "FT",
  "Bloomberg",
  "Bloomberg Technology",
  "Bloomberg Economics",
  "Bloomberg Markets",
  "MIT Technology Review",
  "The Economist",
  "Wall Street Journal",
  "WSJ",
  "Reuters",
  "Reuters Business",
  "Reuters Economy",
  "Reuters Technology",
  "Reuters Politics",
  "Associated Press",
  "AP",
  "AP Business",
  "AP Technology",
  "AP Politics",
  "Nature",
  "Science",
  "Harvard Business Review",
]);

// ── Tier B: Quality Specialist Sources ───────────────────────

const TIER_B_SOURCES = new Set([
  "TechCrunch",
  "The Verge",
  "The Verge AI",
  "Ars Technica",
  "Ars Technica AI",
  "Wired",
  "VentureBeat",
  "Hacker News",
  "9to5Mac",
  "9to5Google",
  "Engadget",
  "The Hill",
  "Politico",
  "Axios",
  "Axios Technology",
  "BBC",
  "BBC Technology",
  "BBC Business",
  "BBC Politics",
  "Guardian Technology",
  "Guardian",
  "NPR",
  "MarketWatch",
  "CNBC",
  "Forbes Technology",
  "Business Insider",
  "Quartz",
  "Fast Company",
  "Protocol",
  "IEEE Spectrum",
  "Slashdot",
]);

// ── Tier registry ──────────────────────────────────────────────

const TIER_A_INFO: SourceTierInfo = {
  tier: "A",
  trustMultiplier: 1.25,
  label: "Tier A",
  reason: "Premium intelligence source — primary analysis weight",
};

const TIER_B_INFO: SourceTierInfo = {
  tier: "B",
  trustMultiplier: 1.0,
  label: "Tier B",
  reason: "Quality specialist source — standard weight",
};

const TIER_C_INFO: SourceTierInfo = {
  tier: "C",
  trustMultiplier: 0.75,
  label: "Tier C",
  reason: "Generic or aggregator source — reduced weight",
};

// ── Public API ─────────────────────────────────────────────────

export function getSourceTier(sourceName: string): SourceTierInfo {
  if (TIER_A_SOURCES.has(sourceName)) return TIER_A_INFO;
  if (TIER_B_SOURCES.has(sourceName)) return TIER_B_INFO;

  // Fuzzy match for partial names (e.g. "Reuters - Business" → Tier A)
  const lower = sourceName.toLowerCase();
  if (
    lower.includes("reuters") ||
    lower.includes("financial times") ||
    lower.includes("bloomberg") ||
    lower.includes("associated press") ||
    lower.includes("wall street journal")
  ) {
    return TIER_A_INFO;
  }
  if (
    lower.includes("techcrunch") ||
    lower.includes("the verge") ||
    lower.includes("ars technica") ||
    lower.includes("wired") ||
    lower.includes("bbc") ||
    lower.includes("axios") ||
    lower.includes("cnbc")
  ) {
    return TIER_B_INFO;
  }

  return TIER_C_INFO;
}

/**
 * Apply source depth multipliers to a batch of articles.
 * Returns articles with a `depthScore` field appended.
 */
export function applySourceDepthScores<T extends { source?: string; signalScore?: number }>(
  articles: T[],
): Array<T & { depthScore: number; sourceTier: SourceTier }> {
  return articles.map((a) => {
    const tierInfo = getSourceTier(a.source ?? "");
    const base = a.signalScore ?? 50;
    return {
      ...a,
      depthScore: Math.min(100, Math.round(base * tierInfo.trustMultiplier)),
      sourceTier: tierInfo.tier,
    };
  });
}

/**
 * Generate a source depth summary string for briefing context.
 * Tells the AI which sources are highest-trust for this batch.
 */
export function buildSourceDepthContext(
  articles: Array<{ source?: string }>,
  maxSources = 5,
): string {
  const tierA: string[] = [];
  const tierB: string[] = [];

  for (const a of articles) {
    const name = a.source ?? "";
    const tier = getSourceTier(name);
    if (tier.tier === "A" && !tierA.includes(name)) tierA.push(name);
    else if (tier.tier === "B" && !tierB.includes(name)) tierB.push(name);
  }

  const parts: string[] = [];
  if (tierA.length > 0) {
    parts.push(`แหล่งชั้น 1 (วิเคราะห์ได้สูง): ${tierA.slice(0, maxSources).join(", ")}`);
  }
  if (tierB.length > 0) {
    parts.push(`แหล่งชั้น 2: ${tierB.slice(0, maxSources).join(", ")}`);
  }
  return parts.join("\n");
}

/**
 * Sort articles preferring Tier A → B → C, then by signal score.
 */
export function sortBySourceDepth<T extends { source?: string; signalScore?: number }>(
  articles: T[],
): T[] {
  const tierOrder: Record<SourceTier, number> = { A: 0, B: 1, C: 2 };
  return [...articles].sort((a, b) => {
    const ta = tierOrder[getSourceTier(a.source ?? "").tier];
    const tb = tierOrder[getSourceTier(b.source ?? "").tier];
    if (ta !== tb) return ta - tb;
    return (b.signalScore ?? 0) - (a.signalScore ?? 0);
  });
}

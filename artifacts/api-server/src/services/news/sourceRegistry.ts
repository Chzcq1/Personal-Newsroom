// ============================================================
// SOURCE REGISTRY — Sprint 6 Task G
//
// Centralized source quality registry.
// Maps known source names to quality tiers used for feed scoring.
//
// Tier A = premium (FT, Bloomberg, Economist) → +15 score bonus
// Tier B = quality (TechCrunch, Ars, Verge)   → +8 score bonus
// Tier C = general (everything else)           → +0
//
// Custom sources can be registered at runtime for dynamic topics.
// ============================================================

export type SourceTier = "A" | "B" | "C";

export interface SourceRegistryEntry {
  name: string;
  tier: SourceTier;
  url?: string;
}

const TIER_BONUS: Record<SourceTier, number> = {
  A: 15,
  B: 8,
  C: 0,
};

const BUILT_IN_SOURCES: Record<string, SourceTier> = {
  "Financial Times": "A",
  "FT Economics": "A",
  "Bloomberg": "A",
  "Bloomberg Economics": "A",
  "Bloomberg Markets": "A",
  "The Economist": "A",
  "Reuters Business": "A",
  "Reuters Economy": "A",
  "Reuters Politics": "A",
  "AP Politics": "A",
  "MIT Technology Review": "A",
  "TechCrunch": "B",
  "Ars Technica": "B",
  "Ars Technica AI": "B",
  "Wired": "B",
  "The Verge": "B",
  "The Verge AI": "B",
  "VentureBeat": "B",
  "CNBC Markets": "B",
  "BBC Business": "B",
  "BBC Politics": "B",
  "Politico": "B",
  "MarketWatch": "B",
  "Yahoo Finance": "B",
  "Engadget": "C",
  "ZDNet": "C",
  "Seeking Alpha": "C",
  "Hacker News": "C",
  "The Hill": "C",
};

const customSourceRegistry = new Map<string, SourceRegistryEntry>();

export function getSourceTier(sourceName: string | null | undefined): SourceTier {
  if (!sourceName) return "C";
  const custom = customSourceRegistry.get(sourceName);
  if (custom) return custom.tier;
  return BUILT_IN_SOURCES[sourceName] ?? "C";
}

export function getSourceBonus(sourceName: string | null | undefined): number {
  return TIER_BONUS[getSourceTier(sourceName)];
}

export function registerSource(entry: SourceRegistryEntry): void {
  customSourceRegistry.set(entry.name, entry);
}

export function unregisterSource(name: string): boolean {
  return customSourceRegistry.delete(name);
}

export function getRegisteredSources(): SourceRegistryEntry[] {
  const builtIn: SourceRegistryEntry[] = Object.entries(BUILT_IN_SOURCES).map(
    ([name, tier]) => ({ name, tier }),
  );
  const custom: SourceRegistryEntry[] = Array.from(customSourceRegistry.values());
  return [...builtIn, ...custom];
}

export function getSourcesByTier(tier: SourceTier): SourceRegistryEntry[] {
  return getRegisteredSources().filter((s) => s.tier === tier);
}

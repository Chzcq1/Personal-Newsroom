// ============================================================
// TREND ENTITY GRAPH — Relation Definitions
// Sprint 29 — Real-Time Trend Intelligence
//
// Defines how major entities relate to each other in the
// trend ecosystem. Used for:
//   • Discovery injection (show adjacent trends)
//   • Feed momentum boost (articles near active trends)
//   • "Why trending" explanations
//
// Keep keywords lowercase. Bidirectional=true means the target
// also links back to the source.
// ============================================================

export type RelationType = "sector" | "competitor" | "partner" | "theme" | "concept" | "market";

export interface EntityRelation {
  target: string;         // canonical entity name (lowercase)
  weight: number;         // 0.0–1.0 relationship strength
  type: RelationType;
  bidirectional: boolean;
}

export const ENTITY_RELATIONS: Record<string, EntityRelation[]> = {

  // ── AI / Tech ───────────────────────────────────────────────

  "nvidia": [
    { target: "ai",             weight: 0.95, type: "theme",      bidirectional: true  },
    { target: "gpu",            weight: 0.92, type: "concept",    bidirectional: false },
    { target: "openai",         weight: 0.80, type: "partner",    bidirectional: true  },
    { target: "data center",    weight: 0.85, type: "theme",      bidirectional: true  },
    { target: "semiconductor",  weight: 0.88, type: "sector",     bidirectional: true  },
    { target: "amd",            weight: 0.75, type: "competitor", bidirectional: true  },
    { target: "microsoft",      weight: 0.65, type: "partner",    bidirectional: false },
    { target: "stocks",         weight: 0.70, type: "market",     bidirectional: false },
    { target: "cloud",          weight: 0.72, type: "theme",      bidirectional: false },
  ],

  "openai": [
    { target: "ai",             weight: 0.95, type: "theme",      bidirectional: true  },
    { target: "chatgpt",        weight: 0.95, type: "concept",    bidirectional: false },
    { target: "llm",            weight: 0.90, type: "concept",    bidirectional: true  },
    { target: "microsoft",      weight: 0.85, type: "partner",    bidirectional: true  },
    { target: "anthropic",      weight: 0.82, type: "competitor", bidirectional: true  },
    { target: "nvidia",         weight: 0.80, type: "partner",    bidirectional: true  },
    { target: "google",         weight: 0.75, type: "competitor", bidirectional: false },
    { target: "startup funding",weight: 0.65, type: "theme",      bidirectional: false },
    { target: "regulation",     weight: 0.60, type: "theme",      bidirectional: false },
  ],

  "anthropic": [
    { target: "ai",             weight: 0.92, type: "theme",      bidirectional: true  },
    { target: "openai",         weight: 0.82, type: "competitor", bidirectional: true  },
    { target: "claude",         weight: 0.95, type: "concept",    bidirectional: false },
    { target: "llm",            weight: 0.88, type: "concept",    bidirectional: true  },
    { target: "google",         weight: 0.70, type: "partner",    bidirectional: false },
    { target: "startup funding",weight: 0.70, type: "theme",      bidirectional: false },
  ],

  "google": [
    { target: "ai",             weight: 0.88, type: "theme",      bidirectional: true  },
    { target: "gemini",         weight: 0.90, type: "concept",    bidirectional: false },
    { target: "cloud",          weight: 0.85, type: "sector",     bidirectional: true  },
    { target: "microsoft",      weight: 0.80, type: "competitor", bidirectional: true  },
    { target: "openai",         weight: 0.75, type: "competitor", bidirectional: false },
    { target: "apple",          weight: 0.70, type: "competitor", bidirectional: true  },
    { target: "search",         weight: 0.85, type: "concept",    bidirectional: false },
    { target: "youtube",        weight: 0.85, type: "concept",    bidirectional: false },
    { target: "android",        weight: 0.80, type: "concept",    bidirectional: false },
    { target: "technology",     weight: 0.80, type: "sector",     bidirectional: true  },
  ],

  "microsoft": [
    { target: "ai",             weight: 0.88, type: "theme",      bidirectional: true  },
    { target: "openai",         weight: 0.85, type: "partner",    bidirectional: true  },
    { target: "cloud",          weight: 0.90, type: "sector",     bidirectional: true  },
    { target: "azure",          weight: 0.90, type: "concept",    bidirectional: false },
    { target: "google",         weight: 0.80, type: "competitor", bidirectional: true  },
    { target: "apple",          weight: 0.72, type: "competitor", bidirectional: true  },
    { target: "copilot",        weight: 0.85, type: "concept",    bidirectional: false },
    { target: "technology",     weight: 0.82, type: "sector",     bidirectional: true  },
    { target: "stocks",         weight: 0.68, type: "market",     bidirectional: false },
  ],

  "apple": [
    { target: "technology",     weight: 0.90, type: "sector",     bidirectional: true  },
    { target: "iphone",         weight: 0.92, type: "concept",    bidirectional: false },
    { target: "semiconductor",  weight: 0.75, type: "sector",     bidirectional: false },
    { target: "google",         weight: 0.70, type: "competitor", bidirectional: true  },
    { target: "microsoft",      weight: 0.72, type: "competitor", bidirectional: true  },
    { target: "stocks",         weight: 0.70, type: "market",     bidirectional: false },
    { target: "ai",             weight: 0.72, type: "theme",      bidirectional: false },
  ],

  "meta": [
    { target: "technology",     weight: 0.85, type: "sector",     bidirectional: true  },
    { target: "social media",   weight: 0.90, type: "concept",    bidirectional: false },
    { target: "ai",             weight: 0.80, type: "theme",      bidirectional: true  },
    { target: "vr",             weight: 0.80, type: "concept",    bidirectional: false },
    { target: "regulation",     weight: 0.65, type: "theme",      bidirectional: false },
    { target: "stocks",         weight: 0.65, type: "market",     bidirectional: false },
  ],

  "tesla": [
    { target: "ev",             weight: 0.95, type: "sector",     bidirectional: true  },
    { target: "elon musk",      weight: 0.90, type: "concept",    bidirectional: true  },
    { target: "autonomous",     weight: 0.85, type: "concept",    bidirectional: false },
    { target: "stocks",         weight: 0.75, type: "market",     bidirectional: false },
    { target: "energy",         weight: 0.70, type: "sector",     bidirectional: false },
    { target: "ai",             weight: 0.65, type: "theme",      bidirectional: false },
    { target: "battery",        weight: 0.80, type: "concept",    bidirectional: false },
  ],

  "elon musk": [
    { target: "tesla",          weight: 0.90, type: "concept",    bidirectional: true  },
    { target: "twitter",        weight: 0.85, type: "concept",    bidirectional: false },
    { target: "spacex",         weight: 0.85, type: "concept",    bidirectional: false },
    { target: "ai",             weight: 0.70, type: "theme",      bidirectional: false },
    { target: "crypto",         weight: 0.65, type: "theme",      bidirectional: false },
    { target: "politics",       weight: 0.65, type: "theme",      bidirectional: false },
    { target: "startup funding",weight: 0.60, type: "theme",      bidirectional: false },
  ],

  // ── Crypto ──────────────────────────────────────────────────

  "bitcoin": [
    { target: "crypto",         weight: 0.95, type: "sector",     bidirectional: true  },
    { target: "ethereum",       weight: 0.85, type: "sector",     bidirectional: true  },
    { target: "blockchain",     weight: 0.90, type: "concept",    bidirectional: true  },
    { target: "coinbase",       weight: 0.80, type: "partner",    bidirectional: false },
    { target: "sec",            weight: 0.72, type: "theme",      bidirectional: false },
    { target: "stablecoins",    weight: 0.70, type: "concept",    bidirectional: false },
    { target: "nvidia",         weight: 0.55, type: "theme",      bidirectional: false },
    { target: "stocks",         weight: 0.65, type: "market",     bidirectional: false },
    { target: "halving",        weight: 0.85, type: "concept",    bidirectional: false },
    { target: "defi",           weight: 0.75, type: "concept",    bidirectional: false },
    { target: "etf",            weight: 0.80, type: "concept",    bidirectional: false },
  ],

  "ethereum": [
    { target: "crypto",         weight: 0.95, type: "sector",     bidirectional: true  },
    { target: "bitcoin",        weight: 0.85, type: "sector",     bidirectional: true  },
    { target: "defi",           weight: 0.90, type: "concept",    bidirectional: true  },
    { target: "nft",            weight: 0.80, type: "concept",    bidirectional: false },
    { target: "blockchain",     weight: 0.88, type: "concept",    bidirectional: true  },
    { target: "solana",         weight: 0.75, type: "competitor", bidirectional: true  },
    { target: "stablecoins",    weight: 0.75, type: "concept",    bidirectional: false },
    { target: "layer2",         weight: 0.82, type: "concept",    bidirectional: false },
  ],

  "defi": [
    { target: "crypto",         weight: 0.90, type: "sector",     bidirectional: true  },
    { target: "ethereum",       weight: 0.90, type: "concept",    bidirectional: true  },
    { target: "stablecoins",    weight: 0.85, type: "concept",    bidirectional: true  },
    { target: "regulation",     weight: 0.65, type: "theme",      bidirectional: false },
    { target: "ai",             weight: 0.55, type: "theme",      bidirectional: false },
  ],

  // ── Macro / Economy ─────────────────────────────────────────

  "federal reserve": [
    { target: "interest rates",  weight: 0.95, type: "concept",   bidirectional: true  },
    { target: "inflation",       weight: 0.90, type: "theme",     bidirectional: true  },
    { target: "economy",         weight: 0.90, type: "sector",    bidirectional: true  },
    { target: "bonds",           weight: 0.85, type: "market",    bidirectional: false },
    { target: "dollar",          weight: 0.80, type: "market",    bidirectional: false },
    { target: "stocks",          weight: 0.80, type: "market",    bidirectional: true  },
    { target: "recession",       weight: 0.75, type: "theme",     bidirectional: false },
    { target: "crypto",          weight: 0.55, type: "market",    bidirectional: false },
  ],

  "inflation": [
    { target: "economy",         weight: 0.90, type: "sector",    bidirectional: true  },
    { target: "federal reserve", weight: 0.90, type: "theme",     bidirectional: true  },
    { target: "interest rates",  weight: 0.88, type: "concept",   bidirectional: true  },
    { target: "stocks",          weight: 0.75, type: "market",    bidirectional: false },
    { target: "bonds",           weight: 0.80, type: "market",    bidirectional: false },
    { target: "gold",            weight: 0.70, type: "market",    bidirectional: false },
    { target: "recession",       weight: 0.78, type: "theme",     bidirectional: true  },
  ],

  // ── Markets ──────────────────────────────────────────────────

  "stocks": [
    { target: "economy",         weight: 0.85, type: "sector",    bidirectional: true  },
    { target: "earnings",        weight: 0.88, type: "concept",   bidirectional: false },
    { target: "federal reserve", weight: 0.80, type: "theme",     bidirectional: true  },
    { target: "inflation",       weight: 0.75, type: "theme",     bidirectional: false },
    { target: "crypto",          weight: 0.65, type: "market",    bidirectional: true  },
    { target: "nvidia",          weight: 0.70, type: "market",    bidirectional: false },
    { target: "ipo",             weight: 0.80, type: "concept",   bidirectional: false },
    { target: "startup funding", weight: 0.65, type: "theme",     bidirectional: false },
  ],

  // ── Startups / VC ────────────────────────────────────────────

  "startup funding": [
    { target: "ai",              weight: 0.85, type: "theme",     bidirectional: true  },
    { target: "technology",      weight: 0.85, type: "sector",    bidirectional: true  },
    { target: "stocks",          weight: 0.65, type: "market",    bidirectional: false },
    { target: "crypto",          weight: 0.60, type: "theme",     bidirectional: false },
    { target: "openai",          weight: 0.65, type: "concept",   bidirectional: false },
    { target: "nvidia",          weight: 0.60, type: "concept",   bidirectional: false },
  ],

  // ── Geopolitics ──────────────────────────────────────────────

  "china": [
    { target: "technology",      weight: 0.80, type: "theme",     bidirectional: false },
    { target: "semiconductor",   weight: 0.82, type: "theme",     bidirectional: true  },
    { target: "economy",         weight: 0.85, type: "sector",    bidirectional: true  },
    { target: "taiwan",          weight: 0.88, type: "theme",     bidirectional: true  },
    { target: "politics",        weight: 0.85, type: "sector",    bidirectional: true  },
    { target: "trade",           weight: 0.80, type: "theme",     bidirectional: false },
    { target: "ai",              weight: 0.75, type: "theme",     bidirectional: false },
  ],

  "taiwan": [
    { target: "semiconductor",   weight: 0.92, type: "sector",    bidirectional: true  },
    { target: "china",           weight: 0.88, type: "theme",     bidirectional: true  },
    { target: "nvidia",          weight: 0.70, type: "theme",     bidirectional: false },
    { target: "geopolitics",     weight: 0.85, type: "theme",     bidirectional: false },
    { target: "technology",      weight: 0.75, type: "sector",    bidirectional: false },
  ],
};

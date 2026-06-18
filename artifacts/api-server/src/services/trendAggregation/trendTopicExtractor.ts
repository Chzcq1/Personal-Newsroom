// ============================================================
// TREND TOPIC EXTRACTOR
// Sprint 28 — Product Realignment
//
// Extracts topic tags from trend entities for clustering
// and user-interest matching.
// ============================================================

import type { TrendEntity, RawSignal } from "./trendNormalizer.js";

// ── Topic keyword map ─────────────────────────────────────────
// Maps topic IDs to their keyword signals.
// These must match the built-in topic IDs from topics.ts.

const TOPIC_KEYWORDS: Record<string, string[]> = {
  ai: [
    "ai", "artificial intelligence", "machine learning", "llm", "gpt", "openai",
    "anthropic", "gemini", "claude", "chatbot", "neural", "deep learning",
    "nvidia", "transformer", "foundation model", "generative",
  ],
  technology: [
    "tech", "software", "hardware", "startup", "apple", "google", "microsoft",
    "meta", "amazon", "cloud", "saas", "app", "mobile", "developer", "api",
    "github", "open source", "framework", "programming",
  ],
  stocks: [
    "stock", "market", "shares", "nyse", "nasdaq", "s&p", "dow", "etf",
    "ipo", "earnings", "dividend", "bull", "bear", "trading", "investor",
    "portfolio", "equity", "fund", "sp500",
  ],
  economy: [
    "economy", "inflation", "gdp", "fed", "federal reserve", "interest rate",
    "recession", "growth", "employment", "jobs", "unemployment", "fiscal",
    "monetary", "bank", "currency", "dollar", "euro",
  ],
  politics: [
    "politics", "government", "election", "president", "congress", "senate",
    "policy", "law", "regulation", "democrat", "republican", "vote",
    "white house", "parliament", "minister",
  ],
  crypto: [
    "bitcoin", "btc", "ethereum", "eth", "crypto", "blockchain", "defi",
    "nft", "web3", "solana", "binance", "coinbase", "altcoin", "token",
    "stablecoin", "protocol", "dao",
  ],
  gaming: [
    "game", "gaming", "steam", "playstation", "xbox", "nintendo", "esports",
    "fortnite", "minecraft", "rpg", "fps", "indie", "developer", "release",
  ],
  startups: [
    "startup", "vc", "venture capital", "funding", "seed", "series a",
    "founder", "pitch", "unicorn", "accelerator", "y combinator", "incubator",
    "entrepreneurship", "innovation",
  ],
};

// ── Entity keywords (for entity memory matching) ─────────────

const ENTITY_KEYWORDS: string[] = [
  "nvidia", "apple", "google", "microsoft", "amazon", "meta", "tesla",
  "openai", "anthropic", "bitcoin", "ethereum", "trump", "elon musk",
  "sam altman", "fed", "fed reserve", "china", "taiwan", "ukraine",
];

// ── Extractor ─────────────────────────────────────────────────

export function extractTopics(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];

  for (const [topicId, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const hits = keywords.filter((kw) => lower.includes(kw));
    if (hits.length > 0) matched.push(topicId);
  }

  return [...new Set(matched)];
}

export function extractEntities(text: string): string[] {
  const lower = text.toLowerCase();
  return ENTITY_KEYWORDS.filter((e) => lower.includes(e.toLowerCase()));
}

// ── Tag enrichment ────────────────────────────────────────────

export function enrichTags(entity: TrendEntity): TrendEntity {
  const combinedText = `${entity.title} ${entity.description} ${entity.tags.join(" ")}`;
  const topicTags = extractTopics(combinedText);
  const entityTags = extractEntities(combinedText);

  return {
    ...entity,
    tags: [...new Set([...entity.tags, ...topicTags, ...entityTags])],
  };
}

export function enrichTagsBatch(entities: TrendEntity[]): TrendEntity[] {
  return entities.map(enrichTags);
}

// ── Interest matching ─────────────────────────────────────────

export function matchesInterests(entity: TrendEntity, interests: string[]): boolean {
  if (interests.length === 0) return true;
  const entityTopics = new Set(entity.tags);
  return interests.some((interest) => {
    const lower = interest.toLowerCase();
    // Direct topic match
    if (entityTopics.has(lower)) return true;
    // Keyword match
    const text = `${entity.title} ${entity.description}`.toLowerCase();
    return text.includes(lower);
  });
}

// ── Discovery adjacent topics ─────────────────────────────────
// For every 6-8 feed items, inject an adjacent interest.

const ADJACENT_TOPICS: Record<string, string[]> = {
  crypto:     ["ai", "technology", "startups"],
  ai:         ["technology", "startups", "stocks"],
  stocks:     ["economy", "crypto", "technology"],
  economy:    ["politics", "stocks"],
  politics:   ["economy"],
  technology: ["ai", "startups", "gaming"],
  gaming:     ["technology"],
  startups:   ["technology", "ai", "stocks"],
};

export function getAdjacentInterests(interests: string[]): string[] {
  const adjacent: string[] = [];
  for (const interest of interests) {
    const adj = ADJACENT_TOPICS[interest.toLowerCase()] ?? [];
    adjacent.push(...adj);
  }
  // Remove interests the user already has
  const interestSet = new Set(interests.map((i) => i.toLowerCase()));
  return [...new Set(adjacent)].filter((a) => !interestSet.has(a));
}

// ── Raw signal tag extraction ─────────────────────────────────

export function extractTagsFromRaw(raw: RawSignal): string[] {
  const text = `${raw.title} ${raw.description ?? ""}`;
  return [
    ...extractTopics(text),
    ...extractEntities(text),
    raw.platform,
  ];
}

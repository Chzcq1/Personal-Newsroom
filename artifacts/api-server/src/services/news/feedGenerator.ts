// ============================================================
// FEED GENERATOR
//
// Maps user interests to topic IDs and keyword boost scores.
// V1: Simple keyword matching. No AI analysis.
//
// Architecture is designed for future enhancement:
//   V2: Semantic similarity scoring
//   V3: ML-based interest clustering
// ============================================================

import type { Article } from "../ai/aiProvider.js";

// ── Interest definitions ─────────────────────────────────────
//
// Each interest maps to:
//   topicIds  — which topic feeds to pull from
//   keywords  — strings to look for in article title/description
//               (case-insensitive match)

export interface InterestDefinition {
  label: string;
  topicIds: string[];
  keywords: string[];
}

export const INTEREST_DEFINITIONS: Record<string, InterestDefinition> = {
  Tesla: {
    label: "Tesla",
    topicIds: ["stocks", "economy", "technology"],
    keywords: ["tesla", "elon musk", "tsla", "electric vehicle", "ev", "cybertruck", "model 3", "model y"],
  },
  Nvidia: {
    label: "Nvidia",
    topicIds: ["stocks", "ai", "technology"],
    keywords: ["nvidia", "nvda", "jensen huang", "gpu", "h100", "blackwell", "cuda", "geforce"],
  },
  BYD: {
    label: "BYD",
    topicIds: ["stocks", "economy", "technology"],
    keywords: ["byd", "build your dreams", "chinese ev", "wang chuanfu"],
  },
  Bitcoin: {
    label: "Bitcoin",
    topicIds: ["stocks"],
    keywords: ["bitcoin", "btc", "crypto", "cryptocurrency", "satoshi", "blockchain", "halving"],
  },
  Ethereum: {
    label: "Ethereum",
    topicIds: ["stocks"],
    keywords: ["ethereum", "eth", "ether", "defi", "smart contract", "vitalik", "eip"],
  },
  Nintendo: {
    label: "Nintendo",
    topicIds: ["technology", "stocks"],
    keywords: ["nintendo", "switch", "mario", "zelda", "pokemon", "kirby", "direct"],
  },
  Steam: {
    label: "Steam",
    topicIds: ["technology"],
    keywords: ["steam", "valve", "gabe newell", "steam deck", "pc gaming", "steam sale"],
  },
  OpenAI: {
    label: "OpenAI",
    topicIds: ["ai", "technology"],
    keywords: ["openai", "chatgpt", "gpt-4", "gpt-5", "sam altman", "dall-e", "sora", "o1", "o3"],
  },
  Anthropic: {
    label: "Anthropic",
    topicIds: ["ai", "technology"],
    keywords: ["anthropic", "claude", "dario amodei", "constitutional ai"],
  },
  "AI Agents": {
    label: "AI Agents",
    topicIds: ["ai", "technology"],
    keywords: ["ai agent", "autonomous agent", "agentic", "tool use", "function calling", "mcp", "multi-agent"],
  },
  EV: {
    label: "EV (Electric Vehicles)",
    topicIds: ["economy", "technology", "stocks"],
    keywords: ["electric vehicle", "ev", "battery", "charging", "lithium", "range anxiety", "fast charging"],
  },
  Gaming: {
    label: "Gaming",
    topicIds: ["technology", "stocks"],
    keywords: ["gaming", "video game", "game pass", "playstation", "xbox", "ps5", "esports", "indie game"],
  },
};

// Preset list for the UI — the 12 predefined interests
export const PRESET_INTERESTS = Object.keys(INTEREST_DEFINITIONS);

// ── Core functions ───────────────────────────────────────────

/**
 * Derive the set of topic IDs to fetch from, given a list of active interests.
 * Deduplicates and returns all relevant topic IDs.
 */
export function getTopicIdsForInterests(interests: string[]): string[] {
  const topicIds = new Set<string>();
  for (const interest of interests) {
    const def = INTEREST_DEFINITIONS[interest];
    if (def) {
      for (const id of def.topicIds) topicIds.add(id);
    }
  }
  // If no interests selected, default to all topics
  if (topicIds.size === 0) return ["ai", "technology", "stocks", "economy", "politics"];
  return Array.from(topicIds);
}

/**
 * Score an article for interest relevance.
 * Returns an additive boost score (0 = not relevant, higher = more relevant).
 * Used on top of existing recency + quality scores in newsCollectorService.
 */
export function scoreArticleByInterests(
  article: Article,
  interests: string[],
): number {
  let boost = 0;
  const searchText = `${article.title} ${article.description ?? ""}`.toLowerCase();

  for (const interest of interests) {
    const def = INTEREST_DEFINITIONS[interest];
    if (!def) continue;
    for (const keyword of def.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        boost += 20; // +20 per keyword match
        break; // count each interest at most once
      }
    }
  }

  return boost;
}

/**
 * Generate a personal feed configuration from user interests.
 * Returns the topic IDs to collect from and the boost keywords for ranking.
 */
export function generatePersonalFeed(interests: string[]): {
  topicIds: string[];
  boostKeywords: string[];
} {
  const topicIds = getTopicIdsForInterests(interests);
  const boostKeywords = interests.flatMap(
    (i) => INTEREST_DEFINITIONS[i]?.keywords ?? [],
  );
  return { topicIds, boostKeywords };
}

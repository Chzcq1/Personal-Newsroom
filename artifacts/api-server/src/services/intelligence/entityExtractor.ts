// ============================================================
// ENTITY EXTRACTION PIPELINE — Sprint 10 Task B
//
// Real entity extraction from article text.
// Replaces simple capitalized-word heuristics with:
//   - Canonical entity recognition via alias dictionary
//   - Entity type classification (company, person, govt, product,
//     cryptocurrency, institution, event)
//   - Alias normalization ("Fed" → "Federal Reserve")
//   - Confidence scoring per entity mention
//
// Exposed in debug mode via /api/debug/entities/extract
// ============================================================

import { INTEREST_GRAPH } from "./interestGraph.js";

export type EntityType =
  | "company"
  | "person"
  | "government"
  | "product"
  | "cryptocurrency"
  | "institution"
  | "index"
  | "event"
  | "concept";

export interface ExtractedEntity {
  entityId: string;           // canonical ID (from INTEREST_GRAPH or dynamic)
  canonicalName: string;      // display name
  type: EntityType;
  aliases: string[];          // matched aliases in this text
  mentions: number;           // how many times it appears in the text
  confidence: number;         // 0.0–1.0
  positions: number[];        // character offsets of first mention per alias
}

// ── Alias Dictionary ──────────────────────────────────────────
// Maps aliases → canonical entityId

const ENTITY_ALIAS_MAP: Record<string, string> = {
  // Federal Reserve
  "federal reserve": "FederalReserve",
  "the fed": "FederalReserve",
  "fed": "FederalReserve",
  "fomc": "FederalReserve",
  "jerome powell": "FederalReserve",
  "powell": "FederalReserve",
  "central bank": "FederalReserve",

  // SEC
  "sec": "SEC",
  "securities and exchange commission": "SEC",
  "gensler": "SEC",
  "gary gensler": "SEC",

  // Bitcoin
  "bitcoin": "Bitcoin",
  "btc": "Bitcoin",
  "satoshi": "Bitcoin",
  "halving": "Bitcoin",

  // Bitcoin ETF
  "bitcoin etf": "BitcoinETF",
  "spot bitcoin etf": "BitcoinETF",
  "btc etf": "BitcoinETF",
  "ibit": "BitcoinETF",

  // Ethereum
  "ethereum": "Ethereum",
  "eth": "Ethereum",
  "ether": "Ethereum",
  "vitalik": "Ethereum",
  "vitalik buterin": "Ethereum",

  // Nvidia
  "nvidia": "Nvidia",
  "nvda": "Nvidia",
  "jensen huang": "Nvidia",
  "blackwell": "Nvidia",
  "h100": "Nvidia",
  "h200": "Nvidia",
  "hopper": "Nvidia",

  // OpenAI
  "openai": "OpenAI",
  "chatgpt": "OpenAI",
  "sam altman": "OpenAI",
  "gpt-4": "OpenAI",
  "gpt-5": "OpenAI",
  "o1": "OpenAI",
  "o3": "OpenAI",
  "o4": "OpenAI",
  "sora": "OpenAI",

  // Anthropic
  "anthropic": "Anthropic",
  "claude": "Anthropic",
  "dario amodei": "Anthropic",

  // Microsoft
  "microsoft": "Microsoft",
  "msft": "Microsoft",
  "satya nadella": "Microsoft",
  "azure": "Microsoft",
  "copilot": "Microsoft",

  // Google / Alphabet
  "google": "Google",
  "alphabet": "Google",
  "gemini": "Google",
  "deepmind": "Google",
  "sundar pichai": "Google",
  "bard": "Google",

  // Tesla
  "tesla": "Tesla",
  "tsla": "Tesla",
  "elon musk": "Tesla",
  "cybertruck": "Tesla",
  "model y": "Tesla",
  "model 3": "Tesla",
  "fsd": "Tesla",
  "full self-driving": "Tesla",

  // TSMC
  "tsmc": "TSMC",
  "taiwan semiconductor": "TSMC",
  "morris chang": "TSMC",

  // AMD
  "amd": "AMD",
  "lisa su": "AMD",
  "radeon": "AMD",
  "ryzen": "AMD",
  "instinct": "AMD",

  // BlackRock
  "blackrock": "BlackRock",
  "larry fink": "BlackRock",

  // MicroStrategy
  "microstrategy": "MicroStrategy",
  "michael saylor": "MicroStrategy",
  "strategy": "MicroStrategy",

  // BYD
  "byd": "BYD",
  "wang chuanfu": "BYD",

  // Inflation / Macro
  "cpi": "Inflation",
  "inflation": "Inflation",
  "consumer price index": "Inflation",
  "ppi": "Macro",
  "gdp": "Macro",
  "recession": "Macro",
  "tariff": "Macro",
  "yield curve": "Macro",

  // Nintendo
  "nintendo": "Nintendo",
  "switch 2": "Nintendo",
  "mario": "Nintendo",
  "zelda": "Nintendo",

  // SpaceX
  "spacex": "SpaceX",
  "starship": "SpaceX",
  "starlink": "SpaceX",

  // Coinbase
  "coinbase": "Coinbase",

  // AI agents
  "ai agent": "AIAgents",
  "agentic ai": "AIAgents",
  "autonomous agent": "AIAgents",
  "mcp": "AIAgents",
  "multi-agent": "AIAgents",
};

// ── Entity type classifications ────────────────────────────────

const ENTITY_TYPES: Record<string, EntityType> = {
  FederalReserve: "institution",
  SEC: "government",
  Bitcoin: "cryptocurrency",
  BitcoinETF: "product",
  Ethereum: "cryptocurrency",
  Nvidia: "company",
  OpenAI: "company",
  Anthropic: "company",
  Microsoft: "company",
  Google: "company",
  Tesla: "company",
  TSMC: "company",
  AMD: "company",
  BlackRock: "company",
  MicroStrategy: "company",
  BYD: "company",
  Inflation: "concept",
  Macro: "concept",
  Nintendo: "company",
  SpaceX: "company",
  Coinbase: "company",
  AIAgents: "concept",
  AIInfrastructure: "concept",
  AIRegulation: "concept",
  CryptoRegulation: "government",
  Semiconductors: "concept",
  EV: "concept",
  DeFi: "concept",
  Stablecoins: "cryptocurrency",
  Samsung: "company",
  Intel: "company",
  Qualcomm: "company",
  Amazon: "company",
  Apple: "company",
  Sony: "company",
  Fidelity: "company",
  Grayscale: "company",
  China: "government",
  DataCenter: "concept",
  Robotaxi: "concept",
  IPO: "event",
  NFT: "product",
  Gaming: "concept",
  Bonds: "product",
  DollarIndex: "index",
  USEconomy: "concept",
  BitcoinMining: "concept",
  Lightning: "product",
  Rivian: "company",
  Arbitrum: "product",
  Optimism: "product",
};

// Dynamic entities detected from article text (capitalized proper nouns not in graph)
const dynamicEntityCache = new Map<string, { type: EntityType; mentions: number }>();

// ── Extraction helpers ─────────────────────────────────────────

function buildAliasTrie(): Array<{ pattern: RegExp; alias: string; canonicalId: string }> {
  // Sort by length descending to match longer aliases first
  return Object.entries(ENTITY_ALIAS_MAP)
    .sort(([a], [b]) => b.length - a.length)
    .map(([alias, canonicalId]) => ({
      alias,
      canonicalId,
      pattern: new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"),
    }));
}

const ALIAS_PATTERNS = buildAliasTrie();

/**
 * Extract canonical entities from article text.
 *
 * @param text - Combined title + description text
 * @returns Array of ExtractedEntity sorted by mentions desc
 */
export function extractEntities(text: string): ExtractedEntity[] {
  const entityMap = new Map<string, {
    canonicalName: string;
    aliases: Set<string>;
    mentions: number;
    positions: number[];
    confidence: number;
  }>();

  // ── Pass 1: alias dictionary matching ─────────────────────
  for (const { pattern, alias, canonicalId } of ALIAS_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const node = INTEREST_GRAPH[canonicalId];
      const label = node?.label ?? canonicalId;

      const existing = entityMap.get(canonicalId);
      if (existing) {
        existing.aliases.add(alias);
        existing.mentions += 1;
        if (existing.positions.length < 5) existing.positions.push(match.index);
        // Higher confidence for multiple distinct alias matches
        existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      } else {
        entityMap.set(canonicalId, {
          canonicalName: label,
          aliases: new Set([alias]),
          mentions: 1,
          positions: [match.index],
          confidence: 0.8, // alias match is high-confidence
        });
      }
    }
  }

  // ── Pass 2: capitalized proper noun detection (for unknowns) ──
  const properNounPattern = /\b([A-Z][a-zA-Z]{2,})(?:\s+[A-Z][a-zA-Z]{2,}){0,2}\b/g;
  const skipWords = new Set([
    "The", "This", "That", "These", "Those", "When", "What", "Where",
    "Which", "With", "From", "Into", "Under", "Over", "About", "After",
    "Before", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
    "Saturday", "Sunday", "January", "February", "March", "April",
    "May", "June", "July", "August", "September", "October", "November",
    "December", "Breaking", "Reuters", "Bloomberg", "Report",
  ]);

  let pnMatch: RegExpExecArray | null;
  while ((pnMatch = properNounPattern.exec(text)) !== null) {
    const term = pnMatch[0].trim();
    if (skipWords.has(term.split(" ")[0])) continue;
    // Skip if already captured via alias
    const alreadyCaptured = [...entityMap.keys()].some(
      (id) => INTEREST_GRAPH[id]?.label === term,
    );
    if (alreadyCaptured) continue;
    if (term.length < 3) continue;

    const existing = dynamicEntityCache.get(term);
    if (existing) {
      existing.mentions += 1;
    } else {
      dynamicEntityCache.set(term, { type: "company", mentions: 1 });
    }

    // Add to result if it's been seen in multiple articles (reliability filter)
    const dynEntry = dynamicEntityCache.get(term)!;
    if (dynEntry.mentions >= 2) {
      const dynKey = `dynamic:${term}`;
      const existingDyn = entityMap.get(dynKey);
      if (existingDyn) {
        existingDyn.mentions += 1;
      } else {
        entityMap.set(dynKey, {
          canonicalName: term,
          aliases: new Set([term]),
          mentions: 1,
          positions: [pnMatch.index],
          confidence: 0.5, // lower confidence for dynamic
        });
      }
    }
  }

  return [...entityMap.entries()]
    .map(([entityId, data]) => ({
      entityId,
      canonicalName: data.canonicalName,
      type: ENTITY_TYPES[entityId] ?? "company",
      aliases: [...data.aliases],
      mentions: data.mentions,
      confidence: data.confidence,
      positions: data.positions,
    }))
    .sort((a, b) => b.mentions - a.mentions || b.confidence - a.confidence);
}

/**
 * Extract entities from multiple articles and normalize.
 * Returns entity frequency across the corpus.
 */
export function extractCorpusEntities(
  articles: Array<{ title: string; description?: string | null }>,
): Map<string, ExtractedEntity & { articleCount: number }> {
  const corpus = new Map<string, ExtractedEntity & { articleCount: number }>();

  for (const article of articles) {
    const text = `${article.title} ${article.description ?? ""}`;
    const entities = extractEntities(text);

    for (const entity of entities) {
      const existing = corpus.get(entity.entityId);
      if (existing) {
        existing.mentions += entity.mentions;
        existing.articleCount += 1;
        existing.confidence = Math.min(1.0, existing.confidence + 0.05);
        for (const alias of entity.aliases) existing.aliases.push(alias);
      } else {
        corpus.set(entity.entityId, { ...entity, aliases: [...entity.aliases], articleCount: 1 });
      }
    }
  }

  return corpus;
}

/**
 * Check if two entity mentions likely refer to the same entity.
 * Used by narrative clustering for semantic deduplication.
 */
export function areSameEntity(text1: string, text2: string): boolean {
  const e1 = new Set(extractEntities(text1).map((e) => e.entityId));
  const e2 = new Set(extractEntities(text2).map((e) => e.entityId));
  const intersection = [...e1].filter((e) => e2.has(e));
  return intersection.length > 0;
}

/**
 * Get canonical entity ID for a raw string mention.
 */
export function getCanonicalEntityId(mention: string): string | null {
  const lower = mention.toLowerCase().trim();
  const canonical = ENTITY_ALIAS_MAP[lower];
  return canonical ?? null;
}

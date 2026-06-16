// ============================================================
// INTEREST GRAPH ENGINE — Sprint 9 Task A
//
// Upgrades interest matching from keyword lists to a weighted
// entity relationship graph.
//
// Structure:
//   Each interest node has related entities with weights 0.0–1.0
//   Weight 1.0 = core concept (BTC → Bitcoin)
//   Weight 0.7 = direct ecosystem (BTC → Bitcoin ETF, BlackRock)
//   Weight 0.5 = adjacent ecosystem (BTC → Coinbase, SEC)
//   Weight 0.3 = loosely related (BTC → Stablecoins, DeFi)
//
// Graph traversal: BFS up to 2 hops.
//   Hop 0 weight: node weight
//   Hop 1 weight: node weight × 0.7
//   Hop 2 weight: node weight × 0.4
//
// Usage:
//   expandInterests(["Bitcoin"]) → all related entities with weights
//   getGraphScore(article, interests) → float 0.0–1.0 graph relevance
// ============================================================

export interface GraphNode {
  entity: string;
  weight: number;
  keywords: string[];
}

export interface GraphEdge {
  target: string;
  weight: number; // 0.0–1.0 relationship strength
}

export interface InterestGraphEntry {
  label: string;
  coreKeywords: string[];
  related: GraphEdge[];
}

// ── Interest graph definition ────────────────────────────────

export const INTEREST_GRAPH: Record<string, InterestGraphEntry> = {
  Bitcoin: {
    label: "Bitcoin",
    coreKeywords: ["bitcoin", "btc", "satoshi", "halving", "bitcoin mining"],
    related: [
      { target: "BitcoinETF", weight: 0.9 },
      { target: "BlackRock", weight: 0.7 },
      { target: "Coinbase", weight: 0.7 },
      { target: "SEC", weight: 0.6 },
      { target: "Ethereum", weight: 0.5 },
      { target: "Stablecoins", weight: 0.4 },
      { target: "CryptoRegulation", weight: 0.6 },
      { target: "MicroStrategy", weight: 0.7 },
      { target: "BitcoinMining", weight: 0.8 },
      { target: "Lightning", weight: 0.5 },
    ],
  },
  BitcoinETF: {
    label: "Bitcoin ETF",
    coreKeywords: ["bitcoin etf", "spot etf", "etf inflow", "etf outflow", "btc etf", "bitcoin fund"],
    related: [
      { target: "Bitcoin", weight: 0.9 },
      { target: "BlackRock", weight: 0.9 },
      { target: "Fidelity", weight: 0.8 },
      { target: "SEC", weight: 0.8 },
      { target: "Grayscale", weight: 0.7 },
    ],
  },
  Ethereum: {
    label: "Ethereum",
    coreKeywords: ["ethereum", "eth", "ether", "vitalik", "eip", "layer 2", "l2", "staking"],
    related: [
      { target: "Bitcoin", weight: 0.5 },
      { target: "DeFi", weight: 0.8 },
      { target: "NFT", weight: 0.5 },
      { target: "Stablecoins", weight: 0.6 },
      { target: "Arbitrum", weight: 0.7 },
      { target: "Optimism", weight: 0.7 },
    ],
  },
  Nvidia: {
    label: "Nvidia",
    coreKeywords: ["nvidia", "nvda", "jensen huang", "h100", "h200", "blackwell", "cuda", "geforce", "gpu"],
    related: [
      { target: "AIInfrastructure", weight: 0.9 },
      { target: "OpenAI", weight: 0.7 },
      { target: "DataCenter", weight: 0.9 },
      { target: "TSMC", weight: 0.7 },
      { target: "AMD", weight: 0.7 },
      { target: "Intel", weight: 0.6 },
      { target: "Semiconductors", weight: 0.9 },
      { target: "Microsoft", weight: 0.6 },
      { target: "Google", weight: 0.6 },
    ],
  },
  AIInfrastructure: {
    label: "AI Infrastructure",
    coreKeywords: ["ai infrastructure", "data center", "gpu cluster", "ai chip", "compute", "training cluster"],
    related: [
      { target: "Nvidia", weight: 0.9 },
      { target: "Microsoft", weight: 0.7 },
      { target: "Google", weight: 0.7 },
      { target: "Amazon", weight: 0.7 },
      { target: "TSMC", weight: 0.7 },
      { target: "OpenAI", weight: 0.6 },
    ],
  },
  OpenAI: {
    label: "OpenAI",
    coreKeywords: ["openai", "chatgpt", "gpt", "sam altman", "dall-e", "sora", "o1", "o3", "o4"],
    related: [
      { target: "Anthropic", weight: 0.6 },
      { target: "Microsoft", weight: 0.8 },
      { target: "AIInfrastructure", weight: 0.8 },
      { target: "AIRegulation", weight: 0.5 },
      { target: "Nvidia", weight: 0.6 },
      { target: "AIAgents", weight: 0.8 },
    ],
  },
  Anthropic: {
    label: "Anthropic",
    coreKeywords: ["anthropic", "claude", "dario amodei", "constitutional ai"],
    related: [
      { target: "OpenAI", weight: 0.7 },
      { target: "AIRegulation", weight: 0.6 },
      { target: "Google", weight: 0.6 },
      { target: "AIAgents", weight: 0.7 },
    ],
  },
  AIAgents: {
    label: "AI Agents",
    coreKeywords: ["ai agent", "autonomous agent", "agentic", "tool use", "mcp", "multi-agent", "function calling"],
    related: [
      { target: "OpenAI", weight: 0.8 },
      { target: "Anthropic", weight: 0.7 },
      { target: "Microsoft", weight: 0.6 },
      { target: "AIInfrastructure", weight: 0.6 },
    ],
  },
  Tesla: {
    label: "Tesla",
    coreKeywords: ["tesla", "tsla", "elon musk", "cybertruck", "model 3", "model y", "model s", "powerwall"],
    related: [
      { target: "EV", weight: 0.8 },
      { target: "BYD", weight: 0.6 },
      { target: "Robotaxi", weight: 0.9 },
      { target: "Semiconductors", weight: 0.4 },
      { target: "SpaceX", weight: 0.5 },
    ],
  },
  EV: {
    label: "Electric Vehicles",
    coreKeywords: ["electric vehicle", "ev", "battery", "charging", "range", "bev", "phev"],
    related: [
      { target: "Tesla", weight: 0.8 },
      { target: "BYD", weight: 0.8 },
      { target: "Rivian", weight: 0.7 },
      { target: "GM", weight: 0.6 },
      { target: "Ford", weight: 0.6 },
      { target: "VW", weight: 0.6 },
    ],
  },
  BYD: {
    label: "BYD",
    coreKeywords: ["byd", "build your dreams", "wang chuanfu", "chinese ev"],
    related: [
      { target: "EV", weight: 0.9 },
      { target: "Tesla", weight: 0.7 },
      { target: "China", weight: 0.7 },
    ],
  },
  Semiconductors: {
    label: "Semiconductors",
    coreKeywords: ["semiconductor", "chip", "foundry", "wafer", "fabrication", "nm process"],
    related: [
      { target: "TSMC", weight: 0.9 },
      { target: "Nvidia", weight: 0.8 },
      { target: "Intel", weight: 0.8 },
      { target: "AMD", weight: 0.8 },
      { target: "Samsung", weight: 0.7 },
      { target: "Qualcomm", weight: 0.7 },
    ],
  },
  TSMC: {
    label: "TSMC",
    coreKeywords: ["tsmc", "taiwan semiconductor", "morris chang", "3nm", "2nm", "advanced node"],
    related: [
      { target: "Semiconductors", weight: 0.9 },
      { target: "Nvidia", weight: 0.7 },
      { target: "Apple", weight: 0.7 },
      { target: "AMD", weight: 0.6 },
      { target: "China", weight: 0.5 },
    ],
  },
  FederalReserve: {
    label: "Federal Reserve",
    coreKeywords: ["federal reserve", "fed", "fomc", "jerome powell", "rate hike", "rate cut", "interest rate", "monetary policy"],
    related: [
      { target: "Inflation", weight: 0.9 },
      { target: "USEconomy", weight: 0.9 },
      { target: "Bonds", weight: 0.8 },
      { target: "DollarIndex", weight: 0.7 },
      { target: "Bitcoin", weight: 0.5 },
    ],
  },
  Macro: {
    label: "Macro Economics",
    coreKeywords: ["gdp", "inflation", "recession", "cpi", "ppi", "unemployment", "trade war", "tariff", "yield curve"],
    related: [
      { target: "FederalReserve", weight: 0.9 },
      { target: "USEconomy", weight: 0.9 },
      { target: "China", weight: 0.7 },
      { target: "Bonds", weight: 0.7 },
      { target: "DollarIndex", weight: 0.7 },
    ],
  },
  Stablecoins: {
    label: "Stablecoins",
    coreKeywords: ["stablecoin", "usdt", "usdc", "tether", "dai", "algorithmic stablecoin"],
    related: [
      { target: "Bitcoin", weight: 0.5 },
      { target: "Ethereum", weight: 0.6 },
      { target: "DeFi", weight: 0.7 },
      { target: "CryptoRegulation", weight: 0.8 },
    ],
  },
  DeFi: {
    label: "DeFi",
    coreKeywords: ["defi", "decentralized finance", "uniswap", "aave", "compound", "yield", "liquidity pool"],
    related: [
      { target: "Ethereum", weight: 0.9 },
      { target: "Stablecoins", weight: 0.7 },
      { target: "CryptoRegulation", weight: 0.6 },
    ],
  },
  CryptoRegulation: {
    label: "Crypto Regulation",
    coreKeywords: ["crypto regulation", "sec crypto", "digital assets", "crypto bill", "crypto law"],
    related: [
      { target: "Bitcoin", weight: 0.7 },
      { target: "Ethereum", weight: 0.6 },
      { target: "SEC", weight: 0.9 },
      { target: "Stablecoins", weight: 0.7 },
    ],
  },
  SEC: {
    label: "SEC",
    coreKeywords: ["sec", "securities and exchange", "gensler", "securities regulation"],
    related: [
      { target: "CryptoRegulation", weight: 0.7 },
      { target: "BitcoinETF", weight: 0.8 },
      { target: "IPO", weight: 0.6 },
    ],
  },
  BlackRock: {
    label: "BlackRock",
    coreKeywords: ["blackrock", "ibit", "larry fink", "blackrock bitcoin"],
    related: [
      { target: "BitcoinETF", weight: 0.9 },
      { target: "Bitcoin", weight: 0.7 },
      { target: "Bonds", weight: 0.6 },
    ],
  },
  MicroStrategy: {
    label: "MicroStrategy",
    coreKeywords: ["microstrategy", "michael saylor", "strategy bitcoin"],
    related: [
      { target: "Bitcoin", weight: 0.95 },
      { target: "BitcoinETF", weight: 0.6 },
    ],
  },
  Nintendo: {
    label: "Nintendo",
    coreKeywords: ["nintendo", "switch", "switch 2", "mario", "zelda", "pokemon", "kirby", "nintendo direct"],
    related: [
      { target: "Gaming", weight: 0.9 },
      { target: "Sony", weight: 0.5 },
      { target: "Microsoft", weight: 0.4 },
    ],
  },
  Gaming: {
    label: "Gaming",
    coreKeywords: ["gaming", "video game", "game studio", "esports", "console", "pc gaming", "steam", "playstation", "xbox"],
    related: [
      { target: "Nintendo", weight: 0.8 },
      { target: "Sony", weight: 0.7 },
      { target: "Microsoft", weight: 0.6 },
      { target: "Nvidia", weight: 0.5 },
    ],
  },
  // Auxiliary nodes (no direct user selection but reachable via graph)
  China: { label: "China", coreKeywords: ["china", "beijing", "ccp", "xi jinping", "pboc"], related: [] },
  Microsoft: { label: "Microsoft", coreKeywords: ["microsoft", "msft", "satya nadella", "azure", "copilot"], related: [{ target: "OpenAI", weight: 0.8 }, { target: "AIInfrastructure", weight: 0.7 }] },
  Google: { label: "Google", coreKeywords: ["google", "alphabet", "gemini", "deepmind", "sundar pichai"], related: [{ target: "OpenAI", weight: 0.6 }, { target: "AIInfrastructure", weight: 0.7 }] },
  Amazon: { label: "Amazon", coreKeywords: ["amazon", "aws", "andy jassy", "bedrock"], related: [{ target: "AIInfrastructure", weight: 0.7 }] },
  Apple: { label: "Apple", coreKeywords: ["apple", "aapl", "tim cook", "iphone", "mac", "ios"], related: [{ target: "Semiconductors", weight: 0.5 }, { target: "TSMC", weight: 0.6 }] },
  AMD: { label: "AMD", coreKeywords: ["amd", "radeon", "ryzen", "lisa su", "epyc", "instinct"], related: [{ target: "Nvidia", weight: 0.7 }, { target: "Semiconductors", weight: 0.9 }] },
  Intel: { label: "Intel", coreKeywords: ["intel", "core", "xeon", "pat gelsinger", "gaudi"], related: [{ target: "Semiconductors", weight: 0.9 }, { target: "AMD", weight: 0.7 }] },
  Qualcomm: { label: "Qualcomm", coreKeywords: ["qualcomm", "snapdragon", "arm chip"], related: [{ target: "Semiconductors", weight: 0.8 }, { target: "Apple", weight: 0.5 }] },
  Fidelity: { label: "Fidelity", coreKeywords: ["fidelity", "fbtc"], related: [{ target: "BitcoinETF", weight: 0.9 }] },
  Grayscale: { label: "Grayscale", coreKeywords: ["grayscale", "gbtc", "grayscale bitcoin"], related: [{ target: "BitcoinETF", weight: 0.9 }, { target: "Bitcoin", weight: 0.7 }] },
  Inflation: { label: "Inflation", coreKeywords: ["inflation", "cpi", "price index", "deflation"], related: [{ target: "FederalReserve", weight: 0.9 }, { target: "Macro", weight: 0.9 }] },
  USEconomy: { label: "US Economy", coreKeywords: ["us economy", "american economy", "gdp usa", "us recession"], related: [{ target: "FederalReserve", weight: 0.8 }, { target: "Macro", weight: 0.8 }] },
  Bonds: { label: "Bonds", coreKeywords: ["treasury", "bond yield", "10-year", "2-year yield", "t-bill"], related: [{ target: "FederalReserve", weight: 0.8 }, { target: "Macro", weight: 0.7 }] },
  DollarIndex: { label: "Dollar Index", coreKeywords: ["dxy", "dollar index", "usd strength", "dollar rally"], related: [{ target: "FederalReserve", weight: 0.7 }, { target: "Macro", weight: 0.7 }] },
  BitcoinMining: { label: "Bitcoin Mining", coreKeywords: ["bitcoin mining", "hashrate", "miner", "mining pool", "asic"], related: [{ target: "Bitcoin", weight: 0.9 }] },
  Lightning: { label: "Lightning Network", coreKeywords: ["lightning network", "lightning payment", "btc payment"], related: [{ target: "Bitcoin", weight: 0.8 }] },
  AIRegulation: { label: "AI Regulation", coreKeywords: ["ai regulation", "ai policy", "ai act", "ai safety", "ai governance"], related: [{ target: "OpenAI", weight: 0.6 }, { target: "Anthropic", weight: 0.6 }] },
  Robotaxi: { label: "Robotaxi / FSD", coreKeywords: ["robotaxi", "fsd", "full self-driving", "autonomous vehicle", "waymo", "cybercab"], related: [{ target: "Tesla", weight: 0.9 }, { target: "EV", weight: 0.5 }] },
  Rivian: { label: "Rivian", coreKeywords: ["rivian", "r1t", "r1s", "rivian truck"], related: [{ target: "EV", weight: 0.9 }, { target: "Amazon", weight: 0.5 }] },
  SpaceX: { label: "SpaceX", coreKeywords: ["spacex", "starship", "falcon", "starlink", "elon musk"], related: [{ target: "Tesla", weight: 0.4 }] },
  DataCenter: { label: "Data Centers", coreKeywords: ["data center", "hyperscaler", "colocation", "rack", "power density"], related: [{ target: "Nvidia", weight: 0.8 }, { target: "AIInfrastructure", weight: 0.9 }] },
  IPO: { label: "IPO", coreKeywords: ["ipo", "initial public offering", "going public", "listing"], related: [{ target: "SEC", weight: 0.5 }] },
  Sony: { label: "Sony", coreKeywords: ["sony", "playstation", "ps5", "ps6"], related: [{ target: "Gaming", weight: 0.9 }] },
  NFT: { label: "NFT", coreKeywords: ["nft", "non-fungible", "digital art", "opensea"], related: [{ target: "Ethereum", weight: 0.7 }] },
};

// ── Graph traversal ──────────────────────────────────────────

export interface ExpandedEntity {
  entity: string;
  keywords: string[];
  weight: number;  // effective weight after hop decay
  hop: number;     // 0=direct, 1=adjacent, 2=peripheral
  sourceInterest: string;
}

/**
 * Expand a list of user interests into all related entities
 * within 2 hops of the interest graph.
 *
 * Returns a map from entityId to ExpandedEntity (highest weight wins).
 */
export function expandInterests(interests: string[]): Map<string, ExpandedEntity> {
  const expanded = new Map<string, ExpandedEntity>();
  const HOP_DECAY = [1.0, 0.7, 0.4];

  for (const interest of interests) {
    const node = INTEREST_GRAPH[interest];
    if (!node) continue;

    // Hop 0 — the interest itself
    expanded.set(interest, {
      entity: interest,
      keywords: node.coreKeywords,
      weight: 1.0 * HOP_DECAY[0],
      hop: 0,
      sourceInterest: interest,
    });

    // Hop 1 — direct relations
    for (const edge of node.related) {
      const relNode = INTEREST_GRAPH[edge.target];
      if (!relNode) continue;
      const w = edge.weight * HOP_DECAY[1];
      const existing = expanded.get(edge.target);
      if (!existing || existing.weight < w) {
        expanded.set(edge.target, {
          entity: edge.target,
          keywords: relNode.coreKeywords,
          weight: w,
          hop: 1,
          sourceInterest: interest,
        });
      }

      // Hop 2 — indirect relations
      for (const edge2 of relNode.related) {
        const relNode2 = INTEREST_GRAPH[edge2.target];
        if (!relNode2) continue;
        const w2 = edge.weight * edge2.weight * HOP_DECAY[2];
        const existing2 = expanded.get(edge2.target);
        if (!existing2 || existing2.weight < w2) {
          expanded.set(edge2.target, {
            entity: edge2.target,
            keywords: relNode2.coreKeywords,
            weight: w2,
            hop: 2,
            sourceInterest: interest,
          });
        }
      }
    }
  }

  return expanded;
}

/**
 * Compute a graph-based relevance score for an article.
 * Returns 0.0–1.0.
 */
export function getGraphScore(
  text: string,
  expandedEntities: Map<string, ExpandedEntity>,
): { score: number; matchedEntities: string[] } {
  const lowerText = text.toLowerCase();
  const matched: Array<{ entity: string; weight: number }> = [];

  for (const [entityId, entry] of expandedEntities) {
    for (const kw of entry.keywords) {
      if (lowerText.includes(kw.toLowerCase())) {
        matched.push({ entity: entityId, weight: entry.weight });
        break; // one keyword match per entity is enough
      }
    }
  }

  if (matched.length === 0) return { score: 0, matchedEntities: [] };

  // Weighted sum, capped at 1.0
  const score = Math.min(
    matched.reduce((sum, m) => sum + m.weight, 0),
    1.0,
  );

  // Return unique entity names matched
  const matchedEntities = [...new Set(matched.map((m) => m.entity))];

  return { score, matchedEntities };
}

/**
 * Get all interests that map to a given interest key (for display).
 */
export function getInterestLabel(interestKey: string): string {
  return INTEREST_GRAPH[interestKey]?.label ?? interestKey;
}

// ============================================================
// ENTITY-SOURCE RESOLVER — Sprint 25
//
// Maps tracked entities (watchlist + interests) to specific,
// high-quality RSS feeds. This makes the feed react visibly
// to what the user actually follows.
//
// Usage:
//   getSourcesForEntities(["BTC", "NVDA", "AI"])
//   → RssSourceConfig[] of relevant feeds to add to collection
// ============================================================

export interface RssSourceConfig {
  name: string;
  url: string;
  tier: "A" | "B" | "C";
  entity: string;
  category: string;
}

// ── Entity → RSS feed mapping ──────────────────────────────

const ENTITY_SOURCES: Record<string, RssSourceConfig[]> = {
  // ── Crypto ───────────────────────────────────────────────
  Bitcoin: [
    { name: "CoinDesk Bitcoin", url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml", tier: "A", entity: "Bitcoin", category: "crypto" },
    { name: "Cointelegraph", url: "https://cointelegraph.com/rss", tier: "A", entity: "Bitcoin", category: "crypto" },
  ],
  Ethereum: [
    { name: "CoinDesk Ethereum", url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml", tier: "A", entity: "Ethereum", category: "crypto" },
    { name: "Cointelegraph", url: "https://cointelegraph.com/rss", tier: "A", entity: "Ethereum", category: "crypto" },
  ],

  // ── Tech / AI ─────────────────────────────────────────────
  OpenAI: [
    { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", tier: "A", entity: "OpenAI", category: "ai" },
    { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", tier: "B", entity: "OpenAI", category: "ai" },
    { name: "Hacker News", url: "https://hnrss.org/frontpage", tier: "B", entity: "OpenAI", category: "ai" },
  ],
  Anthropic: [
    { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", tier: "A", entity: "Anthropic", category: "ai" },
    { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", tier: "B", entity: "Anthropic", category: "ai" },
  ],
  "AI Agents": [
    { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", tier: "A", entity: "AI Agents", category: "ai" },
    { name: "Hacker News", url: "https://hnrss.org/frontpage", tier: "B", entity: "AI Agents", category: "ai" },
    { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", tier: "B", entity: "AI Agents", category: "ai" },
  ],

  // ── Stocks / Markets ──────────────────────────────────────
  Nvidia: [
    { name: "Reuters Technology", url: "https://feeds.reuters.com/reuters/technologyNews", tier: "A", entity: "Nvidia", category: "stocks" },
    { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", tier: "B", entity: "Nvidia", category: "stocks" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/", tier: "A", entity: "Nvidia", category: "stocks" },
  ],
  Tesla: [
    { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews", tier: "A", entity: "Tesla", category: "stocks" },
    { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", tier: "B", entity: "Tesla", category: "stocks" },
    { name: "Electrek", url: "https://electrek.co/feed/", tier: "B", entity: "Tesla", category: "ev" },
  ],
  BYD: [
    { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews", tier: "A", entity: "BYD", category: "stocks" },
    { name: "Electrek", url: "https://electrek.co/feed/", tier: "B", entity: "BYD", category: "ev" },
  ],

  // ── Gaming ────────────────────────────────────────────────
  Nintendo: [
    { name: "IGN", url: "https://feeds.ign.com/ign/all", tier: "B", entity: "Nintendo", category: "gaming" },
    { name: "Kotaku", url: "https://kotaku.com/rss", tier: "B", entity: "Nintendo", category: "gaming" },
  ],
  Steam: [
    { name: "PC Gamer", url: "https://www.pcgamer.com/rss/", tier: "B", entity: "Steam", category: "gaming" },
    { name: "Rock Paper Shotgun", url: "https://www.rockpapershotgun.com/feed", tier: "B", entity: "Steam", category: "gaming" },
  ],
  Gaming: [
    { name: "IGN", url: "https://feeds.ign.com/ign/all", tier: "B", entity: "Gaming", category: "gaming" },
    { name: "Kotaku", url: "https://kotaku.com/rss", tier: "B", entity: "Gaming", category: "gaming" },
    { name: "PC Gamer", url: "https://www.pcgamer.com/rss/", tier: "B", entity: "Gaming", category: "gaming" },
  ],

  // ── EV ────────────────────────────────────────────────────
  EV: [
    { name: "Electrek", url: "https://electrek.co/feed/", tier: "B", entity: "EV", category: "ev" },
    { name: "InsideEVs", url: "https://insideevs.com/rss/articles/all/", tier: "B", entity: "EV", category: "ev" },
    { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews", tier: "A", entity: "EV", category: "ev" },
  ],
};

// ── Watchlist term → entity lookup ────────────────────────

const WATCHLIST_ALIASES: Record<string, string> = {
  btc: "Bitcoin", bitcoin: "Bitcoin",
  eth: "Ethereum", ethereum: "Ethereum",
  nvda: "Nvidia", nvidia: "Nvidia",
  tsla: "Tesla", tesla: "Tesla",
  byd: "BYD",
  chatgpt: "OpenAI", openai: "OpenAI", gpt: "OpenAI",
  claude: "Anthropic", anthropic: "Anthropic",
  "ai agent": "AI Agents", "ai agents": "AI Agents",
  gaming: "Gaming", steam: "Steam", nintendo: "Nintendo",
  ev: "EV", "electric vehicle": "EV",
};

function resolveWatchlistToEntity(term: string): string | null {
  const lower = term.toLowerCase().trim();
  return WATCHLIST_ALIASES[lower] ?? null;
}

// ── Public API ────────────────────────────────────────────

/**
 * Returns deduplicated RSS sources for the given interests + watchlist terms.
 * Used by the feed pipeline to supplement default topic sources.
 */
export function getSourcesForEntities(
  interests: string[],
  watchlist: string[] = [],
): RssSourceConfig[] {
  const entities = new Set<string>();

  // From interests (direct match to ENTITY_SOURCES keys)
  for (const interest of interests) {
    if (ENTITY_SOURCES[interest]) entities.add(interest);
  }

  // From watchlist (alias lookup)
  for (const term of watchlist) {
    const entity = resolveWatchlistToEntity(term);
    if (entity && ENTITY_SOURCES[entity]) entities.add(entity);
  }

  // Collect sources, deduplicate by URL
  const seenUrls = new Set<string>();
  const result: RssSourceConfig[] = [];

  for (const entity of entities) {
    const sources = ENTITY_SOURCES[entity] ?? [];
    for (const source of sources) {
      if (!seenUrls.has(source.url)) {
        seenUrls.add(source.url);
        result.push(source);
      }
    }
  }

  return result;
}

/**
 * Returns all known entities that can be resolved to RSS sources.
 */
export function getKnownEntities(): string[] {
  return Object.keys(ENTITY_SOURCES);
}

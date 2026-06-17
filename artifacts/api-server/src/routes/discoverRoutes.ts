// ============================================================
// DISCOVER ROUTES — Sprint 24 (updated from Sprint 22)
// Mounted at /api via app.use("/api", router)
// Provides search and trending topics for the Discover page.
// Trending now uses real entity memory data (Sprint 24).
// ============================================================

import { Router } from "express";
import { getAllTrackedEntities } from "../services/intelligence/entityMemory.js";

const router = Router();

// ── Discover catalog (topics + entities + companies) ─────────

const DISCOVER_CATALOG = [
  // Topics
  { id: "ai", label: "Artificial Intelligence", type: "topic", tags: ["ai", "llm", "openai", "gpt"] },
  { id: "technology", label: "Technology", type: "topic", tags: ["tech", "software", "hardware"] },
  { id: "crypto", label: "Crypto & Web3", type: "topic", tags: ["bitcoin", "ethereum", "defi", "nft"] },
  { id: "stocks", label: "Stock Market", type: "topic", tags: ["nasdaq", "nyse", "equities", "s&p"] },
  { id: "business", label: "Business & Finance", type: "topic", tags: ["m&a", "earnings", "economy"] },
  { id: "startups", label: "Startups & VC", type: "topic", tags: ["funding", "ipo", "venture"] },
  { id: "energy", label: "Energy & Climate", type: "topic", tags: ["ev", "solar", "oil", "climate"] },
  { id: "politics", label: "Politics", type: "topic", tags: ["election", "policy", "government"] },
  { id: "geopolitics", label: "Geopolitics", type: "topic", tags: ["war", "sanctions", "diplomacy"] },
  { id: "science", label: "Science & Research", type: "topic", tags: ["nasa", "physics", "biology"] },
  { id: "gaming", label: "Gaming", type: "topic", tags: ["nintendo", "sony", "steam", "xbox"] },
  { id: "sports", label: "Sports", type: "topic", tags: ["football", "nba", "formula 1"] },
  // Companies
  { id: "company-nvidia", label: "NVIDIA", type: "company", tags: ["nvda", "gpu", "ai chips"] },
  { id: "company-apple", label: "Apple", type: "company", tags: ["aapl", "iphone", "macos"] },
  { id: "company-tesla", label: "Tesla", type: "company", tags: ["tsla", "ev", "elon musk"] },
  { id: "company-microsoft", label: "Microsoft", type: "company", tags: ["msft", "azure", "copilot"] },
  { id: "company-google", label: "Google / Alphabet", type: "company", tags: ["goog", "gemini", "search"] },
  { id: "company-meta", label: "Meta", type: "company", tags: ["fb", "instagram", "llama"] },
  { id: "company-openai", label: "OpenAI", type: "company", tags: ["chatgpt", "gpt-4", "sora"] },
  { id: "company-anthropic", label: "Anthropic", type: "company", tags: ["claude", "constitutional ai"] },
  // Crypto
  { id: "crypto-btc", label: "Bitcoin (BTC)", type: "crypto", tags: ["btc", "bitcoin", "satoshi"] },
  { id: "crypto-eth", label: "Ethereum (ETH)", type: "crypto", tags: ["eth", "ethereum", "defi"] },
  { id: "crypto-sol", label: "Solana (SOL)", type: "crypto", tags: ["sol", "solana"] },
  { id: "crypto-bnb", label: "BNB Chain", type: "crypto", tags: ["bnb", "binance"] },
  // People
  { id: "person-elon", label: "Elon Musk", type: "person", tags: ["tesla", "spacex", "x", "twitter"] },
  { id: "person-jensen", label: "Jensen Huang", type: "person", tags: ["nvidia", "gpu"] },
  { id: "person-sam", label: "Sam Altman", type: "person", tags: ["openai", "chatgpt"] },
];

// ── Curated fallback trending list ───────────────────────────

const CURATED_TRENDING = [
  { id: "ai", label: "Artificial Intelligence", type: "topic", trend: "hot" },
  { id: "crypto-btc", label: "Bitcoin (BTC)", type: "crypto", trend: "rising" },
  { id: "company-nvidia", label: "NVIDIA", type: "company", trend: "hot" },
  { id: "geopolitics", label: "Geopolitics", type: "topic", trend: "active" },
  { id: "company-openai", label: "OpenAI", type: "company", trend: "rising" },
  { id: "energy", label: "Energy & Climate", type: "topic", trend: "active" },
];

// ── Trend label from mention count ───────────────────────────

function trendLabel(mentions: number): "hot" | "rising" | "active" | "steady" {
  if (mentions >= 10) return "hot";
  if (mentions >= 5) return "rising";
  if (mentions >= 2) return "active";
  return "steady";
}

// GET /discover/search?q=&type=
router.get("/discover/search", (req, res) => {
  const q = ((req.query.q as string) ?? "").toLowerCase().trim();
  const type = ((req.query.type as string) ?? "").toLowerCase().trim();

  let results = DISCOVER_CATALOG;

  if (type && type !== "all") {
    results = results.filter((item) => item.type === type);
  }

  if (q) {
    results = results.filter((item) => {
      const searchable = [item.label, ...item.tags].join(" ").toLowerCase();
      return searchable.includes(q);
    });
  }

  res.json({ results, total: results.length, q, type });
});

// GET /discover/trending — live trending from entity memory
// Falls back to curated list when entity memory is empty.
router.get("/discover/trending", (_req, res) => {
  const entities = getAllTrackedEntities();

  if (entities.length === 0) {
    res.json({ trending: CURATED_TRENDING, source: "curated" });
    return;
  }

  // Sort by mention count (descending), take top 8
  const sorted = [...entities]
    .sort((a, b) => (b.mentionCount ?? 0) - (a.mentionCount ?? 0))
    .slice(0, 8);

  const trending = sorted.map((entity) => {
    const catalogMatch = DISCOVER_CATALOG.find(
      (c) => c.label.toLowerCase() === entity.entityId.toLowerCase() ||
              c.tags.some((t) => entity.entityId.toLowerCase().includes(t)),
    );

    return {
      id: catalogMatch?.id ?? entity.entityId.toLowerCase().replace(/\s+/g, "-"),
      label: entity.entityId,
      type: catalogMatch?.type ?? "topic",
      trend: trendLabel(entity.mentionCount ?? 1),
      mentions: entity.mentionCount ?? 1,
    };
  });

  res.json({ trending, source: "live", entityCount: entities.length });
});

export default router;

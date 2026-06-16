// ============================================================
// ACTIONABLE INSIGHT ENGINE — Sprint 16 Task E
//
// Generates executive-grade strategic implications for narratives.
//
// Produces:
//   - Strategic implications (what this means)
//   - Possible next effects (probable downstream events)
//   - What to monitor next
//   - Sectors/entities potentially impacted
//
// Design rules:
//   - No financial advice claims
//   - Probabilistic wording only ("may", "could", "suggests")
//   - No hallucination — only derives from article text + entity graph
//   - Concise: ≤ 2 sentences per implication
//
// Architecture: pure functions, no I/O, no side effects.
// ============================================================

import type { RssArticle } from "../news/rssService.js";

// ── Types ─────────────────────────────────────────────────────

export interface ActionableInsight {
  strategicImplication: string;    // What this means strategically
  possibleNextEffects: string[];   // Likely downstream events (2–3 items)
  whatToMonitor: string[];         // Entities/signals to watch (2–4 items)
  impactedSectors: string[];       // Sectors that may be affected
  impactedEntities: string[];      // Named entities to watch
  insightGrade: "executive" | "analyst" | "informational";
  disclaimer: string;              // Short disclaimer line
}

// ── Sector impact maps ────────────────────────────────────────

type SectorTrigger = {
  keywords: string[];
  sectors: string[];
  entities: string[];
  nextEffects: string[];
};

const SECTOR_TRIGGERS: SectorTrigger[] = [
  {
    keywords: ["rate", "fed", "interest rate", "federal reserve", "monetary policy"],
    sectors: ["Banking", "Real estate", "Growth equities", "Bond markets"],
    entities: ["JPMorgan", "Goldman Sachs", "Treasury yields", "REIT sector"],
    nextEffects: [
      "Bond yields may reprice across the curve",
      "Growth equities could face valuation compression",
      "Mortgage rates may shift within 2–4 weeks",
    ],
  },
  {
    keywords: ["nvidia", "gpu", "chip", "semiconductor", "tsmc", "ai chips"],
    sectors: ["AI infrastructure", "Cloud computing", "Data centres", "Consumer electronics"],
    entities: ["TSMC", "AMD", "Intel", "AWS", "Azure", "Google Cloud"],
    nextEffects: [
      "AI compute costs may shift for cloud providers",
      "Data centre capex plans could be revised",
      "Adjacent AI hardware suppliers may be impacted",
    ],
  },
  {
    keywords: ["openai", "anthropic", "gpt", "claude", "llm", "foundation model"],
    sectors: ["Enterprise software", "AI tooling", "Knowledge work", "Developer tools"],
    entities: ["Microsoft", "Google", "Salesforce", "Workday", "GitHub"],
    nextEffects: [
      "Enterprise AI adoption timelines may accelerate",
      "Competing foundation model providers may respond",
      "AI tooling and wrapper startups may be disrupted",
    ],
  },
  {
    keywords: ["bitcoin", "crypto", "ethereum", "btc", "defi", "stablecoin"],
    sectors: ["Digital assets", "Fintech", "Institutional finance"],
    entities: ["Coinbase", "BlackRock BTC ETF", "SEC crypto policy", "Binance"],
    nextEffects: [
      "Institutional allocation strategies may shift",
      "Regulatory scrutiny could intensify or ease",
      "Stablecoin liquidity dynamics may be affected",
    ],
  },
  {
    keywords: ["apple", "iphone", "ios", "app store", "mac", "vision pro"],
    sectors: ["Consumer electronics", "App ecosystem", "Digital advertising"],
    entities: ["App Store developers", "Samsung", "Android ecosystem", "Meta Platforms"],
    nextEffects: [
      "App developers may need to adapt monetisation strategies",
      "Competing platforms could benefit from ecosystem shifts",
      "Consumer upgrade cycles may be influenced",
    ],
  },
  {
    keywords: ["tesla", "ev", "electric vehicle", "battery", "charging"],
    sectors: ["Electric vehicles", "Energy storage", "Auto supply chain"],
    entities: ["BYD", "Panasonic", "CATL", "Charging network operators"],
    nextEffects: [
      "EV pricing competition may intensify",
      "Battery supply chain negotiations could shift",
      "Charging infrastructure investment may be affected",
    ],
  },
  {
    keywords: ["inflation", "cpi", "gdp", "recession", "unemployment", "economic"],
    sectors: ["Consumer goods", "Housing", "Labor markets", "Fixed income"],
    entities: ["Federal Reserve", "Treasury", "Consumer confidence index"],
    nextEffects: [
      "Consumer spending behaviour may shift near-term",
      "Corporate margin guidance could face headwinds",
      "Central bank policy signals may change",
    ],
  },
  {
    keywords: ["regulation", "sec", "ban", "law", "court", "ruling", "fine"],
    sectors: ["Compliance", "Legal risk", "Affected industry"],
    entities: ["SEC", "FTC", "DOJ", "EU regulators", "Congressional oversight"],
    nextEffects: [
      "Industry compliance costs may increase",
      "Affected companies could face operational constraints",
      "Sector-wide regulatory review may follow",
    ],
  },
  {
    keywords: ["merger", "acquisition", "ipo", "buyout", "deal", "takeover"],
    sectors: ["M&A activity", "Investment banking", "Sector consolidation"],
    entities: ["Goldman Sachs", "Morgan Stanley", "Private equity"],
    nextEffects: [
      "Sector consolidation may accelerate or trigger defensive responses",
      "Competitor valuations could be re-rated",
      "Antitrust review timeline may affect deal certainty",
    ],
  },
  {
    keywords: ["war", "conflict", "military", "geopolitical", "sanctions", "nuclear"],
    sectors: ["Energy", "Defence", "Supply chains", "Commodities"],
    entities: ["Oil futures", "Commodity markets", "Defence contractors", "Shipping routes"],
    nextEffects: [
      "Energy and commodity prices may exhibit heightened volatility",
      "Global supply chains could face disruption risk",
      "Risk assets may be repriced as uncertainty rises",
    ],
  },
];

// ── Keyword matching ──────────────────────────────────────────

function findMatchingTriggers(text: string): SectorTrigger[] {
  const lower = text.toLowerCase();
  return SECTOR_TRIGGERS.filter((t) =>
    t.keywords.some((kw) => lower.includes(kw)),
  );
}

// ── Implication builder ───────────────────────────────────────

const STRATEGIC_VERBS = [
  "may signal", "suggests", "could indicate", "points to",
  "raises the probability of", "accelerates the case for",
];

function randomVerb(): string {
  return STRATEGIC_VERBS[Math.floor(Math.random() * STRATEGIC_VERBS.length)];
}

function buildStrategicImplication(
  article: RssArticle,
  triggers: SectorTrigger[],
): string {
  const title = article.title;
  const lower = title.toLowerCase();

  if (triggers.length === 0) {
    return `This development ${randomVerb()} a shift in the broader information environment. Monitor for follow-on confirmation from institutional sources.`;
  }

  const topTrigger = triggers[0];
  const sector = topTrigger.sectors[0] ?? "the affected sector";

  if (lower.includes("rate") || lower.includes("fed")) {
    return `This ${randomVerb()} a change in the monetary policy outlook, which may have cascading effects on ${sector} pricing and risk appetite.`;
  }
  if (lower.includes("regulation") || lower.includes("ban") || lower.includes("ruling")) {
    return `This regulatory development ${randomVerb()} a shift in compliance requirements for ${sector}, with potential operational and cost implications.`;
  }
  if (lower.includes("acquisition") || lower.includes("merger")) {
    return `This M&A signal ${randomVerb()} consolidation momentum in ${sector}, which could reshape competitive dynamics and valuation benchmarks.`;
  }

  return `This development in ${sector} ${randomVerb()} a structural shift that may ripple across adjacent sectors over the ${triggers.length > 1 ? "short to medium" : "medium"} term.`;
}

function buildInsightGrade(
  article: RssArticle,
  triggers: SectorTrigger[],
): ActionableInsight["insightGrade"] {
  if (triggers.length >= 2) return "executive";
  if (triggers.length === 1) return "analyst";
  return "informational";
}

// ── Main function ─────────────────────────────────────────────

/**
 * Generate actionable strategic insights for an article.
 * Uses heuristic sector-mapping — no AI call required.
 */
export function generateActionInsight(
  article: RssArticle,
  allArticles: RssArticle[] = [],
): ActionableInsight {
  const text = `${article.title} ${article.description ?? ""}`;
  const triggers = findMatchingTriggers(text);

  const sectors = [...new Set(triggers.flatMap((t) => t.sectors))].slice(0, 4);
  const entities = [...new Set(triggers.flatMap((t) => t.entities))].slice(0, 5);
  const nextEffects = triggers.length > 0
    ? [...new Set(triggers.flatMap((t) => t.nextEffects))].slice(0, 3)
    : ["Monitor for follow-on confirmation from institutional sources"];

  const whatToMonitor: string[] = entities.length > 0
    ? entities.slice(0, 4)
    : ["Broader market reaction", "Follow-on analyst commentary"];

  return {
    strategicImplication: buildStrategicImplication(article, triggers),
    possibleNextEffects: nextEffects,
    whatToMonitor,
    impactedSectors: sectors.length > 0 ? sectors : ["General markets"],
    impactedEntities: entities,
    insightGrade: buildInsightGrade(article, triggers),
    disclaimer:
      "For informational purposes only. Not financial or investment advice. " +
      "All implications are probabilistic, not predictive.",
  };
}

/**
 * Generate a condensed insight for Telegram/export (1 implication + watch list).
 */
export function generateCondensedInsight(article: RssArticle): {
  implication: string;
  watchList: string[];
} {
  const insight = generateActionInsight(article);
  return {
    implication: insight.strategicImplication,
    watchList: insight.whatToMonitor.slice(0, 3),
  };
}

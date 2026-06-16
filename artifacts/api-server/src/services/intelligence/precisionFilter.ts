// ============================================================
// PRECISION FILTER — Sprint 15 Task A
//
// High-precision relevance filtering that sits on top of the
// existing relevanceClassifier and signalScoring pipeline.
//
// Solves:
//   - BTC/crypto feed noise from low-trust, unconfirmed sources
//   - Weak incidental matches polluting interest feeds
//   - Articles that mention an entity once but aren't about it
//
// New scoring dimensions:
//   - directEntityWeight: entity hit with importance multiplier
//   - narrativeImportance: multi-source confirmation of same story
//   - sourceTrust: tier-weighted trust (A=1.0, B=0.7, C=0.35)
//   - topicPurity: fraction of title/description about the topic
//   - weakMatchSuppression: hard-filter incidental articles
//   - contextualDecay: older articles decay faster for contextual hits
//
// Special crypto handling:
//   If article topic is crypto/BTC AND source tier is C
//   AND no multi-source confirmation → downgrade score to 0
//
// Architecture: pure functions, no side effects, no I/O.
// ============================================================

import { getSourceTier } from "../news/sourceRegistry.js";
import type { RssArticle } from "../news/rssService.js";

// ── Entity importance tiers ───────────────────────────────────
//
// Entities are weighted by their information density:
// A "CEO" mention is more specific than a brand mention which
// is more specific than a topic keyword.

const ENTITY_WEIGHTS: Record<string, number> = {
  // CEOs / Founders (highest signal — very specific)
  "sam altman": 3.0, "elon musk": 3.0, "jensen huang": 3.0,
  "sundar pichai": 2.8, "satya nadella": 2.8, "mark zuckerberg": 2.8,
  "tim cook": 2.8, "dario amodei": 2.8, "demis hassabis": 2.8,
  "larry fink": 2.6, "jerome powell": 2.6, "janet yellen": 2.6,
  "vitalik buterin": 2.6, "changpeng zhao": 2.6,

  // Products / Models (high signal — very specific)
  "gpt-4": 2.5, "gpt-5": 2.5, "claude": 2.5, "gemini": 2.5,
  "llama": 2.4, "mistral": 2.4, "deepseek": 2.4, "o1": 2.3, "o3": 2.3,
  "h100": 2.4, "blackwell": 2.4, "b200": 2.4,
  "model 3": 2.2, "model y": 2.2, "cybertruck": 2.2,

  // Companies (medium-high signal)
  "openai": 2.2, "anthropic": 2.2, "deepmind": 2.2,
  "nvidia": 2.0, "tesla": 2.0, "apple": 2.0, "microsoft": 2.0,
  "google": 1.8, "meta": 1.8, "amazon": 1.8, "alphabet": 1.8,
  "federal reserve": 2.2, "fed": 1.8,

  // Crypto entities (medium signal — noisy domain)
  "bitcoin": 1.8, "btc": 1.8, "ethereum": 1.7, "eth": 1.6,
  "solana": 1.5, "bnb": 1.4, "coinbase": 1.6, "binance": 1.6,

  // Market entities
  "s&p 500": 2.0, "nasdaq": 1.9, "dow jones": 1.8,
  "tsla": 2.0, "nvda": 2.0, "aapl": 1.9, "msft": 1.9,
};

// ── Crypto source trust list ──────────────────────────────────
//
// These are known crypto-native sources. Articles from them
// require cross-source confirmation from a non-crypto source
// before being considered high-confidence.

const CRYPTO_NATIVE_SOURCES = new Set([
  "CoinDesk", "CoinTelegraph", "Decrypt", "CryptoSlate",
  "Bitcoin Magazine", "The Block", "Blockworks", "CryptoNews",
  "DeFi Pulse", "CoinGecko", "BeInCrypto", "Cryptobriefing",
  "Bitcoinist", "NewsBTC", "AMBCrypto", "U.Today",
]);

// ── Crypto topic keywords ─────────────────────────────────────

const CRYPTO_KEYWORDS = [
  "bitcoin", "btc", "ethereum", "eth", "crypto", "cryptocurrency",
  "defi", "nft", "blockchain", "altcoin", "token", "web3",
  "solana", "binance", "coinbase", "satoshi", "halving",
];

// ── Source trust scores ───────────────────────────────────────

function getSourceTrustScore(source: string | null | undefined): number {
  const tier = getSourceTier(source);
  switch (tier) {
    case "A": return 1.0;
    case "B": return 0.70;
    default:  return 0.35; // Tier C — significantly penalized
  }
}

// ── Entity importance scoring ────────────────────────────────

function scoreEntityImportance(text: string, interests: string[]): {
  score: number;
  hitEntities: string[];
} {
  const lower = text.toLowerCase();
  let score = 0;
  const hitEntities: string[] = [];

  for (const [entity, weight] of Object.entries(ENTITY_WEIGHTS)) {
    if (lower.includes(entity)) {
      // Extra boost if this entity matches a user interest
      const interestBoost = interests.some(
        (i) => i.toLowerCase() === entity || entity.includes(i.toLowerCase())
      ) ? 1.4 : 1.0;
      score += weight * interestBoost * 10;
      hitEntities.push(entity);
    }
  }

  return { score: Math.min(score, 60), hitEntities };
}

// ── Topic purity scoring ─────────────────────────────────────
//
// Measures what fraction of the title + description text is
// semantically focused on the matched topic/entities.
// An article that mentions "Bitcoin" once in a paragraph about
// general market trends is low-purity.

function scoreTopicPurity(
  article: RssArticle,
  topicKeywords: string[],
): number {
  if (topicKeywords.length === 0) return 30;

  const titleWords = (article.title ?? "").toLowerCase().split(/\s+/);
  const descWords = (article.description ?? "").toLowerCase().split(/\s+/);

  const titleHits = titleWords.filter((w) =>
    topicKeywords.some((kw) => w.includes(kw.toLowerCase()))
  ).length;

  const descHits = descWords.filter((w) =>
    topicKeywords.some((kw) => w.includes(kw.toLowerCase()))
  ).length;

  // Title hits are worth 3x — title is more focused than description
  const totalHits = titleHits * 3 + descHits;
  const totalWords = titleWords.length * 3 + descWords.length;
  const density = totalWords > 0 ? totalHits / totalWords : 0;

  // Title hit bonus: if the topic appears in title, +15 minimum purity
  const titleBonus = titleHits > 0 ? 15 : 0;

  return Math.min(Math.round(density * 200) + titleBonus, 40);
}

// ── Cross-source confirmation ────────────────────────────────
//
// Returns true if at least one OTHER source (from a non-crypto-native
// or non-Tier-C source) covers the same story.

function hasNonCryptoSourceConfirmation(
  article: RssArticle,
  allArticles: RssArticle[],
): boolean {
  const titleWords = article.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
  if (titleWords.length < 3) return false;
  const coreWords = titleWords.slice(0, 5);

  return allArticles.some((other) => {
    if (other.url === article.url) return false;
    if (other.source === article.source) return false;
    if (CRYPTO_NATIVE_SOURCES.has(other.source)) return false;
    const tier = getSourceTier(other.source);
    if (tier === "C") return false;
    const otherText = other.title.toLowerCase();
    const matches = coreWords.filter((w) => otherText.includes(w)).length;
    return matches >= 3;
  });
}

// ── Contextual relevance decay ────────────────────────────────
//
// Contextual hits (graph-matched entities, not direct keywords)
// decay faster over time. Direct entity hits decay more slowly.

function contextualDecayMultiplier(
  pubDate: string | null | undefined,
  isDirectHit: boolean,
): number {
  if (!pubDate) return 0.85;
  const ageHours = (Date.now() - new Date(pubDate).getTime()) / 3_600_000;

  if (isDirectHit) {
    if (ageHours <= 6) return 1.0;
    if (ageHours <= 24) return 0.95;
    if (ageHours <= 48) return 0.85;
    return 0.70;
  } else {
    // Contextual hits decay faster
    if (ageHours <= 3) return 1.0;
    if (ageHours <= 12) return 0.85;
    if (ageHours <= 24) return 0.65;
    return 0.40;
  }
}

// ── Precision score output ────────────────────────────────────

export interface PrecisionScore {
  totalScore: number;          // 0–100 composite
  entityImportanceScore: number;
  topicPurityScore: number;
  sourceTrustScore: number;
  crossSourceBonus: number;
  decayMultiplier: number;
  hitEntities: string[];
  isSuppressed: boolean;       // true = article should be removed from feed
  suppressionReason?: string;  // why it was suppressed
  isCryptoDowngraded: boolean; // crypto noise flag
}

// ── Weak-match suppression thresholds ────────────────────────

const SUPPRESSION_THRESHOLD = 12;         // Below this → remove from feed
const CRYPTO_CONFIRMATION_THRESHOLD = 20; // Crypto articles need higher base to survive without confirmation

// ── Main precision scoring function ──────────────────────────

export function scorePrecision(
  article: RssArticle,
  interests: string[],
  topicKeywords: string[],
  allArticles: RssArticle[] = [],
): PrecisionScore {
  const text = `${article.title} ${article.description ?? ""}`;

  const { score: entityScore, hitEntities } = scoreEntityImportance(text, interests);
  const topicPurityScore = scoreTopicPurity(article, topicKeywords);
  const sourceTrustRaw = getSourceTrustScore(article.source);
  const isDirectHit = hitEntities.length > 0;
  const decay = contextualDecayMultiplier(article.pubDate, isDirectHit);

  // Check if article is crypto-domain
  const lowerText = text.toLowerCase();
  const isCryptoContent = CRYPTO_KEYWORDS.some((kw) => lowerText.includes(kw));
  const isCryptoNativeSource = CRYPTO_NATIVE_SOURCES.has(article.source ?? "");
  const sourceTier = getSourceTier(article.source);

  // Cross-source confirmation bonus
  let crossSourceBonus = 0;
  if (allArticles.length > 1) {
    const hasMajorConfirmation = hasNonCryptoSourceConfirmation(article, allArticles);
    if (hasMajorConfirmation) crossSourceBonus = 20;
  }

  // Source trust score (0–25 points)
  const sourceTrustScore = Math.round(sourceTrustRaw * 25);

  // Raw total before decay
  const rawTotal = entityScore + topicPurityScore + sourceTrustScore + crossSourceBonus;

  // Apply decay
  const totalScore = Math.min(Math.round(rawTotal * decay), 100);

  // ── Crypto downgrade logic ──────────────────────────────────
  //
  // A crypto article from a low-trust source with no confirmation
  // from a major financial source is suppressed.
  let isCryptoDowngraded = false;
  let suppressionReason: string | undefined;

  if (
    isCryptoContent &&
    (isCryptoNativeSource || sourceTier === "C") &&
    crossSourceBonus === 0
  ) {
    isCryptoDowngraded = true;
    if (totalScore < CRYPTO_CONFIRMATION_THRESHOLD) {
      suppressionReason = `Crypto article from low-trust source (${article.source}) without major-source confirmation`;
    }
  }

  // ── Weak-match suppression ──────────────────────────────────
  const isSuppressed =
    (isCryptoDowngraded && totalScore < CRYPTO_CONFIRMATION_THRESHOLD) ||
    (totalScore < SUPPRESSION_THRESHOLD && hitEntities.length === 0);

  if (isSuppressed && !suppressionReason) {
    suppressionReason = totalScore < SUPPRESSION_THRESHOLD
      ? `Score ${totalScore} below suppression threshold (${SUPPRESSION_THRESHOLD})`
      : undefined;
  }

  return {
    totalScore,
    entityImportanceScore: entityScore,
    topicPurityScore,
    sourceTrustScore,
    crossSourceBonus,
    decayMultiplier: decay,
    hitEntities,
    isSuppressed,
    suppressionReason,
    isCryptoDowngraded,
  };
}

// ── Batch precision scoring ──────────────────────────────────

export interface ScoredWithPrecision extends RssArticle {
  precisionScore: PrecisionScore;
}

/**
 * Score all articles for precision relevance.
 * Articles below the suppression threshold are flagged for removal.
 * Always keeps at least `minArticles` even if many are suppressed.
 */
export function applyPrecisionFilter(
  articles: RssArticle[],
  interests: string[],
  topicKeywords: string[],
  minArticles = 3,
): ScoredWithPrecision[] {
  const scored: ScoredWithPrecision[] = articles.map((a) => ({
    ...a,
    precisionScore: scorePrecision(a, interests, topicKeywords, articles),
  }));

  // Sort by precision score (highest first)
  scored.sort((a, b) => b.precisionScore.totalScore - a.precisionScore.totalScore);

  // Remove suppressed articles (keep at least minArticles)
  const unsuppressed = scored.filter((a) => !a.precisionScore.isSuppressed);

  if (unsuppressed.length >= minArticles) {
    return unsuppressed;
  }

  // Not enough unsuppressed — return top `minArticles` regardless
  return scored.slice(0, Math.max(minArticles, unsuppressed.length));
}

/**
 * Get the topic keywords for a set of interests.
 * Combines interest-definition keywords with common topic terms.
 */
export function getTopicKeywordsForInterests(interests: string[]): string[] {
  const keywords: string[] = [];
  // Import lazily to avoid circular deps — inline the key interest keywords
  const INTEREST_KEYWORDS: Record<string, string[]> = {
    Bitcoin: ["bitcoin", "btc", "crypto", "cryptocurrency", "blockchain", "halving"],
    Ethereum: ["ethereum", "eth", "defi", "smart contract", "vitalik"],
    Nvidia: ["nvidia", "nvda", "jensen huang", "gpu", "h100", "blackwell"],
    Tesla: ["tesla", "elon musk", "tsla", "ev", "electric vehicle"],
    OpenAI: ["openai", "chatgpt", "gpt", "sam altman", "dall-e", "sora"],
    Anthropic: ["anthropic", "claude", "dario amodei"],
    "AI Agents": ["ai agent", "agentic", "tool use", "mcp", "multi-agent"],
    Gaming: ["gaming", "video game", "playstation", "xbox", "esports"],
    EV: ["electric vehicle", "ev", "battery", "charging", "lithium"],
    Nintendo: ["nintendo", "switch", "mario", "zelda", "pokemon"],
    BYD: ["byd", "chinese ev", "wang chuanfu"],
    Steam: ["steam", "valve", "steam deck", "pc gaming"],
  };
  for (const interest of interests) {
    keywords.push(...(INTEREST_KEYWORDS[interest] ?? [interest.toLowerCase()]));
  }
  return [...new Set(keywords)];
}

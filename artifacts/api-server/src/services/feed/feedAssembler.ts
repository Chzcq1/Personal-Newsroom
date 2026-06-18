// ============================================================
// FEED ASSEMBLER — Sprint 30: Trend-First Feed Architecture
//
// Transforms the feed from article-centric to trend-centric.
//
// Pipeline:
//   1. Collect raw articles from RSS (parallel, all topics)
//   2. Fetch active trend cache
//   3. Match articles → trends using trendFusion
//   4. Group matched articles under trend cards
//   5. Personalize order by user interests + momentum
//   6. Inject discovery cards every DISCOVERY_INTERVAL positions
//   7. Append ungrouped articles as article-type cards
//
// Token cost: ZERO — no AI calls.
// ============================================================

import { collectArticlesForTopic } from "../news/newsCollectorService.js";
import { INTEREST_DEFINITIONS } from "../news/feedGenerator.js";
import { getSourceTier } from "../news/sourceRegistry.js";
import { getSourcesForEntities } from "../news/entityResolver.js";
import { fetchFeed } from "../news/rssService.js";
import type { RssArticle } from "../news/rssService.js";
import { getRecentTrends } from "../trendIngestion/index.js";
import type { TrendItem } from "../trendIngestion/index.js";
import {
  matchArticleToTrends,
  buildDiscoveryInjections,
} from "../trendGraph/trendFusion.js";
import { expandEntities } from "../trendGraph/entityGraph.js";
import { logger } from "../../lib/logger.js";

// ── Constants ─────────────────────────────────────────────────

const DISCOVERY_INTERVAL = 5;     // inject 1 discovery card every N cards
const MAX_ARTICLES_PER_CARD = 5;  // max supporting articles per trend card
const MIN_ARTICLES_PER_CARD = 1;
const MAX_TOTAL_CARDS = 40;

// ── Types ─────────────────────────────────────────────────────

export interface SupportingArticle {
  title: string;
  url: string;
  source: string | null;
  pubDate: string | null;
  description: string | null;
  imageUrl: string | null;
  sourceTier: string;
}

export interface TrendMomentum {
  label: "exploding" | "rising" | "stable" | "fading";
  score: number;
  platforms: string[];
  regions: string[];
  discussionCount: number;
  whyTrending: string;
}

export interface TrendFeedCard {
  id: string;
  type: "trend" | "discovery" | "article";
  // Primary trend identity
  trendTitle: string;
  trendHook: string;         // Thai hook phrase
  trendKeyword: string;      // matched keyword (lowercase)
  momentum: TrendMomentum;
  topicId: string;
  personalScore: number;     // 0–100
  // Supporting evidence
  articles: SupportingArticle[];
  articleCount: number;      // total matched (not just shown)
  // Discovery-only fields
  discoveryEntity?: string;
  discoveryReason?: string;  // Thai explanation
  adjacentTo?: string[];
}

// ── Momentum helpers ──────────────────────────────────────────

function scoreToLabel(score: number): TrendMomentum["label"] {
  if (score >= 75) return "exploding";
  if (score >= 45) return "rising";
  if (score >= 20) return "stable";
  return "fading";
}

const THAI_HOOKS: Record<TrendMomentum["label"], string[]> = {
  exploding: [
    "ทุกคนกำลังพูดถึงเรื่องนี้",
    "เทรนด์นี้ระเบิดในชั่วโมงที่ผ่านมา",
    "กำลังแพร่กระจายทุกแพลตฟอร์ม",
    "อย่าพลาดสัญญาณนี้",
  ],
  rising: [
    "ความสนใจกำลังเพิ่มสูงขึ้น",
    "สัญญาณกำลังแข็งแกร่งขึ้น",
    "นักวิเคราะห์กำลังจับตามอง",
    "เทรนด์นี้กำลังก่อตัว",
  ],
  stable: [
    "อยู่ในความสนใจอย่างต่อเนื่อง",
    "ข้อมูลล่าสุดจากแหล่งชั้นนำ",
  ],
  fading: [
    "ข่าวล่าสุดในหัวข้อนี้",
  ],
};

function pickHook(label: TrendMomentum["label"], seed: string): string {
  const pool = THAI_HOOKS[label];
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return pool[hash % pool.length] ?? pool[0]!;
}

// ── Human-readable trend title ────────────────────────────────
// Convert "openai" → "OpenAI", "fed rate" → "Fed Rate", etc.

const ENTITY_DISPLAY_NAMES: Record<string, string> = {
  ai: "Artificial Intelligence",
  openai: "OpenAI",
  nvidia: "NVIDIA",
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  crypto: "Crypto",
  fed: "Federal Reserve",
  "interest rates": "Interest Rates",
  stocks: "Stock Market",
  "s&p 500": "S&P 500",
  tesla: "Tesla",
  apple: "Apple",
  google: "Google",
  microsoft: "Microsoft",
  meta: "Meta",
  amazon: "Amazon",
  trump: "Trump",
  china: "China",
  ukraine: "Ukraine",
  israel: "Israel",
  thailand: "Thailand",
  japan: "Japan",
  economy: "Economy",
  inflation: "Inflation",
  recession: "Recession",
  ipo: "IPO",
  startup: "Startups",
  robotics: "Robotics",
  "electric vehicles": "Electric Vehicles",
  ev: "EV",
  climate: "Climate",
};

function humanizeKeyword(kw: string): string {
  const lower = kw.toLowerCase().trim();
  if (ENTITY_DISPLAY_NAMES[lower]) return ENTITY_DISPLAY_NAMES[lower];
  // Title-case fallback
  return kw.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Article cache (5-minute TTL, per topic) ───────────────────

const ARTICLE_CACHE_TTL_MS = 5 * 60 * 1000;
const articleCache = new Map<string, { articles: RssArticle[]; expiresAt: number }>();

async function fetchTopicArticlesCached(topicId: string): Promise<{ topicId: string; articles: RssArticle[] }> {
  const now = Date.now();
  const hit = articleCache.get(topicId);
  if (hit && hit.expiresAt > now) {
    return { topicId, articles: hit.articles };
  }
  const result = await collectArticlesForTopic(topicId);
  articleCache.set(topicId, { articles: result.articles, expiresAt: now + ARTICLE_CACHE_TTL_MS });
  return { topicId, articles: result.articles };
}

// ── Article collection (simplified from feed.ts) ─────────────

async function collectArticles(
  interests: string[],
  watchlist: string[],
): Promise<Array<RssArticle & { topicId: string }>> {
  const topicIds = new Set<string>();
  for (const interest of interests) {
    const def = INTEREST_DEFINITIONS[interest];
    if (def) for (const id of def.topicIds) topicIds.add(id);
  }
  if (topicIds.size === 0) {
    ["ai", "technology", "stocks", "economy", "politics"].forEach((id) => topicIds.add(id));
  }

  const topicResults = await Promise.allSettled(
    Array.from(topicIds).map((topicId) => fetchTopicArticlesCached(topicId)),
  );

  const raw: Array<RssArticle & { topicId: string }> = [];

  for (const r of topicResults) {
    if (r.status === "rejected") continue;
    for (const a of r.value.articles) raw.push({ ...a, topicId: r.value.topicId });
  }

  // Entity-specific sources (watchlist / interests)
  const entitySources = getSourcesForEntities(interests, watchlist);
  if (entitySources.length > 0) {
    const entityResults = await Promise.allSettled(
      entitySources.map(async (src) => {
        const result = await fetchFeed(src.url, src.name);
        return { topicId: src.category, articles: result.articles };
      }),
    );
    for (const r of entityResults) {
      if (r.status === "rejected") continue;
      for (const a of r.value.articles) raw.push({ ...a, topicId: r.value.topicId });
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return raw.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

// ── Personalization score ─────────────────────────────────────
// How relevant is this trend to the user's interests?

function personalizeScore(
  keyword: string,
  topicId: string,
  interests: string[],
  watchlist: string[],
  entityMap: Map<string, number>,
  momentumScore: number,
): number {
  let score = momentumScore * 0.4; // momentum is 40% of rank

  // Interest match
  const text = keyword.toLowerCase();
  for (const interest of interests) {
    if (text.includes(interest.toLowerCase())) { score += 30; break; }
    const def = INTEREST_DEFINITIONS[interest];
    if (def?.topicIds.includes(topicId)) { score += 15; break; }
  }

  // Watchlist match
  for (const term of watchlist) {
    if (text.includes(term.toLowerCase())) { score += 25; break; }
  }

  // Entity graph match
  if (entityMap.has(text)) {
    score += (entityMap.get(text) ?? 0) * 20;
  }

  return Math.min(100, Math.round(score));
}

// ── Main assembler ────────────────────────────────────────────

export async function assembleForUser(
  interests: string[],
  watchlist: string[],
): Promise<{ cards: TrendFeedCard[]; stats: AssemblerStats }> {
  const startMs = Date.now();

  // Parallel: collect articles + get trends
  const [rawArticles, activeTrends] = await Promise.all([
    collectArticles(interests, watchlist),
    Promise.resolve(getRecentTrends(200)),
  ]);

  const entityMap = expandEntities(interests, 2);

  logger.info(
    { articles: rawArticles.length, trends: activeTrends.length, interests },
    "[FeedAssembler] Assembling trend-first feed",
  );

  // ── Match articles → trends ──────────────────────────────────
  // For each article, find all matching trend items above threshold.
  // Group articles by their best matching trend keyword.

  const trendGroups = new Map<string, {
    keyword: string;
    topicId: string;
    trend: TrendItem;
    matchScore: number;
    articles: Array<RssArticle & { topicId: string; matchScore: number }>;
    platforms: Set<string>;
    regions: Set<string>;
    discussionCount: number;
  }>();

  const ungroupedArticles: Array<RssArticle & { topicId: string }> = [];

  for (const article of rawArticles) {
    if (activeTrends.length === 0) {
      ungroupedArticles.push(article);
      continue;
    }

    const matches = matchArticleToTrends(
      article.title,
      article.description ?? null,
      article.topicId,
      activeTrends,
      interests,
    );

    // matchArticleToTrends already filters internally at 0.18; use all returned matches
    const valid = matches;

    if (valid.length === 0) {
      ungroupedArticles.push(article);
      continue;
    }

    // Use best match as the group key.
    // Key = topicId + primary entity — prevents collapsing all "ai" articles into one card.
    const best = valid[0]!;
    const primaryEntity = best.matchedEntities[0]?.toLowerCase()
      || best.trend.entityTags[0]?.toLowerCase()
      || best.trend.topicTags[0]?.toLowerCase()
      || "general";
    // Use topicId + entity for a more specific key (max 8 cards per topic)
    const keyword = primaryEntity;
    const groupKey = `${article.topicId}:${keyword}`;

    if (!trendGroups.has(groupKey)) {
      trendGroups.set(groupKey, {
        keyword: primaryEntity,
        topicId: article.topicId,
        trend: best.trend,
        matchScore: best.matchScore,
        articles: [],
        platforms: new Set(),
        regions: new Set(),
        discussionCount: 0,
      });
    }

    const group = trendGroups.get(groupKey)!;
    group.articles.push({ ...article, matchScore: best.matchScore });
    for (const p of best.matchedPlatforms) group.platforms.add(p);
    if (best.region) group.regions.add(best.region);
    group.discussionCount += best.trend.engagementScore;
    // Update best match score
    if (best.matchScore > group.matchScore) group.matchScore = best.matchScore;
  }

  // ── Build TrendFeedCard[] from groups ────────────────────────

  const trendCards: TrendFeedCard[] = [];

  for (const [_groupKey, group] of trendGroups) {
    const kw = group.keyword; // the actual entity keyword, not the composite groupKey

    // Sort articles by recency + match score
    const sorted = group.articles.sort((a, b) => {
      const scoreA = a.matchScore + (a.pubDate ? (Date.now() - new Date(a.pubDate).getTime()) / -3_600_000 : 0) / 100;
      const scoreB = b.matchScore + (b.pubDate ? (Date.now() - new Date(b.pubDate).getTime()) / -3_600_000 : 0) / 100;
      return scoreB - scoreA;
    });

    // Momentum score: combination of match score + engagement + recency
    const latestPub = sorted[0]?.pubDate ? new Date(sorted[0].pubDate).getTime() : 0;
    const ageHours = latestPub ? (Date.now() - latestPub) / 3_600_000 : 24;
    const recencyBonus = Math.max(0, 30 - ageHours * 2); // fresh content bonus
    const rawScore = group.matchScore * 60 + Math.min(20, group.articles.length * 4) + recencyBonus;
    const momentumScore = Math.min(100, Math.round(rawScore));
    const momentumLabel = scoreToLabel(momentumScore);

    const platforms = Array.from(group.platforms);
    const regions = group.regions.size > 0 ? Array.from(group.regions) : ["Global"];

    const trendTitle = humanizeKeyword(kw);
    const trendHook = pickHook(momentumLabel, kw);

    // Build whyTrending text
    const whyParts: string[] = [];
    if (platforms.length > 0) {
      whyParts.push(`Trending on ${platforms.slice(0, 2).join(" + ")}`);
    }
    if (group.trend.topicTags[0]) {
      whyParts.push(group.trend.topicTags[0].charAt(0).toUpperCase() + group.trend.topicTags[0].slice(1) + " in focus");
    }

    const momentum: TrendMomentum = {
      label: momentumLabel,
      score: momentumScore,
      platforms,
      regions,
      discussionCount: Math.round(group.discussionCount),
      whyTrending: whyParts.join(" · "),
    };

    const personalScore = personalizeScore(
      kw,
      group.topicId,
      interests,
      watchlist,
      entityMap,
      momentumScore,
    );

    const supportingArticles: SupportingArticle[] = sorted
      .slice(0, MAX_ARTICLES_PER_CARD)
      .map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source ?? null,
        pubDate: a.pubDate ?? null,
        description: a.description ?? null,
        imageUrl: a.imageUrl ?? null,
        sourceTier: getSourceTier(a.source),
      }));

    trendCards.push({
      id: `trend-${kw}-${group.topicId}-${Date.now()}`,
      type: "trend",
      trendTitle,
      trendHook,
      trendKeyword: kw,
      momentum,
      topicId: group.topicId,
      personalScore,
      articles: supportingArticles,
      articleCount: sorted.length,
    });
  }

  // ── Deduplicate by keyword (merge same keyword across topics) ─
  // Keep the card with the highest personalScore; merge articles from duplicates
  const deduped = new Map<string, TrendFeedCard>();
  for (const card of trendCards) {
    const key = card.trendKeyword.toLowerCase();
    const existing = deduped.get(key);
    if (!existing || card.personalScore > existing.personalScore) {
      // Merge supporting articles from previous entry if any
      const mergedArticles = existing
        ? [...card.articles, ...existing.articles]
            .filter((a, i, arr) => arr.findIndex((b) => b.url === a.url) === i)
            .slice(0, MAX_ARTICLES_PER_CARD)
        : card.articles;
      deduped.set(key, { ...card, articles: mergedArticles, articleCount: mergedArticles.length });
    } else {
      // Merge articles from lower-score duplicate into existing
      const merged = [...existing.articles, ...card.articles]
        .filter((a, i, arr) => arr.findIndex((b) => b.url === a.url) === i)
        .slice(0, MAX_ARTICLES_PER_CARD);
      deduped.set(key, { ...existing, articles: merged, articleCount: merged.length });
    }
  }
  const dedupedCards = Array.from(deduped.values());

  // ── Personalized sort ─────────────────────────────────────────
  // Sort by personal score (interest match + momentum), descending

  dedupedCards.sort((a, b) => b.personalScore - a.personalScore);
  const trendCardsFinal = dedupedCards;

  // ── Ungrouped articles as article-type cards ─────────────────

  const articleCards: TrendFeedCard[] = ungroupedArticles
    .slice(0, 10)
    .map((a) => {
      const ageHours = a.pubDate ? (Date.now() - new Date(a.pubDate).getTime()) / 3_600_000 : 24;
      const recencyScore = Math.max(0, 40 - ageHours * 2);
      const score = Math.round(recencyScore + (interests.length > 0 ? 15 : 5));
      const label = scoreToLabel(score);

      return {
        id: `article-${a.url.slice(-20)}-${Date.now()}`,
        type: "article" as const,
        trendTitle: a.title,
        trendHook: a.description?.slice(0, 120) ?? "",
        trendKeyword: a.topicId,
        momentum: {
          label,
          score,
          platforms: [],
          regions: [],
          discussionCount: 0,
          whyTrending: "",
        },
        topicId: a.topicId,
        personalScore: score,
        articles: [{
          title: a.title,
          url: a.url,
          source: a.source ?? null,
          pubDate: a.pubDate ?? null,
          description: a.description ?? null,
          imageUrl: a.imageUrl ?? null,
          sourceTier: getSourceTier(a.source),
        }],
        articleCount: 1,
      };
    });

  // ── Discovery injection ───────────────────────────────────────
  // Build discovery cards and inject every DISCOVERY_INTERVAL positions.

  const discoveryInjections = buildDiscoveryInjections(interests, activeTrends, 6);

  const discoveryCards: TrendFeedCard[] = discoveryInjections
    .filter((d) => d.weight >= 0.5)
    .map((d) => ({
      id: `discovery-${d.entity}-${Date.now()}`,
      type: "discovery" as const,
      trendTitle: humanizeKeyword(d.entity),
      trendHook: d.reason,
      trendKeyword: d.entity,
      momentum: {
        label: d.trendItems.length >= 3 ? "exploding" :
               d.trendItems.length >= 1 ? "rising" : "stable",
        score: Math.round(d.weight * 80),
        platforms: [...new Set(d.trendItems.map((t) => t.source))].slice(0, 3),
        regions: [],
        discussionCount: d.trendItems.reduce((s, t) => s + t.engagementScore, 0),
        whyTrending: d.reason,
      },
      topicId: "discovery",
      personalScore: Math.round(d.weight * 70),
      articles: d.trendItems.slice(0, 3).map((t) => ({
        title: t.title,
        url: t.url ?? "",
        source: t.source,
        pubDate: t.publishedAt,
        description: t.summary ?? null,
        imageUrl: null,
        sourceTier: "B",
      })),
      articleCount: d.trendItems.length,
      discoveryEntity: d.entity,
      discoveryReason: d.reason,
      adjacentTo: [d.sourceEntity],
    }));

  // ── Merge: interleave trend + discovery + article cards ───────

  const merged: TrendFeedCard[] = [];
  let discoveryIdx = 0;
  const allMain = [...trendCardsFinal, ...articleCards].slice(0, MAX_TOTAL_CARDS);

  for (let i = 0; i < allMain.length; i++) {
    merged.push(allMain[i]!);
    // Inject discovery every DISCOVERY_INTERVAL cards
    if (
      (i + 1) % DISCOVERY_INTERVAL === 0 &&
      discoveryIdx < discoveryCards.length
    ) {
      merged.push(discoveryCards[discoveryIdx++]!);
    }
  }

  // Always inject at least 1 discovery card (after position 2 if never triggered)
  if (discoveryIdx === 0 && discoveryCards.length > 0 && merged.length >= 2) {
    merged.splice(Math.min(3, merged.length), 0, discoveryCards[0]!);
    discoveryIdx = 1;
  }

  // Append remaining discovery cards at end (up to 2 more)
  while (discoveryIdx < Math.min(discoveryCards.length, discoveryIdx + 2)) {
    merged.push(discoveryCards[discoveryIdx++]!);
  }

  const processingTimeMs = Date.now() - startMs;

  const stats: AssemblerStats = {
    totalArticles: rawArticles.length,
    activeTrends: activeTrends.length,
    trendCards: trendCards.length,
    articleCards: articleCards.length,
    discoveryCards: discoveryCards.length,
    totalCards: merged.length,
    processingTimeMs,
  };

  logger.info(stats, "[FeedAssembler] Feed assembled");

  return { cards: merged, stats };
}

export interface AssemblerStats {
  totalArticles: number;
  activeTrends: number;
  trendCards: number;
  articleCards: number;
  discoveryCards: number;
  totalCards: number;
  processingTimeMs: number;
}

// ============================================================
// REDDIT SOCIAL ADAPTER — Sprint 29 Upgrade
//
// Fetches trending posts from Reddit via public JSON API.
// No API key required for public subreddit data.
//
// Sprint 29 additions:
//   • Keyword velocity tracking (which keywords are accelerating)
//   • Subreddit acceleration detection (cross-sub trending)
//   • Cross-subreddit signal detection (same story in 2+ subs)
//   • getMomentumKeywords() — returns keywords sorted by velocity
//   • getCrossSubredditTrends() — stories appearing in 2+ subs
// ============================================================

import type { RawSignal } from "../trendAggregation/trendNormalizer.js";

// ── Subreddit registry ────────────────────────────────────────

const TRENDING_SUBREDDITS = [
  "r/worldnews",
  "r/technology",
  "r/artificial",
  "r/MachineLearning",
  "r/CryptoCurrency",
  "r/stocks",
  "r/economics",
  "r/gaming",
  "r/startups",
];

const INTEREST_SUBREDDITS: Record<string, string[]> = {
  ai:         ["r/artificial", "r/MachineLearning", "r/ChatGPT", "r/LocalLLaMA"],
  technology: ["r/technology", "r/programming", "r/webdev", "r/tech"],
  crypto:     ["r/CryptoCurrency", "r/Bitcoin", "r/ethereum", "r/defi"],
  stocks:     ["r/stocks", "r/investing", "r/wallstreetbets", "r/SecurityAnalysis"],
  economy:    ["r/economics", "r/economy", "r/finance"],
  gaming:     ["r/gaming", "r/pcgaming", "r/Steam"],
  startups:   ["r/startups", "r/entrepreneur", "r/SideProject"],
  politics:   ["r/worldnews", "r/politics", "r/geopolitics"],
};

// ── In-memory keyword velocity store ─────────────────────────
// Tracks keyword frequency over time windows.
// Time window: last 15 min vs previous 15 min.

interface KeywordBucket {
  count: number;
  subreddits: Set<string>;
  lastSeenAt: number;
}

const RECENT_WINDOW_MS = 15 * 60 * 1000;   // 15 min
const VELOCITY_WINDOW_MS = 30 * 60 * 1000; // 30 min (for comparison)

// keyword → bucket for recent window
const recentKeywords = new Map<string, KeywordBucket>();
// keyword → count in previous window (for velocity calc)
const prevWindowKeywords = new Map<string, number>();
let lastWindowReset = Date.now();

function rotateWindowIfNeeded(): void {
  const now = Date.now();
  if (now - lastWindowReset >= RECENT_WINDOW_MS) {
    for (const [kw, bucket] of recentKeywords) {
      prevWindowKeywords.set(kw, (prevWindowKeywords.get(kw) ?? 0) + bucket.count);
    }
    recentKeywords.clear();
    lastWindowReset = now;
  }
}

function recordKeywords(words: string[], subreddit: string): void {
  rotateWindowIfNeeded();
  for (const word of words) {
    const existing = recentKeywords.get(word) ?? {
      count: 0,
      subreddits: new Set<string>(),
      lastSeenAt: Date.now(),
    };
    existing.count++;
    existing.subreddits.add(subreddit);
    existing.lastSeenAt = Date.now();
    recentKeywords.set(word, existing);
  }
}

// ── Momentum keyword ──────────────────────────────────────────

export interface MomentumKeyword {
  keyword: string;
  recentCount: number;
  prevCount: number;
  velocity: number;        // recentCount / max(prevCount,1)
  subreddits: string[];
  isAccelerating: boolean; // velocity > 1.5
  isCrossSubreddit: boolean; // mentioned in 2+ subreddits
}

export function getMomentumKeywords(topN = 20): MomentumKeyword[] {
  const results: MomentumKeyword[] = [];

  for (const [keyword, bucket] of recentKeywords) {
    const prevCount = prevWindowKeywords.get(keyword) ?? 0;
    const velocity = bucket.count / Math.max(prevCount, 1);
    results.push({
      keyword,
      recentCount: bucket.count,
      prevCount,
      velocity,
      subreddits: Array.from(bucket.subreddits),
      isAccelerating: velocity > 1.5,
      isCrossSubreddit: bucket.subreddits.size >= 2,
    });
  }

  return results
    .sort((a, b) => b.velocity * b.recentCount - a.velocity * a.recentCount)
    .slice(0, topN);
}

// ── Cross-subreddit detection ─────────────────────────────────

export interface CrossSubredditTrend {
  keyword: string;
  subreddits: string[];
  totalScore: number;
  velocity: number;
}

export function getCrossSubredditTrends(minSubreddits = 2): CrossSubredditTrend[] {
  const momentum = getMomentumKeywords(50);
  return momentum
    .filter((kw) => kw.subreddits.length >= minSubreddits)
    .map((kw) => ({
      keyword: kw.keyword,
      subreddits: kw.subreddits,
      totalScore: kw.recentCount,
      velocity: kw.velocity,
    }));
}

// ── Types ─────────────────────────────────────────────────────

interface RedditPost {
  title: string;
  url: string;
  selftext?: string;
  created_utc: number;
  subreddit_name_prefixed: string;
  score: number;
  num_comments: number;
  permalink: string;
}

// ── Keyword tokenizer ─────────────────────────────────────────

const REDDIT_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "has", "have", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "not", "no", "nor", "so",
  "yet", "both", "either", "neither", "such", "than", "rather", "as",
  "this", "that", "these", "those", "its", "it", "he", "she", "they",
  "we", "you", "my", "your", "his", "her", "our", "their",
]);

function tokenizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !REDDIT_STOPWORDS.has(w));
}

// ── Fetcher ───────────────────────────────────────────────────

async function fetchSubredditHot(subreddit: string, limit = 10): Promise<RawSignal[]> {
  const cleanSub = subreddit.replace(/^r\//, "");
  const url = `https://www.reddit.com/r/${cleanSub}/hot.json?limit=${limit}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "INFOX-TrendBot/1.0" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return [];

    const json = await response.json() as { data?: { children?: Array<{ data: RedditPost }> } };
    const posts = json.data?.children ?? [];

    return posts.map((child) => {
      const post = child.data;
      const keywords = tokenizeTitle(post.title);

      // Record keywords for velocity tracking
      recordKeywords(keywords, post.subreddit_name_prefixed);

      return {
        title: post.title,
        url: `https://reddit.com${post.permalink}`,
        description: post.selftext?.slice(0, 300) ?? null,
        publishedAt: new Date(post.created_utc * 1000).toISOString(),
        source: post.subreddit_name_prefixed,
        platform: "reddit" as const,
        engagementScore: post.score + post.num_comments * 2,
        commentCount: post.num_comments,
        tags: keywords.slice(0, 5),
      };
    });
  } catch {
    return [];
  }
}

// ── Subreddit selector ────────────────────────────────────────

function selectSubreddits(interests: string[]): string[] {
  if (interests.length === 0) return TRENDING_SUBREDDITS.slice(0, 5);

  const selected: string[] = [];
  for (const interest of interests) {
    const subs = INTEREST_SUBREDDITS[interest.toLowerCase()] ?? [];
    selected.push(...subs.slice(0, 2));
  }

  return [...new Set(selected)].slice(0, 7);
}

// ── Main adapter export ───────────────────────────────────────

export const redditSocialAdapter = {
  name: "Reddit",
  platform: "reddit" as const,
  isEnabled: true,

  async fetchTrending(interests: string[] = [], limit = 30): Promise<RawSignal[]> {
    const targetSubs = selectSubreddits(interests);
    const perSub = Math.ceil(limit / targetSubs.length);

    const results = await Promise.allSettled(
      targetSubs.map((sub) => fetchSubredditHot(sub, perSub)),
    );

    const signals: RawSignal[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") signals.push(...result.value);
    }

    // Sort by engagement score (score + comment velocity)
    signals.sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0));

    return signals.slice(0, limit);
  },

  getMomentumKeywords,
  getCrossSubredditTrends,
};

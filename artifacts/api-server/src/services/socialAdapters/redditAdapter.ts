// ============================================================
// REDDIT SOCIAL ADAPTER
// Sprint 28 — Real Trend Connectors
//
// Fetches trending posts from Reddit via public RSS/JSON API.
// No API key required for public subreddit data.
// ============================================================

import type { RawSignal } from "../trendAggregation/trendNormalizer.js";

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

// ── Public Reddit JSON API (no key needed) ────────────────────

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
      return {
        title: post.title,
        url: `https://reddit.com${post.permalink}`,
        description: post.selftext?.slice(0, 300) ?? null,
        publishedAt: new Date(post.created_utc * 1000).toISOString(),
        source: post.subreddit_name_prefixed,
        platform: "reddit" as const,
        engagementScore: post.score,
        commentCount: post.num_comments,
      };
    });
  } catch {
    return [];
  }
}

// ── Main adapter export ───────────────────────────────────────

export const redditSocialAdapter = {
  name: "Reddit",
  platform: "reddit" as const,
  isEnabled: true,

  async fetchTrending(interests: string[] = [], limit = 30): Promise<RawSignal[]> {
    // Pick relevant subreddits based on interests
    const targetSubs = selectSubreddits(interests);
    const results = await Promise.allSettled(
      targetSubs.map((sub) => fetchSubredditHot(sub, Math.ceil(limit / targetSubs.length))),
    );

    const signals: RawSignal[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") signals.push(...result.value);
    }

    return signals.slice(0, limit);
  },
};

function selectSubreddits(interests: string[]): string[] {
  const interestMap: Record<string, string[]> = {
    ai:         ["r/artificial", "r/MachineLearning", "r/ChatGPT"],
    technology: ["r/technology", "r/programming", "r/webdev"],
    crypto:     ["r/CryptoCurrency", "r/Bitcoin", "r/ethereum"],
    stocks:     ["r/stocks", "r/investing", "r/wallstreetbets"],
    economy:    ["r/economics", "r/economy"],
    gaming:     ["r/gaming", "r/pcgaming"],
    startups:   ["r/startups", "r/entrepreneur"],
    politics:   ["r/worldnews", "r/politics"],
  };

  if (interests.length === 0) return TRENDING_SUBREDDITS.slice(0, 4);

  const selected: string[] = [];
  for (const interest of interests) {
    const subs = interestMap[interest.toLowerCase()] ?? [];
    selected.push(...subs.slice(0, 2));
  }

  return [...new Set(selected)].slice(0, 6);
}

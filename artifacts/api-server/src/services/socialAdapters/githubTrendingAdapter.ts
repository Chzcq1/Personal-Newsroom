// ============================================================
// GITHUB TRENDING ADAPTER
// Sprint 28 — Real Trend Connectors
//
// Fetches trending repositories from GitHub Explore.
// Uses the unofficial trending endpoint (no API key needed).
// ============================================================

import type { RawSignal } from "../trendAggregation/trendNormalizer.js";

interface GithubRepo {
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  starsToday: number;
  forks: number;
}

// ── GitHub Trending via RSS ───────────────────────────────────

async function fetchGithubTrendingRss(language = "", since = "daily"): Promise<RawSignal[]> {
  // GitHub trending page (HTML parse not ideal, use the Atom feed workaround)
  // Using a well-known community API proxy for GitHub trending
  const url = language
    ? `https://github-trending-api.waningflow.com/repositories?language=${language}&since=${since}`
    : `https://github-trending-api.waningflow.com/repositories?since=${since}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return await fetchGithubFallback();

    const repos = await response.json() as GithubRepo[];
    return repos.slice(0, 25).map((repo) => ({
      title: `${repo.name} — ${repo.description?.slice(0, 80) ?? "Trending on GitHub"}`,
      url: repo.url,
      description: repo.description ?? null,
      publishedAt: new Date().toISOString(),
      source: "GitHub Trending",
      platform: "github" as const,
      engagementScore: repo.stars,
      commentCount: 0,
      tags: repo.language ? [repo.language.toLowerCase(), "github", "open-source"] : ["github", "open-source"],
    }));
  } catch {
    return fetchGithubFallback();
  }
}

async function fetchGithubFallback(): Promise<RawSignal[]> {
  // Fallback: GitHub's trending Atom feed
  try {
    const response = await fetch("https://github.com/trending.atom", {
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return [];
    // Parse atom feed minimally
    const text = await response.text();
    const entries = text.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];
    return entries.slice(0, 10).map((entry) => {
      const title = entry.match(/<title>(.*?)<\/title>/)?.[1] ?? "GitHub Trending";
      const link = entry.match(/href="([^"]+)"/)?.[1] ?? "https://github.com/trending";
      return {
        title,
        url: link,
        description: null,
        publishedAt: new Date().toISOString(),
        source: "GitHub Trending",
        platform: "github" as const,
        engagementScore: 100,
        tags: ["github", "open-source", "technology"],
      };
    });
  } catch {
    return [];
  }
}

// ── Main adapter export ───────────────────────────────────────

export const githubTrendingAdapter = {
  name: "GitHub Trending",
  platform: "github" as const,
  isEnabled: true,

  async fetchTrending(interests: string[] = [], limit = 20): Promise<RawSignal[]> {
    // Map tech interests to language filter
    const langMap: Record<string, string> = {
      ai: "python",
      technology: "",
      startups: "",
      crypto: "rust",
    };

    const hasTechInterest = interests.some((i) =>
      ["ai", "technology", "startups", "crypto"].includes(i.toLowerCase()),
    );

    if (!hasTechInterest) return [];

    const lang = interests
      .map((i) => langMap[i.toLowerCase()])
      .find((l) => l) ?? "";

    const results = await fetchGithubTrendingRss(lang);
    return results.slice(0, limit);
  },
};

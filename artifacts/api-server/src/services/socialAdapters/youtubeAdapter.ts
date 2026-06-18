// ============================================================
// YOUTUBE ADAPTER
// Sprint 28 — Architecture-Ready Connector
//
// ARCHITECTURE-READY: YouTube Data API v3 key needed.
// Set YOUTUBE_API_KEY in Replit Secrets to activate.
//
// Interface is fully defined. When API key is present,
// this fetches trending videos as real trend signals.
// ============================================================

import type { RawSignal } from "../trendAggregation/trendNormalizer.js";

const API_KEY = process.env["YOUTUBE_API_KEY"];

export const youtubeAdapter = {
  name: "YouTube",
  platform: "youtube" as const,
  isEnabled: !!API_KEY,

  async fetchTrending(interests: string[] = [], limit = 20): Promise<RawSignal[]> {
    if (!API_KEY) {
      // ARCHITECTURE-READY: return empty, not fake data
      return [];
    }

    const categoryMap: Record<string, string> = {
      technology: "28",
      gaming: "20",
      stocks: "25",
      crypto: "25",
      ai: "28",
    };

    const categoryId = interests
      .map((i) => categoryMap[i.toLowerCase()])
      .find((c) => c) ?? "25";

    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "snippet,statistics");
      url.searchParams.set("chart", "mostPopular");
      url.searchParams.set("videoCategoryId", categoryId);
      url.searchParams.set("maxResults", String(limit));
      url.searchParams.set("key", API_KEY);

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return [];

      const data = await response.json() as {
        items?: Array<{
          snippet: { title: string; description: string; channelTitle: string; publishedAt: string };
          statistics: { viewCount: string; likeCount: string; commentCount: string };
          id: string;
        }>;
      };

      return (data.items ?? []).map((item) => ({
        title: item.snippet.title,
        url: `https://youtube.com/watch?v=${item.id}`,
        description: item.snippet.description?.slice(0, 300) ?? null,
        publishedAt: item.snippet.publishedAt,
        source: item.snippet.channelTitle,
        platform: "youtube" as const,
        engagementScore: parseInt(item.statistics.viewCount ?? "0", 10),
        commentCount: parseInt(item.statistics.commentCount ?? "0", 10),
      }));
    } catch {
      return [];
    }
  },
};

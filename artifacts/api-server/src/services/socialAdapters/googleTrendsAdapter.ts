// ============================================================
// GOOGLE TRENDS ADAPTER
// Sprint 28 — Real Trend Connector
//
// Fetches real-time trending searches from Google Trends RSS.
// No API key required — uses public RSS feed.
// ============================================================

import type { RawSignal } from "../trendAggregation/trendNormalizer.js";

// Google Trends daily trending searches (RSS, no key needed)
const TRENDS_RSS_URLS: Record<string, string> = {
  TH: "https://trends.google.com/trending/rss?geo=TH",
  US: "https://trends.google.com/trending/rss?geo=US",
  GLOBAL: "https://trends.google.com/trending/rss?geo=",
};

interface ParsedTrend {
  title: string;
  trafficVolume: string;
  pubDate: string;
  link: string;
  newsItem?: { title: string; url: string; source: string };
}

function parseGoogleTrendsRss(xml: string): ParsedTrend[] {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  return items.map((item) => {
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      ?? item.match(/<title>(.*?)<\/title>/)?.[1]
      ?? "";
    const traffic = item.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] ?? "0";
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? new Date().toUTCString();
    const link = item.match(/<link>(.*?)<\/link>/)?.[1]
      ?? item.match(/<ht:news_item_url>(.*?)<\/ht:news_item_url>/)?.[1]
      ?? "";
    const newsTitle = item.match(/<ht:news_item_title>(.*?)<\/ht:news_item_title>/)?.[1];
    const newsUrl = item.match(/<ht:news_item_url>(.*?)<\/ht:news_item_url>/)?.[1];
    const newsSource = item.match(/<ht:news_item_source>(.*?)<\/ht:news_item_source>/)?.[1];

    return {
      title,
      trafficVolume: traffic,
      pubDate,
      link,
      newsItem: newsTitle && newsUrl && newsSource
        ? { title: newsTitle, url: newsUrl, source: newsSource }
        : undefined,
    };
  });
}

function parseTrafficToNumber(traffic: string): number {
  const cleaned = traffic.replace(/[^0-9KMB.]/gi, "");
  if (cleaned.endsWith("M") || cleaned.endsWith("m")) {
    return parseFloat(cleaned) * 1_000_000;
  }
  if (cleaned.endsWith("K") || cleaned.endsWith("k")) {
    return parseFloat(cleaned) * 1_000;
  }
  return parseInt(cleaned, 10) || 100;
}

// ── Fetcher ───────────────────────────────────────────────────

async function fetchGoogleTrends(geo = "US"): Promise<RawSignal[]> {
  const url = TRENDS_RSS_URLS[geo] ?? TRENDS_RSS_URLS.US;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "INFOX-TrendBot/1.0" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const trends = parseGoogleTrendsRss(xml);

    return trends.slice(0, 20).map((trend) => {
      const traffic = parseTrafficToNumber(trend.trafficVolume);

      return {
        title: trend.newsItem?.title ?? `Trending: ${trend.title}`,
        url: trend.newsItem?.url ?? trend.link ?? `https://trends.google.com/trends/explore?q=${encodeURIComponent(trend.title)}`,
        description: `"${trend.title}" — trending on Google (${trend.trafficVolume} searches)`,
        publishedAt: new Date(trend.pubDate).toISOString(),
        source: trend.newsItem?.source ?? "Google Trends",
        platform: "google-trends" as const,
        engagementScore: traffic,
        tags: ["trending", "google-trends"],
      };
    });
  } catch {
    return [];
  }
}

// ── Main adapter export ───────────────────────────────────────

export const googleTrendsAdapter = {
  name: "Google Trends",
  platform: "google-trends" as const,
  isEnabled: true,

  async fetchTrending(_interests: string[] = [], limit = 20): Promise<RawSignal[]> {
    // Fetch Thailand + US trends for Thai-language product
    const [thai, us] = await Promise.allSettled([
      fetchGoogleTrends("TH"),
      fetchGoogleTrends("US"),
    ]);

    const signals: RawSignal[] = [];
    if (thai.status === "fulfilled") signals.push(...thai.value);
    if (us.status === "fulfilled") signals.push(...us.value);

    return signals.slice(0, limit);
  },
};

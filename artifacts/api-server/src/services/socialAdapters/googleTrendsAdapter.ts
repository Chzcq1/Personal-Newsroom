// ============================================================
// GOOGLE TRENDS ADAPTER — Sprint 29 Upgrade
//
// Fetches real-time trending searches from Google Trends RSS.
// No API key required — uses public RSS feed.
//
// Sprint 29 additions:
//   • getDailyTrends(geo) — fetch top 20 daily trends for a region
//   • getRealtimeTrends(geo) — alias for daily (RSS is real-time)
//   • getTrendingSearchesByRegion(regions) — multi-region batch
//   • keyword extraction from trend titles
//   • regional momentum metadata per trend
// ============================================================

import type { RawSignal } from "../trendAggregation/trendNormalizer.js";

// ── Region registry ───────────────────────────────────────────

export type TrendsRegion = "TH" | "US" | "GB" | "SG" | "JP" | "GLOBAL";

const TRENDS_RSS_URLS: Record<string, string> = {
  TH:     "https://trends.google.com/trending/rss?geo=TH",
  US:     "https://trends.google.com/trending/rss?geo=US",
  GB:     "https://trends.google.com/trending/rss?geo=GB",
  SG:     "https://trends.google.com/trending/rss?geo=SG",
  JP:     "https://trends.google.com/trending/rss?geo=JP",
  GLOBAL: "https://trends.google.com/trending/rss?geo=",
};

const REGION_LABELS: Record<string, string> = {
  TH: "Thailand",
  US: "United States",
  GB: "United Kingdom",
  SG: "Singapore",
  JP: "Japan",
  GLOBAL: "Global",
};

// ── Types ─────────────────────────────────────────────────────

interface ParsedTrend {
  title: string;
  trafficVolume: string;
  pubDate: string;
  link: string;
  region: string;
  newsItem?: { title: string; url: string; source: string };
}

export interface DailyTrend {
  keyword: string;           // the trending search query
  trafficVolume: number;     // approximate search volume
  trafficLabel: string;      // human-readable "1M+" etc.
  region: string;            // e.g. "Thailand"
  regionCode: string;        // e.g. "TH"
  publishedAt: string;       // ISO timestamp
  newsItem?: { title: string; url: string; source: string };
  keywords: string[];        // extracted keywords from title
}

export interface RegionTrends {
  region: string;
  regionCode: string;
  trends: DailyTrend[];
  fetchedAt: string;
}

// ── Parsers ───────────────────────────────────────────────────

function parseGoogleTrendsRss(xml: string, regionCode: string): ParsedTrend[] {
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
      region: REGION_LABELS[regionCode] ?? regionCode,
      newsItem: newsTitle && newsUrl && newsSource
        ? { title: newsTitle, url: newsUrl, source: newsSource }
        : undefined,
    };
  });
}

function parseTrafficToNumber(traffic: string): number {
  const cleaned = traffic.replace(/[^0-9KMBkmb.]/g, "");
  const upper = cleaned.toUpperCase();
  if (upper.endsWith("M")) return parseFloat(cleaned) * 1_000_000;
  if (upper.endsWith("K")) return parseFloat(cleaned) * 1_000;
  if (upper.endsWith("B")) return parseFloat(cleaned) * 1_000_000_000;
  return parseInt(cleaned, 10) || 100;
}

function extractKeywords(title: string): string[] {
  const stopwords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "has", "have", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "not", "no", "nor", "so",
    "yet", "both", "either", "neither", "such", "than", "rather", "as",
  ]);
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopwords.has(w));
}

// ── Core fetcher ──────────────────────────────────────────────

async function fetchRegion(regionCode: string): Promise<ParsedTrend[]> {
  const url = TRENDS_RSS_URLS[regionCode] ?? TRENDS_RSS_URLS.US;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "INFOX-TrendBot/1.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return [];
    const xml = await response.text();
    return parseGoogleTrendsRss(xml, regionCode);
  } catch {
    return [];
  }
}

// ── Public API functions ──────────────────────────────────────

/**
 * Fetch the top daily trending searches for a single region.
 * Returns structured DailyTrend objects with metadata.
 */
export async function getDailyTrends(
  regionCode: TrendsRegion = "US",
  limit = 20,
): Promise<DailyTrend[]> {
  const parsed = await fetchRegion(regionCode);
  return parsed.slice(0, limit).map((trend) => ({
    keyword: trend.title,
    trafficVolume: parseTrafficToNumber(trend.trafficVolume),
    trafficLabel: trend.trafficVolume,
    region: REGION_LABELS[regionCode] ?? regionCode,
    regionCode,
    publishedAt: new Date(trend.pubDate).toISOString(),
    newsItem: trend.newsItem,
    keywords: extractKeywords(trend.title),
  }));
}

/**
 * Real-time trends — for Google Trends RSS, daily = real-time
 * (the feed is updated multiple times per day).
 */
export async function getRealtimeTrends(
  regionCode: TrendsRegion = "US",
  limit = 20,
): Promise<DailyTrend[]> {
  return getDailyTrends(regionCode, limit);
}

/**
 * Fetch trending searches across multiple regions in parallel.
 * Returns one RegionTrends object per region.
 */
export async function getTrendingSearchesByRegion(
  regions: TrendsRegion[] = ["TH", "US"],
  limit = 20,
): Promise<RegionTrends[]> {
  const results = await Promise.allSettled(
    regions.map(async (regionCode) => {
      const trends = await getDailyTrends(regionCode, limit);
      return {
        region: REGION_LABELS[regionCode] ?? regionCode,
        regionCode,
        trends,
        fetchedAt: new Date().toISOString(),
      } satisfies RegionTrends;
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<RegionTrends> => r.status === "fulfilled")
    .map((r) => r.value);
}

// ── Raw signal adapter (for trendNormalizer pipeline) ────────

async function fetchGoogleTrends(geo = "US"): Promise<RawSignal[]> {
  const parsed = await fetchRegion(geo);
  const region = REGION_LABELS[geo] ?? geo;

  return parsed.slice(0, 20).map((trend) => {
    const traffic = parseTrafficToNumber(trend.trafficVolume);
    const keywords = extractKeywords(trend.title);

    return {
      title: trend.newsItem?.title ?? `Trending: ${trend.title}`,
      url: trend.newsItem?.url ?? trend.link ?? `https://trends.google.com/trends/explore?q=${encodeURIComponent(trend.title)}`,
      description: `"${trend.title}" — trending on Google in ${region} (${trend.trafficVolume} searches)`,
      publishedAt: new Date(trend.pubDate).toISOString(),
      source: trend.newsItem?.source ?? "Google Trends",
      platform: "google-trends" as const,
      engagementScore: traffic,
      tags: ["trending", "google-trends", ...keywords.slice(0, 3)],
    };
  });
}

// ── Adapter export (for trendAggregation pipeline) ────────────

export const googleTrendsAdapter = {
  name: "Google Trends",
  platform: "google-trends" as const,
  isEnabled: true,

  async fetchTrending(_interests: string[] = [], limit = 20): Promise<RawSignal[]> {
    const [thai, us] = await Promise.allSettled([
      fetchGoogleTrends("TH"),
      fetchGoogleTrends("US"),
    ]);

    const signals: RawSignal[] = [];
    if (thai.status === "fulfilled") signals.push(...thai.value);
    if (us.status === "fulfilled") signals.push(...us.value);

    return signals.slice(0, limit);
  },

  getDailyTrends,
  getRealtimeTrends,
  getTrendingSearchesByRegion,
};

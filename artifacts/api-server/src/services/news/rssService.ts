// ============================================================
// RSS SERVICE — Fetch and parse a single RSS feed URL
//
// Returns a normalized Article array regardless of feed format.
// RSS parsing is done with rss-parser (handles RSS 1.0/2.0 + Atom).
// ============================================================

import Parser from "rss-parser";
import type { Article } from "../ai/aiProvider.js";
import { logger } from "../../lib/logger.js";

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; PersonalAINewsroom/1.0; +https://replit.com)",
    Accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  },
});

export interface RssArticle extends Article {
  source: string;
}

/**
 * Fetch and parse a single RSS feed URL.
 * Returns an empty array on any error so the caller can skip bad feeds.
 */
export async function fetchFeed(
  url: string,
  sourceName: string,
): Promise<RssArticle[]> {
  try {
    const feed = await parser.parseURL(url);

    return feed.items.slice(0, 8).map((item) => ({
      title: item.title?.trim() ?? "(ไม่มีหัวข้อ)",
      description: item.contentSnippet?.trim() || item.summary?.trim() || undefined,
      url: item.link ?? item.guid ?? url,
      pubDate: item.pubDate ?? item.isoDate ?? undefined,
      source: sourceName,
    }));
  } catch (err) {
    logger.warn({ url, err: String(err) }, "Failed to fetch RSS feed — skipping");
    return [];
  }
}

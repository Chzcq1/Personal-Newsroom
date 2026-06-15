// ============================================================
// RSS SERVICE — Fetch and parse a single RSS feed
//
// Returns a normalised RssArticle array and a FeedDiagnostic
// regardless of feed format. RSS parsing: rss-parser.
//
// Logging contract:
//   INFO  — successful fetch with article count and duration
//   WARN  — feed failure (continues, caller skips this feed)
// ============================================================

import Parser from "rss-parser";
import type { Article } from "../ai/aiProvider.js";
import { logger } from "../../lib/logger.js";

const parser = new Parser({
  timeout: 10000,
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

export interface FeedDiagnostic {
  name: string;
  url: string;
  status: "success" | "failed";
  articleCount: number;
  durationMs: number;
  error?: string;
}

export interface FeedResult {
  articles: RssArticle[];
  diagnostic: FeedDiagnostic;
}

/**
 * Fetch and parse a single RSS feed URL.
 * Always returns a FeedResult — articles is empty on error.
 * Caller decides what to do with failed feeds.
 *
 * @param url        - Full RSS feed URL
 * @param sourceName - Human-readable source name for attribution
 */
export async function fetchFeed(
  url: string,
  sourceName: string,
): Promise<FeedResult> {
  const startMs = Date.now();

  try {
    const feed = await parser.parseURL(url);
    const articles = feed.items.slice(0, 10).map((item) => ({
      title: item.title?.trim() ?? "(ไม่มีหัวข้อ)",
      description:
        item.contentSnippet?.trim() || item.summary?.trim() || undefined,
      url: item.link ?? item.guid ?? url,
      pubDate: item.pubDate ?? item.isoDate ?? undefined,
      source: sourceName,
    }));

    const durationMs = Date.now() - startMs;

    logger.info(
      {
        feed: sourceName,
        url,
        articles: articles.length,
        durationMs,
      },
      "RSS feed fetched",
    );

    return {
      articles,
      diagnostic: {
        name: sourceName,
        url,
        status: "success",
        articleCount: articles.length,
        durationMs,
      },
    };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.warn(
      {
        feed: sourceName,
        url,
        durationMs,
        error: errorMessage,
      },
      "RSS feed failed — skipping",
    );

    return {
      articles: [],
      diagnostic: {
        name: sourceName,
        url,
        status: "failed",
        articleCount: 0,
        durationMs,
        error: errorMessage,
      },
    };
  }
}

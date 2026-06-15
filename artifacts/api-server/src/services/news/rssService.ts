// ============================================================
// RSS SERVICE — Fetch and parse a single RSS feed
//
// Returns a normalised RssArticle array and a FeedDiagnostic
// regardless of feed format. RSS parsing: rss-parser.
//
// ── RETRY POLICY ─────────────────────────────────────────
// Each feed is retried up to 2 times on failure.
// Delays: 1s after first failure, 2s after second.
// All retries are transparent to callers.
//
// Logging contract:
//   INFO  — successful fetch (reports attempt count if > 1)
//   WARN  — feed failure after all retries exhausted
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
  attempts: number;
  error?: string;
}

export interface FeedResult {
  articles: RssArticle[];
  diagnostic: FeedDiagnostic;
}

const RETRY_DELAYS_MS = [1000, 2000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

/**
 * Fetch and parse a single RSS feed URL.
 * Retries up to 2 times on failure (total 3 attempts).
 * Always returns a FeedResult — articles is empty on final failure.
 */
export async function fetchFeed(
  url: string,
  sourceName: string,
): Promise<FeedResult> {
  const totalStartMs = Date.now();
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptStartMs = Date.now();

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

      const durationMs = Date.now() - totalStartMs;

      logger.info(
        {
          feed: sourceName,
          url,
          articles: articles.length,
          durationMs,
          attempts: attempt,
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
          attempts: attempt,
        },
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      const attemptDurationMs = Date.now() - attemptStartMs;

      if (attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAYS_MS[attempt - 1];
        logger.warn(
          {
            feed: sourceName,
            url,
            attempt,
            nextRetryMs: delay,
            durationMs: attemptDurationMs,
            error: lastError,
          },
          "RSS feed failed — retrying",
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  const durationMs = Date.now() - totalStartMs;

  logger.warn(
    {
      feed: sourceName,
      url,
      attempts: MAX_ATTEMPTS,
      durationMs,
      error: lastError,
    },
    "RSS feed failed after all retries — skipping",
  );

  return {
    articles: [],
    diagnostic: {
      name: sourceName,
      url,
      status: "failed",
      articleCount: 0,
      durationMs,
      attempts: MAX_ATTEMPTS,
      error: lastError,
    },
  };
}

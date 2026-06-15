import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { config } from "../config/env.js";
import { fetchFeed } from "../services/news/rssService.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ── Basic health check ────────────────────────────────────────
// Used by Replit infrastructure and simple uptime monitors.

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// ── Detailed health check ────────────────────────────────────
// Validates AI provider credentials and RSS feed connectivity.
// Used by the frontend health badge and developer diagnostics.

router.get("/health", async (_req, res) => {
  const startMs = Date.now();

  // ── AI provider check ──────────────────────────────────────
  // We only verify the credential is set, not that it's valid.
  // A full API call would be too slow for a health endpoint.
  let aiProviderWorking = false;
  let aiProviderName = config.aiProvider;
  let aiProviderDetail = "";

  if (config.aiProvider === "github") {
    aiProviderWorking = !!config.github.token;
    aiProviderDetail = aiProviderWorking ? "GITHUB_TOKEN set" : "GITHUB_TOKEN missing";
  } else if (config.aiProvider === "openai") {
    aiProviderWorking = !!config.openai.apiKey;
    aiProviderDetail = aiProviderWorking ? "OPENAI_API_KEY set" : "OPENAI_API_KEY missing";
  } else if (config.aiProvider === "gemini") {
    aiProviderWorking = !!config.gemini.apiKey;
    aiProviderDetail = aiProviderWorking ? "GEMINI_API_KEY set" : "GEMINI_API_KEY missing";
  }

  // ── RSS feed check ─────────────────────────────────────────
  // Quick test of one highly reliable feed (Ars Technica).
  // Timeout is implicit via the 10s rssService parser timeout.
  let rssFeedsWorking = false;
  let rssFeedDetail = "";

  try {
    const testResult = await Promise.race([
      fetchFeed("https://feeds.arstechnica.com/arstechnica/index", "Ars Technica"),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Health check RSS timeout (8s)")), 8000),
      ),
    ]);
    const result = testResult as Awaited<ReturnType<typeof fetchFeed>>;
    rssFeedsWorking = result.articles.length > 0;
    rssFeedDetail = rssFeedsWorking
      ? `OK — ${result.articles.length} articles in ${result.diagnostic.durationMs}ms`
      : "Feed returned 0 articles";
  } catch (err) {
    rssFeedsWorking = false;
    rssFeedDetail = err instanceof Error ? err.message : String(err);
  }

  // Storage is localStorage (frontend) — always true at server level
  const storageWorking = true;

  const status: "healthy" | "degraded" | "offline" =
    aiProviderWorking && rssFeedsWorking
      ? "healthy"
      : aiProviderWorking || rssFeedsWorking
      ? "degraded"
      : "offline";

  logger.info(
    { status, aiProviderWorking, rssFeedsWorking, durationMs: Date.now() - startMs },
    "Health check completed",
  );

  res.json({
    status,
    aiProviderWorking,
    aiProviderName,
    aiProviderDetail,
    rssFeedsWorking,
    rssFeedDetail,
    storageWorking,
    timestamp: new Date().toISOString(),
    checkDurationMs: Date.now() - startMs,
  });
});

export default router;

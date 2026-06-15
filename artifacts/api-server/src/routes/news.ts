// ============================================================
// NEWS ROUTE — POST /api/news/summarize
//
// Sprint 5 integration:
//   Task A — Briefing Cache: serve from cache when same topic + hour
//   Task B — Article Preprocessor: strip boilerplate, trim descriptions
//   Task C — Token Budget Controller: max 5 articles, 6000 tokens
//   Task D — Source Diversity: already in newsCollectorService
//   Task E — Interest Priority: accepts interests[] in request body
//   Task F — Trend Memory: passes yesterday context to AI prompt
//   Task G — Cost Analytics: records every request
//   Task H — Fallback Generator: lightweight briefing if AI fails
// ============================================================

import { Router } from "express";
import { getTopicById } from "../config/topics.js";
import { collectArticlesForTopic } from "../services/news/newsCollectorService.js";
import { summarizeArticles } from "../services/ai/summaryService.js";
import { preprocessArticles } from "../services/news/articlePreprocessor.js";
import { getCachedBriefing, cacheBriefing } from "../services/cache/briefingCache.js";
import { formatTrendContext, recordTrend } from "../services/news/trendMemory.js";
import { generateFallbackBriefing } from "../services/ai/fallbackGenerator.js";
import { recordRequest } from "../services/analytics/costAnalytics.js";
import { estimateTokens } from "../services/news/articlePreprocessor.js";
import { config } from "../config/env.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Error reason classification ────────────────────────────

function classifyFeedError(
  totalConfigured: number,
  failedFeeds: number,
  totalCollected: number,
): string {
  if (totalConfigured === 0) {
    return `ไม่มีแหล่งข่าวที่กำหนดค่าสำหรับหัวข้อนี้ กรุณาติดต่อผู้ดูแลระบบ`;
  }
  if (failedFeeds === totalConfigured) {
    return `แหล่งข่าวทั้งหมด ${totalConfigured} แหล่งไม่สามารถเชื่อมต่อได้ในขณะนี้ เครือข่ายอาจมีปัญหา กรุณาลองใหม่ในอีกสักครู่`;
  }
  if (totalCollected === 0 && failedFeeds > 0) {
    return `แหล่งข่าว ${failedFeeds} จาก ${totalConfigured} แหล่งไม่ตอบสนอง และไม่ได้รับบทความใดเลย กรุณาลองใหม่อีกครั้ง`;
  }
  return `ไม่พบบทความที่เหมาะสมหลังจากคัดกรองแล้ว (รวบรวมได้ ${totalCollected} บทความจาก ${totalConfigured - failedFeeds} แหล่ง) กรุณาลองใหม่อีกครั้ง`;
}

function classifyAIError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return `AI provider หมดเวลาตอบสนอง (timeout) กรุณาลองใหม่อีกครั้ง`;
  }
  if (lower.includes("rate limit") || lower.includes("429")) {
    return `AI provider ถึงขีดจำกัดคำขอ (rate limit) กรุณารอสักครู่แล้วลองใหม่`;
  }
  if (lower.includes("token") && (lower.includes("exceed") || lower.includes("limit"))) {
    return `บทความที่รวบรวมมีขนาดใหญ่เกินขีดจำกัด token ของ AI กรุณาลองใหม่อีกครั้ง`;
  }
  if (lower.includes("401") || lower.includes("authentication") || lower.includes("unauthorized")) {
    return `AI provider ปฏิเสธการยืนยันตัวตน กรุณาตรวจสอบ API key ของ ${config.aiProvider}`;
  }
  if (lower.includes("parse") || lower.includes("json") || lower.includes("unexpected token")) {
    return `เกิดข้อผิดพลาดในการประมวลผลผลลัพธ์จาก AI (parsing error) กรุณาลองใหม่อีกครั้ง`;
  }
  if (lower.includes("empty") || lower.includes("no content")) {
    return `AI provider ส่งคืนผลลัพธ์ว่างเปล่า กรุณาลองใหม่อีกครั้ง`;
  }
  return `AI provider (${config.aiProvider}) ตอบสนองผิดปกติ: ${msg.slice(0, 120)}`;
}

// ── Route ──────────────────────────────────────────────────

router.post("/news/summarize", async (req, res) => {
  const { topicId, interests = [] } = req.body as {
    topicId?: string;
    interests?: string[];
  };

  if (!topicId || typeof topicId !== "string") {
    res.status(400).json({ error: "topicId is required" });
    return;
  }

  const topic = getTopicById(topicId);
  if (!topic) {
    res.status(400).json({ error: `Unknown topicId: "${topicId}"` });
    return;
  }

  const startTime = Date.now();
  logger.info({ topicId, interests }, "Starting news summarization");

  try {
    // ── Task A: Check briefing cache ─────────────────────────
    const cached = getCachedBriefing(topicId);
    if (cached) {
      const generationTimeMs = Date.now() - startTime;
      recordRequest({
        timestamp: new Date().toISOString(),
        topicId,
        cacheHit: true,
        inputTokensEstimate: 0,
        outputTokensEstimate: estimateTokens(cached.briefing),
        generationTimeMs,
        articleCount: cached.articleCount,
        preprocessedArticles: cached.articleCount,
        provider: config.aiProvider,
        fallbackMode: false,
      });

      res.json({
        topic,
        summary: cached.briefing,
        failsafeMode: false,
        failsafeReason: undefined,
        sources: [],
        generatedAt: cached.generatedAt.toISOString(),
        generationTimeMs,
        provider: config.aiProvider,
        articleCount: cached.articleCount,
        cacheHit: true,
        debugInfo: [],
      });
      return;
    }

    // ── Collect articles (Task D + E integrated in collector) ─
    const {
      articles: rawArticles,
      feedDiagnostics,
      totalConfigured,
      totalCollected,
      failedFeeds,
    } = await collectArticlesForTopic(topicId, Array.isArray(interests) ? interests : []);

    if (rawArticles.length === 0) {
      const reason = classifyFeedError(totalConfigured, failedFeeds, totalCollected);
      logger.warn(
        { topicId, totalConfigured, failedFeeds, totalCollected },
        "No articles collected",
      );
      recordRequest({
        timestamp: new Date().toISOString(),
        topicId,
        cacheHit: false,
        inputTokensEstimate: 0,
        outputTokensEstimate: 0,
        generationTimeMs: Date.now() - startTime,
        articleCount: 0,
        preprocessedArticles: 0,
        provider: config.aiProvider,
        fallbackMode: false,
      });
      res.status(500).json({
        error: reason,
        debugInfo: feedDiagnostics,
      });
      return;
    }

    // ── Task B + C: Preprocess + token budget ────────────────
    const { articles, stats: preprocessStats } = preprocessArticles(rawArticles);

    // ── Task F: Get trend context ────────────────────────────
    const trendContext = formatTrendContext(topicId);

    // ── AI Summarization with fallback (Task H) ──────────────
    let summary: string;
    let fallbackMode = false;
    let fallbackReason: string | undefined;
    let isLightweightFallback = false;

    const inputText = articles.map((a) => `${a.title} ${a.description ?? ""}`).join(" ");
    const inputTokensEstimate = estimateTokens(inputText);

    try {
      summary = await summarizeArticles(articles, topic.labelTh, trendContext || undefined);
    } catch (aiErr) {
      fallbackReason = classifyAIError(aiErr);
      logger.warn(
        { topicId, err: String(aiErr) },
        "AI summarization failed — activating fallback generator",
      );

      // Task H: generate lightweight briefing without LLM
      const fallbackResult = generateFallbackBriefing(rawArticles, topic.labelTh);
      summary = fallbackResult.text;
      fallbackMode = true;
      isLightweightFallback = true;
    }

    const outputTokensEstimate = estimateTokens(summary);
    const generationTimeMs = Date.now() - startTime;

    // ── Task F: Record trend memory ──────────────────────────
    if (!fallbackMode) {
      const headlineMatch = summary.match(/HEADLINE\n([^\n]+)/);
      const briefingHeadline = headlineMatch ? headlineMatch[1].trim() : articles[0]?.title ?? "";
      recordTrend(topicId, articles.map((a) => a.title), briefingHeadline);
    }

    // ── Task A: Cache the briefing ───────────────────────────
    if (!fallbackMode) {
      cacheBriefing(topicId, summary, articles.length);
    }

    // ── Task G: Record analytics ─────────────────────────────
    recordRequest({
      timestamp: new Date().toISOString(),
      topicId,
      cacheHit: false,
      inputTokensEstimate,
      outputTokensEstimate,
      generationTimeMs,
      articleCount: rawArticles.length,
      preprocessedArticles: articles.length,
      provider: config.aiProvider,
      fallbackMode,
    });

    const sources = rawArticles.map((a) => ({
      title: a.title,
      url: a.url,
      description: a.description ?? null,
      pubDate: a.pubDate ?? null,
      source: a.source ?? null,
    }));

    res.json({
      topic,
      summary,
      failsafeMode: fallbackMode,
      failsafeReason: fallbackReason,
      isLightweightFallback,
      sources,
      generatedAt: new Date().toISOString(),
      generationTimeMs,
      provider: config.aiProvider,
      articleCount: articles.length,
      cacheHit: false,
      preprocessStats,
      trendContextUsed: !!trendContext,
      debugInfo: feedDiagnostics,
    });
  } catch (err) {
    logger.error({ err, topicId }, "Unexpected error during summarization");
    const reason = classifyAIError(err);
    res.status(500).json({ error: reason });
  }
});

export default router;

import { Router } from "express";
import { getTopicById } from "../config/topics.js";
import { collectArticlesForTopic } from "../services/news/newsCollectorService.js";
import { summarizeArticles } from "../services/ai/summaryService.js";
import { config } from "../config/env.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Error reason classification ────────────────────────────
//
// Returns a specific Thai error message based on what went wrong.
// "Unable to generate briefing" is never shown — always a real reason.

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
  const { topicId } = req.body as { topicId?: string };

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
  logger.info({ topicId }, "Starting news summarization");

  try {
    const { articles, feedDiagnostics, totalConfigured, totalCollected, failedFeeds } =
      await collectArticlesForTopic(topicId);

    if (articles.length === 0) {
      const reason = classifyFeedError(totalConfigured, failedFeeds, totalCollected);
      logger.warn(
        { topicId, totalConfigured, failedFeeds, totalCollected },
        "No articles collected",
      );
      res.status(500).json({
        error: reason,
        debugInfo: feedDiagnostics,
      });
      return;
    }

    let summary: string;
    try {
      summary = await summarizeArticles(articles, topic.labelTh);
    } catch (aiErr) {
      const reason = classifyAIError(aiErr);
      logger.error({ topicId, err: aiErr }, "AI summarization failed");
      res.status(500).json({
        error: reason,
        debugInfo: feedDiagnostics,
      });
      return;
    }

    const generationTimeMs = Date.now() - startTime;

    res.json({
      topic,
      summary,
      sources: articles.map((a) => ({
        title: a.title,
        url: a.url,
        description: a.description ?? null,
        pubDate: a.pubDate ?? null,
        source: a.source ?? null,
      })),
      generatedAt: new Date().toISOString(),
      generationTimeMs,
      provider: config.aiProvider,
      articleCount: articles.length,
      debugInfo: feedDiagnostics,
    });
  } catch (err) {
    logger.error({ err, topicId }, "Unexpected error during summarization");
    const reason = classifyAIError(err);
    res.status(500).json({ error: reason });
  }
});

export default router;

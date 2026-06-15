import { Router } from "express";
import { getTopicById } from "../config/topics.js";
import { collectArticlesForTopic } from "../services/news/newsCollectorService.js";
import { summarizeArticles } from "../services/ai/summaryService.js";
import { config } from "../config/env.js";
import { logger } from "../lib/logger.js";

const router = Router();

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
    const articles = await collectArticlesForTopic(topicId);

    if (articles.length === 0) {
      res.status(500).json({
        error: "ไม่สามารถดึงข้อมูลข่าวได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
      });
      return;
    }

    const summary = await summarizeArticles(articles, topic.labelTh);
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
    });
  } catch (err) {
    logger.error({ err, topicId }, "Failed to summarize news");
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการสรุปข่าว กรุณาลองใหม่อีกครั้ง" });
  }
});

export default router;

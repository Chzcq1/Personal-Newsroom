// ============================================================
// FALLBACK GENERATOR — Sprint 5 Task H
//
// Generates a lightweight briefing WITHOUT calling an LLM.
// Activated when AI is unavailable (timeout, rate limit, auth failure).
//
// Output format:
//   HEADLINE      — best article title
//   TOP STORIES   — numbered list of article titles + sources
//   KEY FACTS     — extracted sentences from descriptions
//
// Users always receive something useful, even during AI outages.
// ============================================================

import type { RssArticle } from "../news/rssService.js";
import { logger } from "../../lib/logger.js";

export interface FallbackBriefing {
  text: string;
  isLightweight: true;
  articleCount: number;
}

/**
 * Generate a structured briefing without using an LLM.
 * Selects the most informative content from article metadata.
 */
export function generateFallbackBriefing(
  articles: RssArticle[],
  topicLabel: string,
): FallbackBriefing {
  if (articles.length === 0) {
    return {
      text: `ไม่พบบทความสำหรับหัวข้อ "${topicLabel}" ในขณะนี้`,
      isLightweight: true,
      articleCount: 0,
    };
  }

  logger.info(
    { topicLabel, articleCount: articles.length },
    "Generating fallback briefing (no AI)",
  );

  const lines: string[] = [];

  // HEADLINE — use the best article's title
  const headline = articles[0].title;
  lines.push("HEADLINE");
  lines.push(headline);
  lines.push("");

  // TOP STORIES — list all articles with source + date
  lines.push("TOP STORIES");
  articles.slice(0, 5).forEach((article, i) => {
    const source = article.source ? ` (${article.source})` : "";
    const date = article.pubDate
      ? ` — ${new Date(article.pubDate).toLocaleDateString("th-TH", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "";
    lines.push(`${i + 1}. ${article.title}${source}${date}`);
  });
  lines.push("");

  // KEY FACTS — extract first meaningful sentence from each description
  const facts: string[] = [];
  for (const article of articles.slice(0, 5)) {
    if (!article.description) continue;
    const cleaned = article.description
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    const firstSentence = cleaned.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 30) {
      facts.push(firstSentence);
    }
  }

  if (facts.length > 0) {
    lines.push("KEY FACTS");
    facts.slice(0, 5).forEach((fact, i) => {
      lines.push(`${i + 1}. ${fact}.`);
    });
    lines.push("");
  }

  // Footer note (Thai)
  lines.push(
    `[โหมดสำรอง: ระบบ AI ไม่พร้อมใช้งานชั่วคราว แสดงบทความดิบ ${articles.length} รายการ]`,
  );

  return {
    text: lines.join("\n"),
    isLightweight: true,
    articleCount: articles.length,
  };
}

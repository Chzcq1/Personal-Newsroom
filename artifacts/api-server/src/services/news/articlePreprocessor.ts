// ============================================================
// ARTICLE PREPROCESSOR — Sprint 5 Tasks B + C
//
// Task B — Preprocessing layer before AI call:
//   - Strip HTML tags from descriptions
//   - Remove boilerplate patterns (read more, subscribe, etc.)
//   - Trim descriptions to MAX_DESC_LENGTH characters
//   - Log before/after token estimates
//
// Task C — Token Budget Controller:
//   - Maximum articles:   MAX_ARTICLES (5)
//   - Maximum article length: MAX_ARTICLE_LENGTH (1000 chars total per article)
//   - Maximum total prompt: MAX_PROMPT_CHARS (≈ 6000 tokens × 4 chars/token)
//   - Drop lowest-ranked articles if budget exceeded
//
// Target: 60–80% payload reduction vs raw RSS content.
// ============================================================

import { logger } from "../../lib/logger.js";
import type { RssArticle } from "./rssService.js";

export const MAX_ARTICLES = 5;
export const MAX_ARTICLE_LENGTH = 1000;
export const MAX_PROMPT_CHARS = 24_000; // 6000 tokens × ~4 chars/token

// ── Boilerplate patterns to strip ────────────────────────────

const BOILERPLATE_RES = [
  /<[^>]+>/g,
  /read (more|full( story)?)|click here|continue reading|see (also|more)|subscribe( now)?|sign up|free trial/gi,
  /\[read more.*?\]/gi,
  /\[.*?\]/g,
  /https?:\/\/\S+/g,
  /&amp;/g, /&lt;/g, /&gt;/g, /&quot;/g, /&#\d+;/g, /&[a-z]+;/g,
];

function stripBoilerplate(text: string): string {
  let result = text;
  for (const re of BOILERPLATE_RES) {
    result = result.replace(re, " ");
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

// ── Token estimation ─────────────────────────────────────────
// Rough estimate: 1 token ≈ 4 characters (English/mixed text).
// Thai characters are typically 1-2 tokens each, but article content
// is predominantly English, so this estimate is conservative.

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Preprocessor stats ───────────────────────────────────────

export interface PreprocessorStats {
  inputArticles: number;
  outputArticles: number;
  inputChars: number;
  outputChars: number;
  inputTokensEstimate: number;
  outputTokensEstimate: number;
  reductionPercent: number;
}

// ── Main export ──────────────────────────────────────────────

/**
 * Preprocess articles for AI consumption.
 *
 * Steps:
 * 1. Clean each article's description (strip HTML, boilerplate)
 * 2. Truncate each article to MAX_ARTICLE_LENGTH characters
 * 3. Enforce MAX_ARTICLES cap (articles must already be ranked; best first)
 * 4. Enforce MAX_PROMPT_CHARS budget across the full batch
 *
 * @param articles  Articles sorted best-first (rank already applied)
 * @returns         Cleaned articles + processing stats
 */
export function preprocessArticles(articles: RssArticle[]): {
  articles: RssArticle[];
  stats: PreprocessorStats;
} {
  const inputChars = articles.reduce(
    (sum, a) => sum + (a.title?.length ?? 0) + (a.description?.length ?? 0),
    0,
  );
  const inputArticles = articles.length;

  // Step 1: clean descriptions + truncate each article
  const cleaned = articles.map((article): RssArticle => {
    const cleanedDesc = article.description
      ? stripBoilerplate(article.description)
      : undefined;

    const fullText = [article.title, cleanedDesc].filter(Boolean).join(" — ");
    const truncatedDesc =
      cleanedDesc && fullText.length > MAX_ARTICLE_LENGTH
        ? cleanedDesc.slice(0, MAX_ARTICLE_LENGTH - (article.title?.length ?? 0) - 3) + "..."
        : cleanedDesc;

    return { ...article, description: truncatedDesc };
  });

  // Step 2: enforce MAX_ARTICLES cap (keep best-ranked)
  const capped = cleaned.slice(0, MAX_ARTICLES);

  // Step 3: enforce total prompt budget
  let totalChars = 0;
  const budgeted: RssArticle[] = [];
  for (const article of capped) {
    const articleChars =
      (article.title?.length ?? 0) + (article.description?.length ?? 0) + 50; // overhead
    if (totalChars + articleChars > MAX_PROMPT_CHARS) {
      logger.warn(
        { dropped: capped.length - budgeted.length },
        "Token budget exceeded — dropping lowest-ranked articles",
      );
      break;
    }
    totalChars += articleChars;
    budgeted.push(article);
  }

  const outputChars = budgeted.reduce(
    (sum, a) => sum + (a.title?.length ?? 0) + (a.description?.length ?? 0),
    0,
  );

  const stats: PreprocessorStats = {
    inputArticles,
    outputArticles: budgeted.length,
    inputChars,
    outputChars,
    inputTokensEstimate: estimateTokens(String(inputChars)),
    outputTokensEstimate: estimateTokens(String(outputChars)),
    reductionPercent:
      inputChars > 0
        ? Math.round(((inputChars - outputChars) / inputChars) * 100)
        : 0,
  };

  logger.info(
    {
      inputArticles: stats.inputArticles,
      outputArticles: stats.outputArticles,
      inputChars: stats.inputChars,
      outputChars: stats.outputChars,
      reductionPercent: stats.reductionPercent,
    },
    "Article preprocessing complete",
  );

  return { articles: budgeted, stats };
}

// ============================================================
// ARTICLE COMPRESSION V2 — Sprint 12 Task C
//
// Smarter preprocessing that extracts only high-information
// content from articles before passing to the AI layer.
//
// Strategy:
//   1. Score each sentence for information density
//   2. Keep sentences with numbers, quotes, proper nouns, actions
//   3. Strip boilerplate, navigation, legal text
//   4. Budget paragraphs by priority category
//   5. Return compressed article with provenance metadata
//
// Goal: reduce token usage while IMPROVING briefing quality
// by sending denser, higher-signal content to the AI.
// ============================================================

import { logger } from "../../lib/logger.js";

// ── Compression targets ───────────────────────────────────────

export const CV2_MAX_CHARS_PER_ARTICLE = 600;   // down from 1000 in V1
export const CV2_MAX_CHARS_TOTAL = 18_000;      // down from 24_000 → ~25% token reduction
const MIN_SENTENCE_CHARS = 20;

// ── High-value sentence signals ──────────────────────────────

const NUMBER_RE = /\b\d[\d,.%$€£¥]*\b|\b(billion|million|trillion|percent|bps)\b/i;
const QUOTE_RE = /[""][^""]{10,}[""]|said|announced|confirmed|warned|stated|reported/i;
const ACTION_RE = /\b(launch|acqui|invest|partner|ban|regulat|sanction|approv|reject|cut|raise|collapse|surge|plunge|crisis|deal|merger|IPO|layoff)\w*/i;
const CONSEQUENCE_RE = /\b(result|impact|effect|affect|lead|cause|due to|because|therefore|as a result|following|amid)\b/i;
const ENTITY_RE = /\b[A-Z][a-z]+ (?:[A-Z][a-z]+ )?(?:Corp|Inc|Ltd|Group|Bank|Fund|Tech|AI|CEO|CTO|CFO|Fed|SEC|EU|US|UK|IMF|WHO)\b/;

// ── Boilerplate removal ───────────────────────────────────────

const BOILERPLATE_RES: RegExp[] = [
  /<[^>]+>/g,
  /https?:\/\/\S+/g,
  /read (more|full( story)?)|click here|continue reading|see (also|more)/gi,
  /subscribe( now)?|sign up|free trial|newsletter|log in|register/gi,
  /copyright|all rights reserved|terms of (use|service)|privacy policy/gi,
  /\[read more.*?\]/gi,
  /\[.*?\]/g,
  /&(?:amp|lt|gt|quot|#\d+|[a-z]+);/g,
  /follow us on|share this|tweet|facebook/gi,
  /advertisement|sponsored|partner content/gi,
];

function stripBoilerplate(text: string): string {
  let result = text;
  for (const re of BOILERPLATE_RES) {
    result = result.replace(re, " ");
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

// ── Sentence scoring ──────────────────────────────────────────

interface SentenceScore {
  text: string;
  score: number;
  category: "number" | "quote" | "action" | "consequence" | "entity" | "general";
}

function scoreSentence(sentence: string): SentenceScore {
  const s = sentence.trim();
  if (s.length < MIN_SENTENCE_CHARS) return { text: s, score: 0, category: "general" };

  let score = 10; // base
  let category: SentenceScore["category"] = "general";

  if (NUMBER_RE.test(s)) {
    score += 30;
    category = "number";
  }
  if (QUOTE_RE.test(s)) {
    score += 25;
    category = "quote";
  }
  if (ACTION_RE.test(s)) {
    score += 20;
    category = "action";
  }
  if (CONSEQUENCE_RE.test(s)) {
    score += 15;
    category = "consequence";
  }
  if (ENTITY_RE.test(s)) {
    score += 10;
    category = category === "general" ? "entity" : category;
  }

  // Penalize very long sentences (likely padded prose)
  if (s.length > 200) score -= 10;
  // Bonus for concise, punchy sentences
  if (s.length < 100) score += 5;

  return { text: s, score, category };
}

// ── Core compression ──────────────────────────────────────────

export interface CompressionResult {
  compressed: string;
  originalChars: number;
  compressedChars: number;
  reductionPercent: number;
  topCategories: string[];
}

export function compressArticleContent(rawDescription: string | undefined | null): CompressionResult {
  const original = rawDescription ?? "";
  const cleaned = stripBoilerplate(original);

  if (cleaned.length <= CV2_MAX_CHARS_PER_ARTICLE) {
    return {
      compressed: cleaned,
      originalChars: original.length,
      compressedChars: cleaned.length,
      reductionPercent: 0,
      topCategories: ["general"],
    };
  }

  // Split into sentences
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(scoreSentence)
    .filter((s) => s.score > 0 && s.text.length >= MIN_SENTENCE_CHARS);

  // Sort by score descending, preserve order of top N
  const ranked = [...sentences].sort((a, b) => b.score - a.score);

  // Budget: select top sentences up to char limit
  const selected = new Set<number>();
  let budget = CV2_MAX_CHARS_PER_ARTICLE;

  for (const ranked_s of ranked) {
    const idx = sentences.indexOf(ranked_s);
    if (selected.has(idx)) continue;
    if (ranked_s.text.length <= budget) {
      selected.add(idx);
      budget -= ranked_s.text.length;
    }
    if (budget <= 0) break;
  }

  // Reconstruct in original order
  const compressed = sentences
    .filter((_, i) => selected.has(i))
    .map((s) => s.text)
    .join(" ");

  const topCategories = [...new Set(
    ranked.slice(0, 3).map((s) => s.category)
  )];

  const reductionPercent = original.length > 0
    ? Math.round(((original.length - compressed.length) / original.length) * 100)
    : 0;

  return {
    compressed,
    originalChars: original.length,
    compressedChars: compressed.length,
    reductionPercent,
    topCategories,
  };
}

// ── Batch article compression ─────────────────────────────────

export interface ArticleCompressionV2Stats {
  inputArticles: number;
  outputArticles: number;
  inputChars: number;
  outputChars: number;
  tokenReductionPercent: number;
  avgCompressionPerArticle: number;
}

export interface CompressedArticle<T extends { description?: string | null; title?: string }> {
  article: T;
  compressionResult: CompressionResult;
}

export function compressArticleBatch<T extends { description?: string | null; title?: string }>(
  articles: T[],
  maxTotalChars = CV2_MAX_CHARS_TOTAL,
): { articles: T[]; stats: ArticleCompressionV2Stats } {
  const inputChars = articles.reduce(
    (sum, a) => sum + (a.title?.length ?? 0) + (a.description?.length ?? 0),
    0,
  );

  // Compress each article description
  const compressed: CompressedArticle<T>[] = articles.map((a) => ({
    article: {
      ...a,
      description: compressArticleContent(a.description).compressed,
    },
    compressionResult: compressArticleContent(a.description),
  }));

  // Enforce total budget across batch
  let totalChars = 0;
  const budgeted: T[] = [];

  for (const { article } of compressed) {
    const articleChars = (article.title?.length ?? 0) + (article.description?.length ?? 0) + 30;
    if (totalChars + articleChars > maxTotalChars) {
      logger.warn(
        { dropped: compressed.length - budgeted.length },
        "[CompressionV2] Total budget exceeded — dropping remaining articles",
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

  const avgCompressionPerArticle = articles.length > 0
    ? Math.round(
        compressed.reduce((sum, c) => sum + c.compressionResult.reductionPercent, 0) /
        articles.length
      )
    : 0;

  const stats: ArticleCompressionV2Stats = {
    inputArticles: articles.length,
    outputArticles: budgeted.length,
    inputChars,
    outputChars,
    tokenReductionPercent: inputChars > 0
      ? Math.round(((inputChars - outputChars) / inputChars) * 100)
      : 0,
    avgCompressionPerArticle,
  };

  logger.info(
    {
      inputArticles: stats.inputArticles,
      outputArticles: stats.outputArticles,
      inputChars: stats.inputChars,
      outputChars: stats.outputChars,
      tokenReductionPercent: stats.tokenReductionPercent,
      avgCompressionPerArticle: stats.avgCompressionPerArticle,
    },
    "[CompressionV2] Batch compression complete",
  );

  return { articles: budgeted, stats };
}

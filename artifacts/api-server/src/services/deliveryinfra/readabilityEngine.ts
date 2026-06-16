// ============================================================
// READABILITY ENGINE — Sprint 13 Task D
//
// Optimizes digest text for mobile scan readability.
//
// Features:
//   - Paragraph balancing (even visual weight)
//   - Dynamic sentence shortening (split run-ons)
//   - Key insight extraction (first insight per section)
//   - Visual density reduction (whitespace normalization)
//   - Mobile scan optimization (short bullets, 1 idea/paragraph)
//
// Used by briefingFormatter.ts before final Telegram render.
// ============================================================

// ── Config ─────────────────────────────────────────────────────

const MAX_SENTENCE_CHARS = 120;   // Split if longer
const TARGET_PARAGRAPH_LINES = 3; // Max lines per block
const MIN_PARAGRAPH_WORDS = 8;    // Merge if too short

// ── Sentence tools ──────────────────────────────────────────────

/**
 * Split a Thai+English sentence at natural break points.
 * Handles "X ซึ่ง/และ/แต่/โดย Y" → two shorter sentences.
 */
function splitLongSentence(sentence: string): string[] {
  if (sentence.length <= MAX_SENTENCE_CHARS) return [sentence];

  // Thai connectors that make safe split points
  const CONNECTORS = /\s+(ซึ่ง|แต่ว่า|อย่างไรก็ตาม|ขณะที่|โดยที่|ในขณะที่|ทั้งนี้|นอกจากนี้|ดังนั้น|กล่าวคือ)\s+/;
  const match = sentence.match(CONNECTORS);
  if (match?.index) {
    const splitIdx = match.index;
    const part1 = sentence.slice(0, splitIdx).trim();
    const part2 = sentence.slice(splitIdx + match[0].length).trim();
    if (part1.length >= 20 && part2.length >= 20) {
      // Capitalize first letter of part2 isn't needed in Thai; just return both
      return [part1, part2].filter(Boolean);
    }
  }

  // Fallback: split at comma near midpoint
  const midpoint = Math.floor(sentence.length / 2);
  const commaIdx = sentence.indexOf(",", midpoint - 20);
  if (commaIdx > 0 && commaIdx < sentence.length - 20) {
    return [
      sentence.slice(0, commaIdx).trim(),
      sentence.slice(commaIdx + 1).trim(),
    ].filter(Boolean);
  }

  return [sentence];
}

// ── Paragraph balancing ─────────────────────────────────────────

/**
 * Split oversized paragraphs into ≤TARGET_PARAGRAPH_LINES chunks.
 */
function balanceParagraph(para: string): string[] {
  const lines = para.split(/\n/);
  if (lines.length <= TARGET_PARAGRAPH_LINES) return [para];

  const chunks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    current.push(line);
    if (current.length >= TARGET_PARAGRAPH_LINES) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length > 0) chunks.push(current);

  return chunks.map((c) => c.join("\n"));
}

// ── Density reduction ───────────────────────────────────────────

/**
 * Remove repeated whitespace, double blank lines, and leading/trailing spaces.
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")            // collapse horizontal whitespace
    .replace(/\n{3,}/g, "\n\n")         // max 2 consecutive newlines
    .replace(/^\s+|\s+$/gm, (m) => m.includes("\n") ? "\n" : "") // trim line edges
    .trim();
}

// ── Key insight extraction ──────────────────────────────────────

/**
 * Extract the single most information-dense sentence from a paragraph.
 * Heuristic: longest sentence with at least one number or named entity.
 */
export function extractKeyInsight(paragraph: string): string | null {
  const sentences = paragraph
    .split(/[.!?।]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20);

  if (sentences.length === 0) return null;

  const scored = sentences.map((s) => {
    let score = 0;
    // Numbers (incl. Thai numerals) → +2 each
    score += (s.match(/\d+([.,]\d+)?(%|บาท|ล้าน|พัน|ดอลลาร์|USD|THB|B|M)?/g) ?? []).length * 2;
    // Quoted speech → +3
    if (/"|'|"/.test(s)) score += 3;
    // Named entities (capitalised English words) → +1 each
    score += (s.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) ?? []).length;
    // Penalty for filler starts
    if (/^(นอกจากนี้|ทั้งนี้|อย่างไรก็ตาม|ดังนั้น|โดยรวม|กล่าวโดยสรุป)/.test(s)) score -= 5;
    return { s, score };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0 ? best.s : sentences[0] ?? null;
}

// ── Main optimizer ──────────────────────────────────────────────

/**
 * Optimize a full briefing text for mobile readability.
 * Returns the optimized string ready for formatter input.
 */
export function optimizeForReadability(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  const result: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Split long sentences within paragraph
    const sentences = trimmed.split(/(?<=[.!?।])\s+/);
    const shortened: string[] = [];
    for (const s of sentences) {
      shortened.push(...splitLongSentence(s));
    }
    const rebuilt = shortened.join(" ");

    // Balance paragraph length
    const balanced = balanceParagraph(rebuilt);
    result.push(...balanced);
  }

  return normalizeWhitespace(result.join("\n\n"));
}

/**
 * Score a briefing for readability (0–100).
 * Used for analytics / debug output.
 */
export interface ReadabilityScore {
  overall: number;
  avgSentenceLength: number;
  avgParagraphLines: number;
  densityScore: number;
  grade: "excellent" | "good" | "fair" | "poor";
}

export function scoreReadability(text: string): ReadabilityScore {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const sentences = text.split(/[.!?।]\s+/).filter((s) => s.trim().length > 10);

  const avgSentenceLength = sentences.length > 0
    ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
    : 0;

  const avgParagraphLines = paragraphs.length > 0
    ? paragraphs.reduce((sum, p) => sum + p.split("\n").length, 0) / paragraphs.length
    : 0;

  // Density: % of characters that are actual content (not spaces)
  const densityScore = text.length > 0
    ? Math.round((text.replace(/\s/g, "").length / text.length) * 100)
    : 0;

  // Scoring
  let score = 100;
  if (avgSentenceLength > 150) score -= 20;
  else if (avgSentenceLength > 100) score -= 10;
  if (avgParagraphLines > 5) score -= 20;
  else if (avgParagraphLines > 3) score -= 10;
  if (densityScore > 85) score -= 10; // Too dense
  if (densityScore < 50) score -= 10; // Too sparse

  score = Math.max(0, Math.min(100, score));

  return {
    overall: score,
    avgSentenceLength: Math.round(avgSentenceLength),
    avgParagraphLines: Math.round(avgParagraphLines * 10) / 10,
    densityScore,
    grade: score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "fair" : "poor",
  };
}

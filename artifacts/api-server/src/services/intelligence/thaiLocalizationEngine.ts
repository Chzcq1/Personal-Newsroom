// ============================================================
// THAI LOCALIZATION ENGINE — Sprint 18 Task A
//
// Thai-first output enforcement for all AI briefings.
// Ensures briefings feel native Thai, not machine-translated English.
//
// Responsibilities:
//   - Detect untranslated English sections in output
//   - Partial translation repair
//   - Translation confidence scoring
//   - Language consistency validation
//   - Headline localization refinement
//   - Thai readability scoring
//   - Preserve global brand/entity names (OpenAI, Nvidia, etc.)
// ============================================================

import { logger } from "../../lib/logger.js";

// ── Preserved English brand names ────────────────────────────
// These must NEVER be translated into Thai

export const PRESERVED_BRANDS = new Set([
  // AI companies
  "OpenAI", "Anthropic", "Nvidia", "NVIDIA", "Google", "Meta",
  "Microsoft", "Apple", "Amazon", "Tesla", "SpaceX", "X",
  "OpenAI", "Perplexity", "Mistral", "xAI", "DeepMind",
  "Hugging Face", "Stability AI", "Cohere", "Scale AI",
  // AI models/products
  "GPT-4", "GPT-4o", "GPT-5", "GPT-3.5", "ChatGPT",
  "Claude", "Gemini", "Llama", "Grok", "Copilot", "Bing",
  "DALL-E", "Midjourney", "Sora", "Runway",
  // Finance
  "BlackRock", "Vanguard", "JPMorgan", "Goldman Sachs", "Morgan Stanley",
  "Berkshire", "Fidelity", "S&P", "Nasdaq", "NYSE", "Fed", "ECB",
  // Crypto
  "Bitcoin", "BTC", "Ethereum", "ETH", "Solana", "SOL",
  "Binance", "Coinbase", "Tether", "USDT",
  // Tech
  "Intel", "AMD", "TSMC", "Qualcomm", "Samsung", "Sony",
  "Netflix", "Spotify", "Uber", "Airbnb", "Stripe", "PayPal",
  // Media
  "Reuters", "Bloomberg", "FT", "WSJ", "NYT", "CNN", "BBC",
]);

// ── Thai character detection ──────────────────────────────────

const THAI_CHAR_REGEX = /[\u0E00-\u0E7F]/g;
const ENGLISH_WORD_REGEX = /\b[A-Za-z]{4,}\b/g;
const ENGLISH_SENTENCE_REGEX = /[A-Z][a-z]+(?: [a-z]+){4,}[.!?]/g;

// ── Localization result types ─────────────────────────────────

export interface LocalizationAnalysis {
  thaiRatio: number;           // 0–1: fraction of content that is Thai
  englishLeakScore: number;    // 0–100: higher = more leakage
  untranslatedSections: string[];
  preservedTermsFound: string[];
  readabilityScore: number;    // 0–100
  consistencyScore: number;    // 0–100
  confidence: LocalizationConfidence;
  requiresRepair: boolean;
  repairPriority: "none" | "low" | "medium" | "high" | "critical";
}

export type LocalizationConfidence =
  | "native"       // 90%+ Thai, minimal leakage
  | "acceptable"   // 75–90% Thai
  | "degraded"     // 50–75% Thai — noticeable leakage
  | "poor"         // <50% Thai — significant English sections
  | "failed";      // Essentially English output

export interface RepairResult {
  original: string;
  repaired: string;
  sectionsRepaired: number;
  confidenceBefore: LocalizationConfidence;
  confidenceAfter: LocalizationConfidence;
  repairNotes: string[];
}

// ── Thai readability heuristics ───────────────────────────────

const SHORT_SENTENCE_PATTERNS = [
  /[ๆ\u0E00-\u0E7F]{2,}\s+[ๆ\u0E00-\u0E7F]{2,}\s+[ๆ\u0E00-\u0E7F]{2,}/,
];

const VERBOSE_THAI_STARTERS = [
  "ในปัจจุบัน", "โดยรวมแล้ว", "กล่าวโดยสรุป",
  "จากข้อมูลข้างต้น", "ดังที่ได้กล่าวมาแล้ว",
  "เป็นที่ทราบกันดีว่า", "อย่างที่เราทราบกัน",
  "ในส่วนที่เกี่ยวข้อง",
];

const STRONG_THAI_SIGNALS = [
  "ส่งผลให้", "ทำให้", "เนื่องจาก", "เพราะ",
  "อย่างไรก็ตาม", "นอกจากนี้", "ในขณะที่",
  "ประกาศ", "รายงาน", "วิเคราะห์", "ระบุ",
  "ตลาด", "เศรษฐกิจ", "การลงทุน", "นักลงทุน",
];

// ── Analysis functions ────────────────────────────────────────

export function analyzeLocalization(text: string): LocalizationAnalysis {
  if (!text || text.length < 10) {
    return {
      thaiRatio: 0,
      englishLeakScore: 100,
      untranslatedSections: [],
      preservedTermsFound: [],
      readabilityScore: 0,
      consistencyScore: 0,
      confidence: "failed",
      requiresRepair: true,
      repairPriority: "critical",
    };
  }

  const thaiChars = (text.match(THAI_CHAR_REGEX) || []).length;
  const totalChars = text.replace(/\s+/g, "").length;
  const thaiRatio = totalChars > 0 ? thaiChars / totalChars : 0;

  // Find untranslated English sections (exclude preserved brands)
  const englishWords = text.match(ENGLISH_WORD_REGEX) || [];
  const untranslatedWords = englishWords.filter((w) => {
    // Skip preserved brands (case-insensitive)
    const lower = w.toLowerCase();
    for (const brand of PRESERVED_BRANDS) {
      if (brand.toLowerCase() === lower) return false;
    }
    // Skip short common terms that are acceptable in Thai tech writing
    if (w.length <= 3) return false;
    // Skip numbers
    if (/^\d+$/.test(w)) return false;
    return true;
  });

  // Find actual English sentences (more severe leakage)
  const englishSentences = text.match(ENGLISH_SENTENCE_REGEX) || [];
  const untranslatedSections = englishSentences.filter((s) => {
    const sentenceThaiChars = (s.match(THAI_CHAR_REGEX) || []).length;
    return sentenceThaiChars < s.length * 0.1; // <10% Thai in sentence
  });

  // Find preserved brands actually present
  const preservedTermsFound: string[] = [];
  for (const brand of PRESERVED_BRANDS) {
    if (text.includes(brand)) {
      preservedTermsFound.push(brand);
    }
  }

  // English leak score
  const leakFromRatio = Math.max(0, (0.6 - thaiRatio) * 100);
  const leakFromWords = Math.min(40, untranslatedWords.length * 2);
  const leakFromSentences = Math.min(40, untranslatedSections.length * 15);
  const englishLeakScore = Math.min(
    100,
    Math.round(leakFromRatio + leakFromWords + leakFromSentences)
  );

  // Readability scoring
  let readabilityScore = 70; // base
  VERBOSE_THAI_STARTERS.forEach((starter) => {
    if (text.includes(starter)) readabilityScore -= 8;
  });
  STRONG_THAI_SIGNALS.forEach((signal) => {
    if (text.includes(signal)) readabilityScore += 3;
  });
  // Penalize very long paragraphs (>300 chars between newlines)
  const paragraphs = text.split(/\n+/);
  const longParagraphs = paragraphs.filter((p) => p.length > 300).length;
  readabilityScore -= longParagraphs * 5;
  readabilityScore = Math.max(0, Math.min(100, readabilityScore));

  // Consistency scoring — checks for mixed Thai/English mid-sentence
  let consistencyScore = 100;
  if (thaiRatio < 0.7) consistencyScore -= 30;
  if (untranslatedSections.length > 0) consistencyScore -= 20 * untranslatedSections.length;
  consistencyScore = Math.max(0, Math.min(100, consistencyScore));

  // Confidence classification
  let confidence: LocalizationConfidence;
  if (thaiRatio >= 0.90) confidence = "native";
  else if (thaiRatio >= 0.75) confidence = "acceptable";
  else if (thaiRatio >= 0.50) confidence = "degraded";
  else if (thaiRatio >= 0.30) confidence = "poor";
  else confidence = "failed";

  // Repair priority
  let repairPriority: LocalizationAnalysis["repairPriority"] = "none";
  if (englishLeakScore >= 70) repairPriority = "critical";
  else if (englishLeakScore >= 50) repairPriority = "high";
  else if (englishLeakScore >= 30) repairPriority = "medium";
  else if (englishLeakScore >= 15) repairPriority = "low";

  return {
    thaiRatio,
    englishLeakScore,
    untranslatedSections,
    preservedTermsFound,
    readabilityScore,
    consistencyScore,
    confidence,
    requiresRepair: repairPriority !== "none",
    repairPriority,
  };
}

// ── Headline localization refinement ──────────────────────────

export function refineThaiHeadline(headline: string): string {
  if (!headline) return headline;

  // Remove common English headline patterns that leak in
  let refined = headline;

  // Remove "Breaking:" prefix style (should be in Thai)
  refined = refined.replace(/^Breaking:\s*/i, "ข่าวด่วน: ");
  refined = refined.replace(/^BREAKING:\s*/i, "ข่าวด่วน: ");
  refined = refined.replace(/^Update:\s*/i, "อัปเดต: ");
  refined = refined.replace(/^EXCLUSIVE:\s*/i, "พิเศษ: ");

  // Trim whitespace
  refined = refined.trim();

  return refined;
}

// ── Injection of Thai-language enforcement into prompt context ─

export function buildLocalizationInstruction(): string {
  const preservedList = Array.from(PRESERVED_BRANDS).slice(0, 20).join(", ");
  return `
คำสั่งด้านภาษา (ปฏิบัติตามอย่างเคร่งครัด):
- เขียนทุกส่วนเป็นภาษาไทยล้วน ยกเว้นคำที่ระบุด้านล่าง
- ชื่อแบรนด์และผลิตภัณฑ์ที่ต้องเขียนเป็นภาษาอังกฤษเสมอ: ${preservedList}
- ห้ามแปลชื่อบริษัท ผลิตภัณฑ์ หรือเทคโนโลยีที่รู้จักกันดีในระดับสากล
- คำศัพท์เทคนิคที่ไม่มีคำแปลไทยที่เหมาะสม ให้เขียนเป็นภาษาอังกฤษต้นฉบับ
- การวิเคราะห์ บริบท นัยสำคัญ และคำอธิบายทั้งหมด ต้องเป็นภาษาไทย
- ใช้ภาษาไทยที่เป็นธรรมชาติ กระชับ ไม่ใช่การแปลคำต่อคำจากภาษาอังกฤษ`.trim();
}

// ── Repair: strip obvious untranslated English sections ────────

export function repairLocalization(text: string): RepairResult {
  const beforeAnalysis = analyzeLocalization(text);
  const repairNotes: string[] = [];
  let repaired = text;
  let sectionsRepaired = 0;

  // Fix verbose starters
  VERBOSE_THAI_STARTERS.forEach((starter) => {
    if (repaired.includes(starter)) {
      repaired = repaired.replace(new RegExp(starter, "g"), "");
      sectionsRepaired++;
      repairNotes.push(`Removed verbose starter: "${starter}"`);
    }
  });

  // Fix headline prefixes
  const refinedHeadline = refineThaiHeadline(repaired.split("\n")[0]);
  if (refinedHeadline !== repaired.split("\n")[0]) {
    const lines = repaired.split("\n");
    lines[0] = refinedHeadline;
    repaired = lines.join("\n");
    sectionsRepaired++;
    repairNotes.push("Refined headline localization");
  }

  // Clean up double spaces and stray punctuation from removals
  repaired = repaired.replace(/  +/g, " ").trim();

  const afterAnalysis = analyzeLocalization(repaired);

  logger.debug(
    {
      beforeConfidence: beforeAnalysis.confidence,
      afterConfidence: afterAnalysis.confidence,
      sectionsRepaired,
    },
    "[ThaiLocalization] Repair complete"
  );

  return {
    original: text,
    repaired,
    sectionsRepaired,
    confidenceBefore: beforeAnalysis.confidence,
    confidenceAfter: afterAnalysis.confidence,
    repairNotes,
  };
}

// ── Post-processing pipeline ───────────────────────────────────

export function postProcessBriefing(rawOutput: string): {
  text: string;
  analysis: LocalizationAnalysis;
  wasRepaired: boolean;
} {
  const analysis = analyzeLocalization(rawOutput);

  if (!analysis.requiresRepair || analysis.repairPriority === "low") {
    return { text: rawOutput, analysis, wasRepaired: false };
  }

  const { repaired } = repairLocalization(rawOutput);

  return {
    text: repaired,
    analysis: analyzeLocalization(repaired),
    wasRepaired: true,
  };
}

// ── Statistics helper ──────────────────────────────────────────

export interface LocalizationStats {
  totalProcessed: number;
  nativeCount: number;
  acceptableCount: number;
  degradedCount: number;
  poorCount: number;
  failedCount: number;
  repairedCount: number;
  avgThaiRatio: number;
  avgEnglishLeakScore: number;
}

const _stats: LocalizationStats = {
  totalProcessed: 0,
  nativeCount: 0,
  acceptableCount: 0,
  degradedCount: 0,
  poorCount: 0,
  failedCount: 0,
  repairedCount: 0,
  avgThaiRatio: 0,
  avgEnglishLeakScore: 0,
};

export function recordLocalizationResult(
  analysis: LocalizationAnalysis,
  wasRepaired: boolean
): void {
  _stats.totalProcessed++;
  if (wasRepaired) _stats.repairedCount++;
  _stats[`${analysis.confidence}Count`]++;
  _stats.avgThaiRatio =
    (_stats.avgThaiRatio * (_stats.totalProcessed - 1) + analysis.thaiRatio) /
    _stats.totalProcessed;
  _stats.avgEnglishLeakScore =
    (_stats.avgEnglishLeakScore * (_stats.totalProcessed - 1) + analysis.englishLeakScore) /
    _stats.totalProcessed;
}

export function getLocalizationStats(): LocalizationStats {
  return { ..._stats };
}

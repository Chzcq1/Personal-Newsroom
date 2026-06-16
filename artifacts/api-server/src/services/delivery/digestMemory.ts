// ============================================================
// DAILY DIGEST MEMORY — Sprint 6 Task H
//
// Stores morning and evening briefings so the AI can understand
// story evolution across the day.
//
// Usage:
//   - After morning delivery: recordDigest("morning", text, topics)
//   - After evening delivery: recordDigest("evening", text, topics)
//   - In evening prompt:      formatDigestContext("evening") injects morning summary
//   - In next morning prompt: formatDigestContext("morning") injects yesterday evening
//
// Storage: in-memory ring buffer (max 4 entries = 2 days)
// ============================================================

import { logger } from "../../lib/logger.js";

export type DigestType = "morning" | "evening";

export interface DigestEntry {
  type: DigestType;
  briefingText: string;
  topicsUsed: string[];
  articleCount: number;
  generatedAt: string;
}

const MAX_ENTRIES = 4;
const digestHistory: DigestEntry[] = [];

export function recordDigest(
  type: DigestType,
  briefingText: string,
  topicsUsed: string[],
  articleCount: number,
): void {
  const entry: DigestEntry = {
    type,
    briefingText,
    topicsUsed,
    articleCount,
    generatedAt: new Date().toISOString(),
  };

  digestHistory.unshift(entry);
  if (digestHistory.length > MAX_ENTRIES) {
    digestHistory.pop();
  }

  logger.info(
    { type, articleCount, topicsUsed },
    "Digest memory updated",
  );
}

function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayDateStr(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}

export function getTodayMorning(): DigestEntry | undefined {
  const today = getTodayDateStr();
  return digestHistory.find(
    (d) => d.type === "morning" && d.generatedAt.startsWith(today),
  );
}

export function getTodayEvening(): DigestEntry | undefined {
  const today = getTodayDateStr();
  return digestHistory.find(
    (d) => d.type === "evening" && d.generatedAt.startsWith(today),
  );
}

export function getYesterdayEvening(): DigestEntry | undefined {
  const yesterday = getYesterdayDateStr();
  return digestHistory.find(
    (d) => d.type === "evening" && d.generatedAt.startsWith(yesterday),
  );
}

export function getLatestDigests(): DigestEntry[] {
  return [...digestHistory];
}

/**
 * Build a Thai-language context string to inject into AI prompts.
 * For evening briefings: includes what happened this morning.
 * For morning briefings: includes what happened yesterday evening.
 */
export function formatDigestContextForAI(type: DigestType): string | null {
  if (type === "evening") {
    const morning = getTodayMorning();
    if (!morning) return null;

    const headlineLines = morning.briefingText
      .split("\n")
      .filter((l) => l.trim() && !["MORNING BRIEFING", "TOP DEVELOPMENTS"].includes(l.trim()))
      .slice(0, 3)
      .join(" ");

    return `บริบทจากรายงานเช้าวันนี้:\n${headlineLines.slice(0, 500)}\n\nระบุในการวิเคราะห์ด้วยว่าอะไรเปลี่ยนแปลงจากเช้า อะไรดำเนินต่อเนื่อง และอะไรเป็นเรื่องใหม่`;
  }

  if (type === "morning") {
    const prevEvening = getYesterdayEvening();
    if (!prevEvening) return null;

    const headlineLines = prevEvening.briefingText
      .split("\n")
      .filter((l) => l.trim() && !["EVENING RECAP", "WHAT HAPPENED TODAY"].includes(l.trim()))
      .slice(0, 3)
      .join(" ");

    return `บริบทจากรายงานเย็นวานนี้:\n${headlineLines.slice(0, 500)}\n\nระบุด้วยว่าพัฒนาการใดที่ดำเนินต่อเนื่องจากวานนี้ และอะไรที่เปลี่ยนแปลงในชั่วข้ามคืน`;
  }

  return null;
}

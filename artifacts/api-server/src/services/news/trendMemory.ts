// ============================================================
// TREND MEMORY — Sprint 5 Task F
//
// Stores top article headlines per topic from the previous 24 hours.
// When generating a briefing, the AI receives:
//   - "Yesterday's major topics" (stored headlines)
//   - "Today's articles" (fresh RSS content)
//
// This makes briefings feel continuous rather than random.
//
// Storage: in-memory (process lifetime). Entries expire after 24h.
// ============================================================

import { logger } from "../../lib/logger.js";

const MEMORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface TrendEntry {
  topicId: string;
  headlines: string[];
  briefingHeadline: string;
  storedAt: Date;
  expiresAt: Date;
}

// ── In-memory store ──────────────────────────────────────────

const store = new Map<string, TrendEntry>();

// ── Eviction ─────────────────────────────────────────────────

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt.getTime() < now) {
      store.delete(key);
    }
  }
}

// ── Public API ───────────────────────────────────────────────

/**
 * Record top article headlines for a topic after a successful briefing.
 * Called by the news route after AI generation succeeds.
 *
 * @param topicId          Topic ID
 * @param headlines        Array of article titles (best first)
 * @param briefingHeadline The AI-generated briefing headline (first line)
 */
export function recordTrend(
  topicId: string,
  headlines: string[],
  briefingHeadline: string,
): void {
  evictExpired();
  const now = new Date();
  store.set(topicId, {
    topicId,
    headlines: headlines.slice(0, 5), // keep top 5
    briefingHeadline,
    storedAt: now,
    expiresAt: new Date(now.getTime() + MEMORY_TTL_MS),
  });
  logger.info({ topicId, headlineCount: headlines.length }, "Trend memory updated");
}

/**
 * Retrieve yesterday's major topics for a topic.
 * Returns null if no memory exists or it has expired.
 */
export function getTrendContext(topicId: string): TrendEntry | null {
  evictExpired();
  return store.get(topicId) ?? null;
}

/**
 * Format trend context for inclusion in an AI prompt.
 * Returns an empty string if no context is available.
 */
export function formatTrendContext(topicId: string): string {
  const entry = getTrendContext(topicId);
  if (!entry) return "";

  const hoursAgo = Math.round(
    (Date.now() - entry.storedAt.getTime()) / 3_600_000,
  );
  const timeLabel = hoursAgo <= 1 ? "ในชั่วโมงที่ผ่านมา" : `${hoursAgo} ชั่วโมงที่ผ่านมา`;

  const lines = [
    `--- บริบทจาก${timeLabel} ---`,
    `หัวข้อสำคัญก่อนหน้า: ${entry.briefingHeadline}`,
    `เรื่องราวที่ถูกรายงาน:`,
    ...entry.headlines.map((h, i) => `${i + 1}. ${h}`),
    `--- สิ้นสุดบริบทก่อนหน้า ---`,
  ];

  return lines.join("\n");
}

/**
 * Returns all stored trend entries (for admin/debugging).
 */
export function getAllTrends(): Array<{
  topicId: string;
  briefingHeadline: string;
  headlineCount: number;
  storedAt: string;
  expiresAt: string;
}> {
  evictExpired();
  return Array.from(store.values()).map((e) => ({
    topicId: e.topicId,
    briefingHeadline: e.briefingHeadline,
    headlineCount: e.headlines.length,
    storedAt: e.storedAt.toISOString(),
    expiresAt: e.expiresAt.toISOString(),
  }));
}

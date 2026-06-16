// ============================================================
// DELIVERY QUALITY METRICS — Sprint 8 Task I
//
// Tracks internal delivery quality measurements:
//   - Digest length (word count)
//   - Stories included per delivery
//   - Delivery success/failure rate
//   - Estimated reading time
//   - Alert frequency
//   - Signal score distribution
//
// Storage: in-memory ring buffer (max 200 entries, ~100 days).
// Accessible at GET /api/admin/analytics.
// ============================================================

import { getAlertStats } from "../delivery/alertEngine.js";

export interface DeliveryRecord {
  id: string;
  type: "morning" | "evening";
  recordedAt: string;
  success: boolean;
  wordCount: number;
  estimatedReadingTimeSecs: number;
  articlesIncluded: number;
  topicsUsed: string[];
  deliveryChannel: string;
  error?: string;
  generationTimeMs: number;
  signalHighCount: number;
  signalLowCount: number;
}

const MAX_RECORDS = 200;
const WORDS_PER_MINUTE = 200; // average reading speed

const deliveryLog: DeliveryRecord[] = [];

// ── Counter stats ────────────────────────────────────────────

interface DeliveryStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  avgWordCount: number;
  avgReadingTimeSecs: number;
  avgArticlesIncluded: number;
  avgGenerationTimeMs: number;
  last7Days: {
    morning: number;
    evening: number;
    failures: number;
  };
}

// ── Public API ───────────────────────────────────────────────

/**
 * Record a delivery attempt.
 * Call from deliveryEngine after each attempt (success or failure).
 */
export function recordDelivery(record: Omit<DeliveryRecord, "id" | "recordedAt">): void {
  const full: DeliveryRecord = {
    ...record,
    id: `dlv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    recordedAt: new Date().toISOString(),
  };

  deliveryLog.push(full);

  // Ring buffer: remove oldest if over cap
  if (deliveryLog.length > MAX_RECORDS) {
    deliveryLog.shift();
  }
}

/**
 * Compute word count and estimated reading time from raw briefing text.
 */
export function analyzeDeliveryText(rawText: string): {
  wordCount: number;
  estimatedReadingTimeSecs: number;
} {
  const wordCount = rawText.trim().split(/\s+/).length;
  const estimatedReadingTimeSecs = Math.round((wordCount / WORDS_PER_MINUTE) * 60);
  return { wordCount, estimatedReadingTimeSecs };
}

/**
 * Get all delivery records, newest first.
 */
export function getDeliveryLog(): DeliveryRecord[] {
  return [...deliveryLog].reverse();
}

/**
 * Compute summary statistics across all delivery records.
 */
export function getDeliveryStats(): DeliveryStats {
  const total = deliveryLog.length;
  if (total === 0) {
    return {
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      successRate: 0,
      avgWordCount: 0,
      avgReadingTimeSecs: 0,
      avgArticlesIncluded: 0,
      avgGenerationTimeMs: 0,
      last7Days: { morning: 0, evening: 0, failures: 0 },
    };
  }

  const successful = deliveryLog.filter((r) => r.success);
  const cutoff7d = Date.now() - 7 * 86_400_000;
  const last7 = deliveryLog.filter((r) => new Date(r.recordedAt).getTime() >= cutoff7d);

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  return {
    totalDeliveries: total,
    successfulDeliveries: successful.length,
    failedDeliveries: total - successful.length,
    successRate:
      total > 0 ? Math.round((successful.length / total) * 100) : 0,
    avgWordCount: avg(successful.map((r) => r.wordCount)),
    avgReadingTimeSecs: avg(successful.map((r) => r.estimatedReadingTimeSecs)),
    avgArticlesIncluded: avg(successful.map((r) => r.articlesIncluded)),
    avgGenerationTimeMs: avg(deliveryLog.map((r) => r.generationTimeMs)),
    last7Days: {
      morning: last7.filter((r) => r.type === "morning").length,
      evening: last7.filter((r) => r.type === "evening").length,
      failures: last7.filter((r) => !r.success).length,
    },
  };
}

/**
 * Get the full analytics snapshot for the admin dashboard.
 */
export function getAnalyticsSnapshot() {
  const stats = getDeliveryStats();
  const alertStats = getAlertStats();
  const recent = getDeliveryLog().slice(0, 20);

  return {
    stats,
    alertStats,
    recentDeliveries: recent,
    generatedAt: new Date().toISOString(),
  };
}

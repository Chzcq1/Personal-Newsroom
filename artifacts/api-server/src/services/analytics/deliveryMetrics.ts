// ============================================================
// DELIVERY QUALITY METRICS — Sprint 12 Task I update
//
// Tracks delivery quality measurements:
//   - Digest length (word count)
//   - Stories included per delivery
//   - Delivery success/failure rate
//   - Estimated reading time
//   - Alert frequency
//   - Signal score distribution
//   - Token cost estimates (NEW Sprint 12)
//   - Retry counts (NEW Sprint 12)
//   - Narrative density (NEW Sprint 12)
//
// Storage: in-memory ring buffer (max 200 entries).
// Accessible at GET /api/admin/analytics and GET /api/admin/delivery
// ============================================================

import { getAlertStats } from "../delivery/alertEngine.js";
import { getTokenStats } from "../ai/tokenEconomy.js";
import { getRecoverySnapshot } from "../delivery/deliveryRecovery.js";

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
  retryCount?: number;
  tokenInputChars?: number;
}

const MAX_RECORDS = 200;
const WORDS_PER_MINUTE = 200;

const deliveryLog: DeliveryRecord[] = [];

// ── Recording ─────────────────────────────────────────────────

export function recordDelivery(record: Omit<DeliveryRecord, "id" | "recordedAt">): void {
  const full: DeliveryRecord = {
    ...record,
    id: `dlv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    recordedAt: new Date().toISOString(),
  };
  deliveryLog.push(full);
  if (deliveryLog.length > MAX_RECORDS) {
    deliveryLog.shift();
  }
}

export function analyzeDeliveryText(rawText: string): {
  wordCount: number;
  estimatedReadingTimeSecs: number;
} {
  const wordCount = rawText.trim().split(/\s+/).length;
  const estimatedReadingTimeSecs = Math.round((wordCount / WORDS_PER_MINUTE) * 60);
  return { wordCount, estimatedReadingTimeSecs };
}

export function getDeliveryLog(): DeliveryRecord[] {
  return [...deliveryLog].reverse();
}

// ── Statistics ────────────────────────────────────────────────

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
    successRate: Math.round((successful.length / total) * 100),
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

// ── V2 Analytics snapshot (Sprint 12) ────────────────────────

export function getAnalyticsSnapshot() {
  const stats = getDeliveryStats();
  const alertStats = getAlertStats();
  const tokenStats = getTokenStats();
  const recoverySnapshot = getRecoverySnapshot();
  const recent = getDeliveryLog().slice(0, 20);

  // Signal efficiency: ratio of high-signal articles in recent deliveries
  const recentSuccessful = recent.filter((r) => r.success);
  const totalSignalArticles = recentSuccessful.reduce((s, r) => s + r.articlesIncluded, 0);
  const totalHighSignal = recentSuccessful.reduce((s, r) => s + r.signalHighCount, 0);
  const signalEfficiency = totalSignalArticles > 0
    ? Math.round((totalHighSignal / totalSignalArticles) * 100)
    : 0;

  // Narrative density: avg articles per delivery
  const narrativeDensity = stats.avgArticlesIncluded;

  // Retry rate
  const withRetries = recent.filter((r) => (r.retryCount ?? 0) > 0).length;
  const retryRate = recent.length > 0
    ? Math.round((withRetries / recent.length) * 100)
    : 0;

  return {
    stats,
    alertStats,
    tokenStats,
    recoverySnapshot,
    recentDeliveries: recent,
    signalEfficiency,
    narrativeDensity,
    retryRate,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================
// KNOWLEDGE COMPOUND SYSTEM — Sprint 15 Task F
//
// Tracks the compound value INFOX delivers to a user over time.
// NOT an addictive streak/gamification system.
//
// Philosophy: "Users should feel better informed, not addicted."
//
// Metrics tracked:
//   - Estimated hours saved (based on articles filtered × read time)
//   - Signal accuracy rate (high-signal articles vs total)
//   - Noise filtered (suppressed articles count)
//   - Relevant alerts delivered
//   - Narratives followed successfully (multi-part stories tracked)
//   - High-value reads (user-saved briefings count)
//
// Storage: in-memory ring buffer (100 sessions max).
// Persists to localStorage on frontend — server provides calculation.
//
// Architecture: pure functions + stateful session log.
// ============================================================

import { logger } from "../../lib/logger.js";

// ── Session tracking ──────────────────────────────────────────

export interface CompoundSession {
  id: string;
  recordedAt: string;
  articlesDelivered: number;
  articlesFiltered: number;    // noise suppressed
  briefingType: "on-demand" | "morning" | "evening" | "executive" | "intelligence";
  topicId: string;
  signalRatio: number;         // 0–1: high-signal articles / total
  wasSaved: boolean;           // user saved this briefing
  alertsDelivered: number;
  narrativesTracked: number;
}

const MAX_SESSIONS = 200;
const sessions: CompoundSession[] = [];

// ── Session recording ─────────────────────────────────────────

export function recordCompoundSession(session: Omit<CompoundSession, "id" | "recordedAt">): void {
  sessions.push({
    ...session,
    id: `kc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    recordedAt: new Date().toISOString(),
  });
  if (sessions.length > MAX_SESSIONS) sessions.shift();
}

// ── Compound rate calculation ────────────────────────────────

export interface KnowledgeCompoundRate {
  // Time value
  estimatedHoursSaved: number;
  estimatedMinutesSaved: number;

  // Signal quality
  signalAccuracyRate: number;    // 0–100% high-signal ratio
  noiseFilteredCount: number;    // total articles suppressed
  noiseFilteredPercent: number;  // % of seen articles that were noise

  // Delivery quality
  alertsDelivered: number;
  narrativesFollowed: number;
  highValueReads: number;        // saved briefings

  // Session stats
  totalBriefings: number;
  totalArticlesDelivered: number;

  // Period
  periodDays: number;
  windowStart: string;
  windowEnd: string;

  // Compound insight
  compoundInsight: string;       // Human-readable summary in Thai
}

// Time saved model:
//   Reading a news article independently: ~8 minutes average
//   INFOX filters and delivers the key insight: ~1.5 min per briefing
//   Savings per session = (articlesFiltered × 8min) + (articlesDelivered × 6.5min savings)

const MINUTES_PER_ARTICLE_WITHOUT_INFOX = 8;
const MINUTES_PER_BRIEFING_WITH_INFOX = 1.5;
const MINUTES_SAVED_PER_FILTERED = 4; // estimated value of skipping noise

export function calculateCompoundRate(periodDays = 7): KnowledgeCompoundRate {
  const cutoff = Date.now() - periodDays * 86_400_000;
  const periodSessions = sessions.filter(
    (s) => new Date(s.recordedAt).getTime() >= cutoff,
  );

  if (periodSessions.length === 0) {
    return {
      estimatedHoursSaved: 0,
      estimatedMinutesSaved: 0,
      signalAccuracyRate: 0,
      noiseFilteredCount: 0,
      noiseFilteredPercent: 0,
      alertsDelivered: 0,
      narrativesFollowed: 0,
      highValueReads: 0,
      totalBriefings: 0,
      totalArticlesDelivered: 0,
      periodDays,
      windowStart: new Date(cutoff).toISOString(),
      windowEnd: new Date().toISOString(),
      compoundInsight: "ยังไม่มีข้อมูลในช่วงเวลานี้",
    };
  }

  const totalArticlesDelivered = periodSessions.reduce((s, r) => s + r.articlesDelivered, 0);
  const totalFiltered = periodSessions.reduce((s, r) => s + r.articlesFiltered, 0);
  const totalSeen = totalArticlesDelivered + totalFiltered;

  // Time saved: articles filtered × 4 min + briefings × 6.5 min savings
  const minutesSaved = Math.round(
    totalFiltered * MINUTES_SAVED_PER_FILTERED +
    periodSessions.length * (MINUTES_PER_ARTICLE_WITHOUT_INFOX - MINUTES_PER_BRIEFING_WITH_INFOX) * 1.5,
  );
  const hoursSaved = minutesSaved / 60;

  // Signal accuracy: average of session signal ratios
  const avgSignalRatio = periodSessions.length > 0
    ? periodSessions.reduce((s, r) => s + r.signalRatio, 0) / periodSessions.length
    : 0;

  const alertsDelivered = periodSessions.reduce((s, r) => s + r.alertsDelivered, 0);
  const narrativesFollowed = periodSessions.reduce((s, r) => s + r.narrativesTracked, 0);
  const highValueReads = periodSessions.filter((s) => s.wasSaved).length;
  const noiseFilteredPercent = totalSeen > 0 ? Math.round((totalFiltered / totalSeen) * 100) : 0;

  // Generate human-readable insight in Thai
  const compoundInsight = buildCompoundInsight(
    hoursSaved,
    minutesSaved,
    noiseFilteredPercent,
    Math.round(avgSignalRatio * 100),
    periodDays,
  );

  logger.info(
    { hoursSaved, minutesSaved, sessions: periodSessions.length, noiseFilteredPercent },
    "[KnowledgeCompound] Rate calculated",
  );

  return {
    estimatedHoursSaved: Math.round(hoursSaved * 10) / 10,
    estimatedMinutesSaved: minutesSaved,
    signalAccuracyRate: Math.round(avgSignalRatio * 100),
    noiseFilteredCount: totalFiltered,
    noiseFilteredPercent,
    alertsDelivered,
    narrativesFollowed,
    highValueReads,
    totalBriefings: periodSessions.length,
    totalArticlesDelivered,
    periodDays,
    windowStart: new Date(cutoff).toISOString(),
    windowEnd: new Date().toISOString(),
    compoundInsight,
  };
}

function buildCompoundInsight(
  hoursSaved: number,
  minutesSaved: number,
  noisePercent: number,
  signalAccuracy: number,
  periodDays: number,
): string {
  const timeStr = hoursSaved >= 1
    ? `${Math.floor(hoursSaved)} ชั่วโมง ${minutesSaved % 60} นาที`
    : `${minutesSaved} นาที`;

  const parts: string[] = [];

  if (minutesSaved > 0) {
    parts.push(`สัปดาห์นี้ INFOX ช่วยประหยัดเวลาของคุณได้ ${timeStr}`);
  }

  if (noisePercent >= 30) {
    parts.push(`กรองข่าวที่ไม่จำเป็นออก ${noisePercent}% เหลือเฉพาะสัญญาณที่สำคัญ`);
  }

  if (signalAccuracy >= 70) {
    parts.push(`ความแม่นยำของสัญญาณสูงถึง ${signalAccuracy}%`);
  }

  if (parts.length === 0) {
    return `เริ่มใช้ INFOX เพื่อติดตามข่าวสารในช่วง ${periodDays} วันที่ผ่านมา`;
  }

  return parts.join(" · ");
}

// ── Weekly summary ────────────────────────────────────────────

export interface WeeklyCompoundSummary {
  daily: Array<{
    date: string;
    briefings: number;
    minutesSaved: number;
    noiseFiltered: number;
  }>;
  weeklyRate: KnowledgeCompoundRate;
}

export function getWeeklySummary(): WeeklyCompoundSummary {
  const weeklyRate = calculateCompoundRate(7);

  // Build daily breakdown for the past 7 days
  const daily = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - i * 86_400_000);
    const dateStr = date.toISOString().split("T")[0];
    const daySessions = sessions.filter(
      (s) => s.recordedAt.startsWith(dateStr),
    );
    const minutesSaved = daySessions.reduce(
      (sum, s) => sum + s.articlesFiltered * MINUTES_SAVED_PER_FILTERED, 0,
    );
    return {
      date: dateStr,
      briefings: daySessions.length,
      minutesSaved,
      noiseFiltered: daySessions.reduce((s, r) => s + r.articlesFiltered, 0),
    };
  }).reverse();

  return { daily, weeklyRate };
}

// ── Reset ─────────────────────────────────────────────────────

export function resetCompoundData(): void {
  sessions.length = 0;
}

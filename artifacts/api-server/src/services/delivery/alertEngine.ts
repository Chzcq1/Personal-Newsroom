// ============================================================
// PRIORITY ALERT ENGINE — Sprint 8 Task D
//
// Detects high-importance developments and generates
// one-line intelligence alerts.
//
// Trigger conditions (extremely selective):
//   - Major market moves (>5% single-stock or index move)
//   - Breaking AI/tech developments (product launches, acquisitions)
//   - Watchlist entity spikes (user-specified terms)
//   - Major geopolitical events (elections, conflicts, sanctions)
//
// Anti-spam rules:
//   - Max 3 alerts per 6-hour window
//   - Same entity cannot alert more than once per 24h
//   - Score threshold: article must be >= ALERT_THRESHOLD
//
// Architecture: stateful (in-memory), no side effects on creation.
// Call checkForAlerts() after collecting articles.
// ============================================================

import { logger } from "../../lib/logger.js";
import { scoreSignal } from "../intelligence/signalScoring.js";
import type { RssArticle } from "../news/rssService.js";

export interface PriorityAlert {
  id: string;
  headline: string;
  source: string | null;
  url: string;
  category: AlertCategory;
  triggeredAt: string;
  articleSignalScore: number;
}

export type AlertCategory =
  | "market_move"
  | "ai_development"
  | "watchlist_spike"
  | "geopolitical"
  | "major_event";

// ── Configuration ────────────────────────────────────────────

const ALERT_SIGNAL_THRESHOLD = 80; // minimum signal score to trigger
const MAX_ALERTS_PER_WINDOW = 3;
const WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours
const ENTITY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours per entity

// ── Category detection ───────────────────────────────────────

const MARKET_MOVE_PATTERNS = [
  /(?:shares?|stock)\s+(?:rise|rise|fall|surge|plunge|drop|jump|tumble|crash|soar)\s+(\d+)%/i,
  /(?:up|down)\s+(\d+)%\s+(?:after|on|following)/i,
  /(?:gains?|loses?|rises?|falls?)\s+(\d+(?:\.\d+)?)\s*(?:percent|%)/i,
  /market\s+(?:crash|rally|surge|collapse|plunge)/i,
  /all-time\s+(?:high|low)/i,
  /record\s+(?:high|low|close)/i,
];

const AI_DEVELOPMENT_PATTERNS = [
  /(?:openai|anthropic|google|meta|nvidia|microsoft|apple)\s+(?:launches?|releases?|unveils?|announces?|introduces?)/i,
  /(?:gpt|claude|gemini|llama|copilot|o[123])\s+(?:\d|\w)/i,
  /ai\s+(?:breakthrough|regulation|ban|chip|model)/i,
  /acqui(?:res?|sition)\s+.*ai/i,
  /\$\d+\s*(?:billion|million)\s+(?:round|valuation|funding)/i,
];

const GEOPOLITICAL_PATTERNS = [
  /(?:election|vote)\s+(?:result|win|loss)/i,
  /(?:sanctions?|embargo)\s+(?:against|on|imposed)/i,
  /(?:declares?|declaration)\s+(?:war|emergency|ceasefire)/i,
  /(?:summit|agreement|treaty)\s+(?:signed?|reached?|failed?)/i,
  /(?:coup|crisis|collapse)\s+in/i,
  /(?:nato|un|imf|world\s+bank)\s+(?:warns?|announces?|approves?|rejects?)/i,
];

function detectCategory(article: RssArticle): AlertCategory | null {
  const text = `${article.title} ${article.description ?? ""}`;

  for (const pattern of MARKET_MOVE_PATTERNS) {
    if (pattern.test(text)) return "market_move";
  }
  for (const pattern of AI_DEVELOPMENT_PATTERNS) {
    if (pattern.test(text)) return "ai_development";
  }
  for (const pattern of GEOPOLITICAL_PATTERNS) {
    if (pattern.test(text)) return "geopolitical";
  }

  return null;
}

function detectWatchlistCategory(
  article: RssArticle,
  watchlist: string[],
): boolean {
  if (watchlist.length === 0) return false;
  const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
  return watchlist.some((term) => text.includes(term.toLowerCase()));
}

// ── Alert store ──────────────────────────────────────────────

interface AlertRecord {
  alert: PriorityAlert;
  triggeredAt: number;
  entityKey: string;
}

const alertHistory: AlertRecord[] = [];

function pruneOldAlerts(): void {
  const cutoff = Date.now() - Math.max(WINDOW_MS, ENTITY_COOLDOWN_MS);
  const startIdx = alertHistory.findIndex((r) => r.triggeredAt >= cutoff);
  if (startIdx > 0) alertHistory.splice(0, startIdx);
}

function countAlertsInWindow(): number {
  const cutoff = Date.now() - WINDOW_MS;
  return alertHistory.filter((r) => r.triggeredAt >= cutoff).length;
}

function hasEntityAlertedRecently(entityKey: string): boolean {
  const cutoff = Date.now() - ENTITY_COOLDOWN_MS;
  return alertHistory.some(
    (r) => r.entityKey === entityKey && r.triggeredAt >= cutoff,
  );
}

function extractEntityKey(article: RssArticle): string {
  // Use first 5 significant words of the title as entity key
  const words = article.title
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5);
  return words.join("-");
}

// ── Public API ───────────────────────────────────────────────

/**
 * Check a list of articles for alert-worthy developments.
 * Returns at most MAX_ALERTS_PER_WINDOW new alerts.
 * Respects cooldown periods to prevent spam.
 */
export function checkForAlerts(
  articles: RssArticle[],
  watchlist: string[] = [],
): PriorityAlert[] {
  pruneOldAlerts();

  if (countAlertsInWindow() >= MAX_ALERTS_PER_WINDOW) {
    logger.debug("Alert window saturated — skipping alert check");
    return [];
  }

  const newAlerts: PriorityAlert[] = [];

  for (const article of articles) {
    if (countAlertsInWindow() + newAlerts.length >= MAX_ALERTS_PER_WINDOW) break;

    const signal = scoreSignal(article, articles, watchlist);
    if (signal.total < ALERT_SIGNAL_THRESHOLD) continue;

    const entityKey = extractEntityKey(article);
    if (hasEntityAlertedRecently(entityKey)) continue;

    let category = detectCategory(article);
    const isWatchlist = detectWatchlistCategory(article, watchlist);

    if (!category && !isWatchlist) continue;
    if (!category) category = "watchlist_spike";

    const alert: PriorityAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      headline: article.title,
      source: article.source ?? null,
      url: article.url,
      category,
      triggeredAt: new Date().toISOString(),
      articleSignalScore: signal.total,
    };

    newAlerts.push(alert);
    alertHistory.push({
      alert,
      triggeredAt: Date.now(),
      entityKey,
    });

    logger.info(
      { alertId: alert.id, category, signalScore: signal.total },
      "Priority alert triggered",
    );
  }

  return newAlerts;
}

/**
 * Retrieve all alerts in the last N hours.
 */
export function getRecentAlerts(hours = 24): PriorityAlert[] {
  pruneOldAlerts();
  const cutoff = Date.now() - hours * 3_600_000;
  return alertHistory
    .filter((r) => r.triggeredAt >= cutoff)
    .map((r) => r.alert)
    .reverse();
}

/**
 * Get alert stats for metrics.
 */
export function getAlertStats(): {
  totalInLast24h: number;
  totalInLast6h: number;
  lastAlertAt: string | null;
} {
  pruneOldAlerts();
  const now = Date.now();
  return {
    totalInLast24h: alertHistory.filter((r) => r.triggeredAt >= now - 86_400_000).length,
    totalInLast6h: alertHistory.filter((r) => r.triggeredAt >= now - WINDOW_MS).length,
    lastAlertAt: alertHistory.length > 0
      ? alertHistory[alertHistory.length - 1].alert.triggeredAt
      : null,
  };
}

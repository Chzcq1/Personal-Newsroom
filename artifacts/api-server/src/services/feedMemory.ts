// ============================================================
// FEED MEMORY — Lightweight Engagement Tracker
// Sprint 29 — Real-Time Trend Intelligence
//
// Tracks how users engage with individual feed items:
//   • open count (how many times an article was opened)
//   • save events
//   • skip (pass) events
//   • read duration
//   • repeat opens
//
// All tracking is token-free and rule-based. The engagement
// prediction score is used to boost/demote articles in future
// feed rankings.
//
// Storage: in-memory ring buffer (last 1000 events per profile).
// Data is NOT persisted to DB — only affects the current session.
// Future: migrate to DB for cross-session memory.
// ============================================================

// ── Types ────────────────────────────────────────────────────

export type EngagementEvent = "open" | "save" | "skip" | "follow" | "share";

export interface FeedEvent {
  profileId: string;
  url: string;
  topicId: string;
  event: EngagementEvent;
  durationMs?: number;   // for "open" events
  timestamp: number;
}

export interface UrlEngagement {
  url: string;
  opens: number;
  saves: number;
  skips: number;
  follows: number;
  shares: number;
  totalDurationMs: number;
  lastEngagedAt: number;
  firstSeenAt: number;
}

export interface TopicEngagement {
  topicId: string;
  openCount: number;
  saveCount: number;
  skipCount: number;
  avgDurationMs: number;
  engagementScore: number; // 0.0–1.0 derived from open/save vs skip ratio
}

// ── Ring buffer capacity ──────────────────────────────────────

const MAX_EVENTS_PER_PROFILE = 500;

// ── In-memory stores ──────────────────────────────────────────

// profileId → recent events
const profileEvents = new Map<string, FeedEvent[]>();

// url → aggregated engagement (across all profiles)
const urlEngagement = new Map<string, UrlEngagement>();

// profileId+topicId → aggregated topic engagement
const topicEngagementMap = new Map<string, TopicEngagement>();

// ── Record a feed event ───────────────────────────────────────

export function recordFeedEvent(event: FeedEvent): void {
  // Ring buffer per profile
  const events = profileEvents.get(event.profileId) ?? [];
  events.push(event);
  if (events.length > MAX_EVENTS_PER_PROFILE) {
    events.splice(0, events.length - MAX_EVENTS_PER_PROFILE);
  }
  profileEvents.set(event.profileId, events);

  // Aggregate URL engagement
  const existing = urlEngagement.get(event.url) ?? {
    url: event.url,
    opens: 0,
    saves: 0,
    skips: 0,
    follows: 0,
    shares: 0,
    totalDurationMs: 0,
    lastEngagedAt: event.timestamp,
    firstSeenAt: event.timestamp,
  };

  switch (event.event) {
    case "open":
      existing.opens++;
      if (event.durationMs) existing.totalDurationMs += event.durationMs;
      break;
    case "save":
      existing.saves++;
      break;
    case "skip":
      existing.skips++;
      break;
    case "follow":
      existing.follows++;
      break;
    case "share":
      existing.shares++;
      break;
  }
  existing.lastEngagedAt = event.timestamp;
  urlEngagement.set(event.url, existing);

  // Aggregate topic engagement per profile
  const topicKey = `${event.profileId}:${event.topicId}`;
  const te = topicEngagementMap.get(topicKey) ?? {
    topicId: event.topicId,
    openCount: 0,
    saveCount: 0,
    skipCount: 0,
    avgDurationMs: 0,
    engagementScore: 0.5,
  };

  if (event.event === "open") te.openCount++;
  if (event.event === "save") te.saveCount++;
  if (event.event === "skip") te.skipCount++;

  const totalPositive = te.openCount + te.saveCount * 3;
  const totalNegative = te.skipCount;
  te.engagementScore = totalPositive + totalNegative === 0
    ? 0.5
    : Math.min(1.0, totalPositive / (totalPositive + totalNegative + 1));

  if (event.event === "open" && event.durationMs) {
    te.avgDurationMs = te.openCount === 0
      ? event.durationMs
      : (te.avgDurationMs * (te.openCount - 1) + event.durationMs) / te.openCount;
  }

  topicEngagementMap.set(topicKey, te);
}

// ── Predict engagement score for an article ───────────────────
// Returns 0.0–1.0. Used to boost/demote articles in feed ranking.

export function predictEngagement(
  url: string,
  topicId: string,
  profileId: string,
): number {
  const ue = urlEngagement.get(url);
  const topicKey = `${profileId}:${topicId}`;
  const te = topicEngagementMap.get(topicKey);

  let score = 0.5; // neutral prior

  if (ue) {
    // Article-level signals
    if (ue.saves > 0) score += 0.3;
    if (ue.follows > 0) score += 0.2;
    if (ue.opens > 1) score += 0.1;     // repeat opens = high interest
    if (ue.skips > 0) score -= 0.25;
    if (ue.totalDurationMs > 60_000) score += 0.15; // read > 60s
  }

  if (te) {
    // Topic-level affinity from profile history
    score = score * 0.6 + te.engagementScore * 0.4;
  }

  return Math.max(0.0, Math.min(1.0, score));
}

// ── Get engagement data for a profile ────────────────────────

export function getProfileMemory(profileId: string): {
  recentEvents: FeedEvent[];
  topicAffinities: TopicEngagement[];
} {
  const recentEvents = (profileEvents.get(profileId) ?? []).slice(-50);
  const topicAffinities: TopicEngagement[] = [];

  for (const [key, te] of topicEngagementMap) {
    if (key.startsWith(`${profileId}:`)) {
      topicAffinities.push(te);
    }
  }

  return { recentEvents, topicAffinities };
}

// ── Global stats (for admin API) ─────────────────────────────

export function getMemoryStats(): {
  totalProfiles: number;
  totalUrlsTracked: number;
  totalTopicsTracked: number;
  mostEngaged: UrlEngagement[];
  mostSkipped: UrlEngagement[];
} {
  const allUrls = Array.from(urlEngagement.values());

  return {
    totalProfiles: profileEvents.size,
    totalUrlsTracked: urlEngagement.size,
    totalTopicsTracked: topicEngagementMap.size,
    mostEngaged: allUrls
      .sort((a, b) => (b.saves * 3 + b.opens) - (a.saves * 3 + a.opens))
      .slice(0, 10),
    mostSkipped: allUrls
      .sort((a, b) => b.skips - a.skips)
      .slice(0, 10),
  };
}

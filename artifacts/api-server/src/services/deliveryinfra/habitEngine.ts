// ============================================================
// HABIT ENGINE — Sprint 13 Task J
//
// Lightweight habit-forming mechanics. NO gamification overload.
//
// Features:
//   - Morning intelligence streak (consecutive daily opens)
//   - Weekly knowledge summary (topics + entities covered)
//   - Narrative follow tracking (which threads user engages with)
//   - Evolving intelligence profile (derived from engagement)
//
// Storage: in-memory ring buffer (same migration-ready pattern as Sprint 12)
// Future: PostgreSQL via Drizzle ORM (swap backing only)
// ============================================================

// ── Types ──────────────────────────────────────────────────────

export interface DailyEngagementRecord {
  date: string;           // YYYY-MM-DD in ICT
  openedAt: string;       // ISO8601
  articlesRead: number;
  topicsEngaged: string[];
  narrativesViewed: string[];
  feedbackGiven: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  streakActive: boolean;
  milestone: string | null;  // "3 days", "7 days", "30 days" etc.
}

export interface WeeklySummary {
  weekStart: string;      // YYYY-MM-DD
  weekEnd: string;
  totalDaysActive: number;
  totalArticlesRead: number;
  topTopics: string[];
  topNarratives: string[];
  topEntities: string[];
  engagementScore: number; // 0–100
}

export interface NarrativeFollowRecord {
  narrativeId: string;
  narrativeTitle: string;
  firstSeen: string;
  lastSeen: string;
  viewCount: number;
  feedbackGiven: Array<{ type: string; at: string }>;
  following: boolean;
}

export interface IntelligenceProfile {
  dominantTopics: string[];
  dominantEntities: string[];
  preferredBriefingTime: "morning" | "evening" | "both";
  readingSpeed: "fast" | "medium" | "thorough";
  signalSensitivity: "high" | "normal" | "low";
  streak: StreakInfo;
  weeklyEngagementTrend: "improving" | "stable" | "declining";
}

// ── In-memory store ────────────────────────────────────────────

const MAX_DAILY_RECORDS = 90; // 3 months
const MAX_NARRATIVES = 200;

const dailyEngagement: DailyEngagementRecord[] = [];
const narrativeFollows = new Map<string, NarrativeFollowRecord>();

// ── ICT date helpers ──────────────────────────────────────────

function todayICT(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

function yesterdayICT(): string {
  const d = new Date();
  d.setTime(d.getTime() - 86400000);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

function dateDiffDays(a: string, b: string): number {
  return Math.round(
    (new Date(a).getTime() - new Date(b).getTime()) / 86400000,
  );
}

// ── Daily engagement recording ─────────────────────────────────

export function recordDailyOpen(
  articlesRead = 0,
  topicsEngaged: string[] = [],
  narrativesViewed: string[] = [],
): void {
  const date = todayICT();
  const existing = dailyEngagement.find((r) => r.date === date);

  if (existing) {
    existing.articlesRead += articlesRead;
    existing.topicsEngaged = [...new Set([...existing.topicsEngaged, ...topicsEngaged])];
    existing.narrativesViewed = [...new Set([...existing.narrativesViewed, ...narrativesViewed])];
  } else {
    dailyEngagement.push({
      date,
      openedAt: new Date().toISOString(),
      articlesRead,
      topicsEngaged,
      narrativesViewed,
      feedbackGiven: 0,
    });

    if (dailyEngagement.length > MAX_DAILY_RECORDS) {
      dailyEngagement.shift();
    }
  }
}

export function recordFeedbackGiven(): void {
  const date = todayICT();
  const existing = dailyEngagement.find((r) => r.date === date);
  if (existing) {
    existing.feedbackGiven += 1;
  } else {
    recordDailyOpen(0, [], []);
    const rec = dailyEngagement.find((r) => r.date === date);
    if (rec) rec.feedbackGiven += 1;
  }
}

// ── Streak calculation ─────────────────────────────────────────

export function getStreakInfo(): StreakInfo {
  if (dailyEngagement.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      streakActive: false,
      milestone: null,
    };
  }

  const sorted = [...dailyEngagement]
    .sort((a, b) => a.date.localeCompare(b.date));

  const today = todayICT();
  const yesterday = yesterdayICT();
  const lastDate = sorted[sorted.length - 1].date;

  const streakActive = lastDate === today || lastDate === yesterday;

  // Current streak: count consecutive days back from last active
  let currentStreak = 0;
  if (streakActive) {
    let checkDate = lastDate;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].date === checkDate) {
        currentStreak++;
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        checkDate = prev.toLocaleDateString("sv-SE");
      } else if (dateDiffDays(checkDate, sorted[i].date) > 1) {
        break;
      }
    }
  }

  // Longest streak
  let longestStreak = 0;
  let runLength = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = dateDiffDays(sorted[i].date, sorted[i - 1].date);
    if (diff === 1) {
      runLength++;
      longestStreak = Math.max(longestStreak, runLength);
    } else if (diff > 1) {
      runLength = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  const MILESTONES = [3, 7, 14, 30, 60, 100];
  const milestone = MILESTONES.find((m) => currentStreak === m)
    ? `${currentStreak} วัน`
    : null;

  return {
    currentStreak,
    longestStreak,
    lastActiveDate: lastDate,
    streakActive,
    milestone,
  };
}

// ── Weekly summary ─────────────────────────────────────────────

export function getWeeklySummary(): WeeklySummary {
  const today = todayICT();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStart = weekAgo.toLocaleDateString("sv-SE");

  const weekRecords = dailyEngagement.filter(
    (r) => r.date >= weekStart && r.date <= today,
  );

  const topicFreq = new Map<string, number>();
  const narrativeFreq = new Map<string, number>();
  let totalArticles = 0;

  for (const r of weekRecords) {
    totalArticles += r.articlesRead;
    for (const t of r.topicsEngaged) topicFreq.set(t, (topicFreq.get(t) ?? 0) + 1);
    for (const n of r.narrativesViewed) narrativeFreq.set(n, (narrativeFreq.get(n) ?? 0) + 1);
  }

  const topTopics = [...topicFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);

  const topNarratives = [...narrativeFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n]) => n);

  // Engagement score: days active + articles + feedback
  const totalFeedback = weekRecords.reduce((s, r) => s + r.feedbackGiven, 0);
  const engagementScore = Math.min(
    100,
    Math.round(
      (weekRecords.length / 7) * 40 +
      Math.min(totalArticles / 50, 1) * 40 +
      Math.min(totalFeedback / 10, 1) * 20,
    ),
  );

  return {
    weekStart,
    weekEnd: today,
    totalDaysActive: weekRecords.length,
    totalArticlesRead: totalArticles,
    topTopics,
    topNarratives,
    topEntities: [], // populated by integration with entityMemory
    engagementScore,
  };
}

// ── Narrative following ────────────────────────────────────────

export function recordNarrativeView(narrativeId: string, narrativeTitle: string): void {
  const existing = narrativeFollows.get(narrativeId);
  const now = new Date().toISOString();

  if (existing) {
    existing.lastSeen = now;
    existing.viewCount++;
    existing.narrativeTitle = narrativeTitle;
  } else {
    if (narrativeFollows.size >= MAX_NARRATIVES) {
      // Evict least-recently-seen
      let oldestKey = "";
      let oldestTime = "";
      for (const [k, v] of narrativeFollows) {
        if (!oldestTime || v.lastSeen < oldestTime) {
          oldestKey = k;
          oldestTime = v.lastSeen;
        }
      }
      if (oldestKey) narrativeFollows.delete(oldestKey);
    }

    narrativeFollows.set(narrativeId, {
      narrativeId,
      narrativeTitle,
      firstSeen: now,
      lastSeen: now,
      viewCount: 1,
      feedbackGiven: [],
      following: false,
    });
  }
}

export function followNarrative(narrativeId: string): void {
  const rec = narrativeFollows.get(narrativeId);
  if (rec) rec.following = true;
}

export function unfollowNarrative(narrativeId: string): void {
  const rec = narrativeFollows.get(narrativeId);
  if (rec) rec.following = false;
}

export function getFollowedNarratives(): NarrativeFollowRecord[] {
  return [...narrativeFollows.values()].filter((r) => r.following);
}

export function getTopNarratives(limit = 10): NarrativeFollowRecord[] {
  return [...narrativeFollows.values()]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, limit);
}

// ── Intelligence profile ───────────────────────────────────────

export function getIntelligenceProfile(): IntelligenceProfile {
  const weekly = getWeeklySummary();
  const streak = getStreakInfo();

  // Preferred briefing time from open records
  const morningOpens = dailyEngagement.filter((r) => {
    const hour = new Date(r.openedAt).getHours();
    return hour >= 5 && hour < 12;
  }).length;
  const eveningOpens = dailyEngagement.filter((r) => {
    const hour = new Date(r.openedAt).getHours();
    return hour >= 17 && hour < 23;
  }).length;
  const preferredBriefingTime =
    morningOpens > eveningOpens * 1.5 ? "morning" :
    eveningOpens > morningOpens * 1.5 ? "evening" : "both";

  // Engagement trend (last 7 vs 7 before that)
  const today = todayICT();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toLocaleDateString("sv-SE");
  const weekAgoStr = new Date(new Date(today).setDate(new Date(today).getDate() - 7))
    .toLocaleDateString("sv-SE");

  const thisWeekCount = dailyEngagement.filter(
    (r) => r.date >= weekAgoStr && r.date <= today,
  ).length;
  const lastWeekCount = dailyEngagement.filter(
    (r) => r.date >= twoWeeksAgoStr && r.date < weekAgoStr,
  ).length;

  const weeklyEngagementTrend =
    thisWeekCount > lastWeekCount + 1 ? "improving" :
    thisWeekCount < lastWeekCount - 1 ? "declining" : "stable";

  // Reading speed: articles / days active
  const avgArticlesPerDay = weekly.totalDaysActive > 0
    ? weekly.totalArticlesRead / weekly.totalDaysActive
    : 0;

  const readingSpeed =
    avgArticlesPerDay > 10 ? "fast" :
    avgArticlesPerDay > 5 ? "medium" : "thorough";

  // Signal sensitivity: feedback frequency
  const avgFeedbackPerDay = weekly.totalDaysActive > 0
    ? dailyEngagement
        .filter((r) => r.date >= weekAgoStr)
        .reduce((s, r) => s + r.feedbackGiven, 0) / weekly.totalDaysActive
    : 0;

  const signalSensitivity =
    avgFeedbackPerDay > 3 ? "high" :
    avgFeedbackPerDay > 1 ? "normal" : "low";

  return {
    dominantTopics: weekly.topTopics,
    dominantEntities: weekly.topEntities,
    preferredBriefingTime,
    readingSpeed,
    signalSensitivity,
    streak,
    weeklyEngagementTrend,
  };
}

// ── Public snapshot ────────────────────────────────────────────

export function getHabitSnapshot() {
  return {
    streak: getStreakInfo(),
    weekly: getWeeklySummary(),
    followedNarratives: getFollowedNarratives().length,
    topNarratives: getTopNarratives(5),
    profile: getIntelligenceProfile(),
    generatedAt: new Date().toISOString(),
  };
}

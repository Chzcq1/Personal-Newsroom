// ============================================================
// HABIT DASHBOARD — Sprint 13 Task J
// /admin/habit
//
// Shows daily engagement streak, weekly summary,
// narrative follow tracking, and evolving intelligence profile.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, Flame, BookOpen, TrendingUp,
  Activity, Calendar, Zap, Target, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  streakActive: boolean;
  milestone: string | null;
}

interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalDaysActive: number;
  totalArticlesRead: number;
  topTopics: string[];
  engagementScore: number;
}

interface IntelligenceProfile {
  dominantTopics: string[];
  preferredBriefingTime: string;
  readingSpeed: string;
  signalSensitivity: string;
  streak: StreakInfo;
  weeklyEngagementTrend: string;
}

interface HabitSnapshot {
  streak: StreakInfo;
  weekly: WeeklySummary;
  followedNarratives: number;
  topNarratives: Array<{ narrativeTitle: string; viewCount: number; following: boolean }>;
  profile: IntelligenceProfile;
  generatedAt: string;
}

function StatCard({
  label, value, sub, color = "white",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4">
        <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-bold`} style={{ color }}>{value}</p>
        {sub && <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function HabitDashboardPage() {
  const { data, isFetching, refetch } = useQuery<HabitSnapshot>({
    queryKey: ["habit-snapshot"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/habit/snapshot`);
      if (!res.ok) throw new Error("Failed to fetch habit snapshot");
      return res.json() as Promise<HabitSnapshot>;
    },
    refetchInterval: 60000,
  });

  const TREND_COLORS: Record<string, string> = {
    improving: "#34d399",
    stable: "#60a5fa",
    declining: "#f87171",
  };

  const SPEED_LABELS: Record<string, string> = {
    fast: "เร็ว — อ่านหลายชิ้นต่อวัน",
    medium: "กลาง — อ่านปานกลาง",
    thorough: "ละเอียด — อ่านน้อยชิ้นแต่ทั่วถึง",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold tracking-tight">Habit & Engagement</h1>
            <p className="text-xs text-white/40">Daily streaks · weekly summary · intelligence profile</p>
          </div>
          <Button
            onClick={() => { void refetch(); }}
            variant="ghost"
            size="sm"
            className="text-white/40 hover:text-white gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Streak section */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            Engagement Streak
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Current streak"
              value={data?.streak.currentStreak ?? 0}
              sub={data?.streak.streakActive ? "active" : "inactive"}
              color={data?.streak.streakActive ? "#f97316" : "#4b5563"}
            />
            <StatCard
              label="Longest streak"
              value={data?.streak.longestStreak ?? 0}
              sub="days"
              color="#fbbf24"
            />
            <StatCard
              label="Days active this week"
              value={data?.weekly.totalDaysActive ?? 0}
              sub="/ 7 days"
              color="#60a5fa"
            />
            <StatCard
              label="Engagement score"
              value={data ? `${data.weekly.engagementScore}%` : "—"}
              sub="this week"
              color="#a78bfa"
            />
          </div>
          {data?.streak.milestone && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-orange-300 font-medium">
                Milestone: {data.streak.milestone} streak! ไปต่อได้เลย
              </span>
            </div>
          )}
        </section>

        {/* Weekly summary */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Weekly Summary
          </h2>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-white/40 mb-1">Articles read</p>
                  <p className="text-xl font-bold">{data?.weekly.totalArticlesRead ?? 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 mb-1">Engagement trend</p>
                  <p
                    className="text-xl font-bold capitalize"
                    style={{ color: TREND_COLORS[data?.profile.weeklyEngagementTrend ?? "stable"] }}
                  >
                    {data?.profile.weeklyEngagementTrend ?? "stable"}
                  </p>
                </div>
              </div>
              {data?.weekly.topTopics && data.weekly.topTopics.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/40 mb-2">Top topics this week</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.weekly.topTopics.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-white/8 text-[11px] text-white/60">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Narrative tracking */}
        {data && data.topNarratives.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Narrative Tracking
            </h2>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-2">
                {data.topNarratives.map((n, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] text-white/30 w-5 text-right">{i + 1}</span>
                      <p className="text-sm text-white/70 truncate">{n.narrativeTitle}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[10px] text-white/30">{n.viewCount}x</span>
                      {n.following && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          Following
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-white/25 pt-1">
                  {data.followedNarratives} narrative{data.followedNarratives !== 1 ? "s" : ""} followed
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Intelligence profile */}
        {data && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Intelligence Profile
            </h2>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-white/40 mb-1">Preferred briefing time</p>
                    <p className="text-sm font-medium capitalize">
                      {data.profile.preferredBriefingTime === "morning" ? "Morning" :
                       data.profile.preferredBriefingTime === "evening" ? "Evening" : "Both"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 mb-1">Reading style</p>
                    <p className="text-sm font-medium">
                      {SPEED_LABELS[data.profile.readingSpeed] ?? data.profile.readingSpeed}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 mb-1">Signal sensitivity</p>
                    <p className={`text-sm font-medium capitalize ${
                      data.profile.signalSensitivity === "high" ? "text-emerald-400" :
                      data.profile.signalSensitivity === "low" ? "text-red-400" : "text-white"
                    }`}>
                      {data.profile.signalSensitivity}
                    </p>
                  </div>
                </div>
                {data.profile.dominantTopics.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/40 mb-1.5">Dominant interests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.profile.dominantTopics.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[11px] text-amber-400/70 border border-amber-500/20">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {!data && !isFetching && (
          <div className="text-center py-12 text-white/30">
            <Activity className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No engagement data yet.</p>
            <p className="text-xs mt-1">Start reading briefings to build your streak.</p>
          </div>
        )}

        {/* Quick links */}
        <div className="flex gap-2 pt-2">
          <Link href="/my-feed">
            <Button variant="outline" size="sm" className="border-white/15 text-white/60 hover:text-white gap-2">
              <BookOpen className="w-3.5 h-3.5" />
              Go to My Feed
            </Button>
          </Link>
          <Link href="/insights/export">
            <Button variant="outline" size="sm" className="border-white/15 text-white/60 hover:text-white gap-2">
              <Target className="w-3.5 h-3.5" />
              Export Insight
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

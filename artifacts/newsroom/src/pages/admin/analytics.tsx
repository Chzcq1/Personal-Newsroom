// ============================================================
// DELIVERY ANALYTICS — Sprint 8 Task I
// /admin/analytics
// ============================================================

import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  BarChart3,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface DeliveryRecord {
  id: string;
  type: "morning" | "evening";
  recordedAt: string;
  success: boolean;
  wordCount: number;
  estimatedReadingTimeSecs: number;
  articlesIncluded: number;
  topicsUsed: string[];
  deliveryChannel: string;
  generationTimeMs: number;
  signalHighCount: number;
  signalLowCount: number;
  error?: string;
}

interface AnalyticsResponse {
  stats: {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
    avgWordCount: number;
    avgReadingTimeSecs: number;
    avgArticlesIncluded: number;
    avgGenerationTimeMs: number;
    last7Days: { morning: number; evening: number; failures: number };
  };
  alertStats: {
    totalInLast24h: number;
    totalInLast6h: number;
    lastAlertAt: string | null;
  };
  recentDeliveries: DeliveryRecord[];
  intelligence: {
    activeStories: number;
    topStories: Array<{ slug: string; entity: string; topicId: string; mentionCount: number; lastSeen: string }>;
    trendMemory: Array<{ topicId: string; briefingHeadline: string; headlineCount: number; storedAt: string }>;
  };
  generatedAt: string;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "white",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.FC<{ className?: string }>;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    white: "text-white",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
    blue: "text-blue-400",
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-white/40 mb-1">{label}</p>
            <p className={`text-2xl font-semibold tracking-tight ${colorMap[color] ?? "text-white"}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-white/35 mt-1">{sub}</p>}
          </div>
          <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colorMap[color] ?? "text-white/40"}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function formatSecs(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<"overview" | "deliveries" | "intelligence">("overview");

  const { data, isLoading, error, refetch } = useQuery<AnalyticsResponse>({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin/analytics`);
      if (!r.ok) throw new Error("Failed to load analytics");
      return r.json() as Promise<AnalyticsResponse>;
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Delivery Analytics</h1>
            <p className="text-xs text-white/40">Quality metrics and intelligence signals</p>
          </div>
          <Button
            onClick={() => { void refetch(); }}
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white gap-1.5"
          >
            <Activity className="w-4 h-4" />
            Refresh
          </Button>
        </div>
        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-6 pb-0 flex gap-1">
          {(["overview", "deliveries", "intelligence"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm capitalize border-b-2 transition-colors ${
                tab === t
                  ? "border-white text-white"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Failed to load analytics. The API may not be configured yet.</p>
          </div>
        )}

        {data && tab === "overview" && (
          <div className="space-y-6">
            {/* Core stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total deliveries"
                value={data.stats.totalDeliveries}
                sub="All time"
                icon={Activity}
              />
              <StatCard
                label="Success rate"
                value={`${data.stats.successRate}%`}
                sub={`${data.stats.successfulDeliveries} succeeded`}
                icon={CheckCircle2}
                color={data.stats.successRate >= 90 ? "emerald" : data.stats.successRate >= 70 ? "amber" : "rose"}
              />
              <StatCard
                label="Avg reading time"
                value={formatSecs(data.stats.avgReadingTimeSecs)}
                sub={`~${data.stats.avgWordCount} words`}
                icon={BookOpen}
                color="blue"
              />
              <StatCard
                label="Avg generation"
                value={formatMs(data.stats.avgGenerationTimeMs)}
                sub="AI + collection"
                icon={Clock}
                color="amber"
              />
            </div>

            {/* Last 7 days + alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white/70">Last 7 days</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Morning briefings</span>
                    <span className="text-sm font-mono text-amber-300">{data.stats.last7Days.morning}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Evening recaps</span>
                    <span className="text-sm font-mono text-indigo-300">{data.stats.last7Days.evening}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/8 pt-3">
                    <span className="text-sm text-white/60">Failed deliveries</span>
                    <span className={`text-sm font-mono ${data.stats.last7Days.failures > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {data.stats.last7Days.failures}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Avg articles per digest</span>
                    <span className="text-sm font-mono text-white/80">{data.stats.avgArticlesIncluded}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white/70">Priority alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Last 24 hours</span>
                    <span className={`text-sm font-mono ${data.alertStats.totalInLast24h > 0 ? "text-amber-300" : "text-white/40"}`}>
                      {data.alertStats.totalInLast24h}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Last 6 hours</span>
                    <span className={`text-sm font-mono ${data.alertStats.totalInLast6h > 0 ? "text-amber-300" : "text-white/40"}`}>
                      {data.alertStats.totalInLast6h}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/8 pt-3">
                    <span className="text-sm text-white/60">Last alert</span>
                    <span className="text-sm text-white/50">
                      {data.alertStats.lastAlertAt ? timeAgo(data.alertStats.lastAlertAt) : "None"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-white/30 mt-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Alerts are selective — max 3 per 6h window, 24h entity cooldown</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Signal distribution */}
            {data.recentDeliveries.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Signal quality — last {data.recentDeliveries.length} deliveries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-white/60">High signal:</span>
                      <span className="font-mono text-emerald-300">
                        {data.recentDeliveries.reduce((sum, r) => sum + r.signalHighCount, 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white/20" />
                      <span className="text-white/60">Low signal (filtered):</span>
                      <span className="font-mono text-white/40">
                        {data.recentDeliveries.reduce((sum, r) => sum + r.signalLowCount, 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {data && tab === "deliveries" && (
          <div className="space-y-3">
            {data.recentDeliveries.length === 0 ? (
              <div className="text-center py-16 text-white/30">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No delivery records yet.</p>
                <p className="text-xs mt-1">Records appear after the first scheduled delivery.</p>
              </div>
            ) : (
              data.recentDeliveries.map((r) => (
                <div
                  key={r.id}
                  className={`p-4 rounded-xl border ${r.success ? "bg-white/3 border-white/8" : "bg-rose-500/5 border-rose-500/15"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {r.success
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      }
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium capitalize ${r.type === "morning" ? "text-amber-300" : "text-indigo-300"}`}>
                            {r.type}
                          </span>
                          <span className="text-xs text-white/30">{timeAgo(r.recordedAt)}</span>
                        </div>
                        {r.error && (
                          <p className="text-xs text-rose-300 mt-1">{r.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-white/50 font-mono">{formatMs(r.generationTimeMs)}</p>
                      <p className="text-xs text-white/30">{r.articlesIncluded} articles</p>
                    </div>
                  </div>
                  {r.success && (
                    <div className="mt-2 pl-7 flex gap-4 text-xs text-white/35">
                      <span>{r.wordCount} words</span>
                      <span>{formatSecs(r.estimatedReadingTimeSecs)} read</span>
                      {r.signalHighCount > 0 && <span className="text-emerald-400">{r.signalHighCount} high signal</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {data && tab === "intelligence" && (
          <div className="space-y-6">
            {/* Active stories */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Active story threads
                  <span className="ml-auto text-xs text-white/30 font-normal">{data.intelligence.activeStories} total</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.intelligence.topStories.length === 0 ? (
                  <p className="text-sm text-white/30">No active stories yet. Story evolution builds up after a few deliveries.</p>
                ) : (
                  <div className="space-y-2">
                    {data.intelligence.topStories.map((s) => (
                      <div key={s.slug} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div>
                          <span className="text-sm text-white/80 capitalize">{s.entity}</span>
                          <span className="text-xs text-white/30 ml-2">{s.topicId}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/40">
                          <span>{s.mentionCount} mentions</span>
                          <span>{timeAgo(s.lastSeen)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trend memory */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white/70">Trend memory</CardTitle>
              </CardHeader>
              <CardContent>
                {data.intelligence.trendMemory.length === 0 ? (
                  <p className="text-sm text-white/30">No trend memory yet. Generates automatically during briefings.</p>
                ) : (
                  <div className="space-y-3">
                    {data.intelligence.trendMemory.map((t) => (
                      <div key={t.topicId} className="py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/50 uppercase tracking-wider">{t.topicId}</span>
                          <span className="text-xs text-white/30">{timeAgo(t.storedAt)}</span>
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed">{t.briefingHeadline}</p>
                        <p className="text-xs text-white/30 mt-0.5">{t.headlineCount} headlines stored</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {data && (
          <p className="text-xs text-white/20 text-right mt-8">
            Updated {timeAgo(data.generatedAt)} · refreshes every 60s
          </p>
        )}
      </main>
    </div>
  );
}

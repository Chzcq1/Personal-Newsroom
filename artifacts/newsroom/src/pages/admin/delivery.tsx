// ============================================================
// DELIVERY ANALYTICS V2 — Sprint 12 Task I
// /admin/delivery
//
// Expanded delivery analytics dashboard:
//   - Success rate with trend
//   - Token cost estimates
//   - Retry counts
//   - Narrative density
//   - Signal efficiency
//   - Recovery status
//   - Recent delivery log
// ============================================================

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
  Zap,
  RefreshCw,
  Shield,
  BarChart3,
  Cpu,
  FileText,
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
  tokenStats: {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalEstimatedCostUSD: number;
    avgInputTokensPerRequest: number;
    avgCompressionPercent: number;
    last24hTokens: number;
  };
  recoverySnapshot: {
    heartbeat: {
      serverStartedAt: string;
      lastHeartbeatAt: string;
      uptimeSeconds: number;
      totalHeartbeats: number;
    };
    pendingDigests: number;
    failedDigests: number;
    retryQueueLength: number;
    dueRetries: number;
    overallHealthy: boolean;
  };
  recentDeliveries: DeliveryRecord[];
  signalEfficiency: number;
  narrativeDensity: number;
  retryRate: number;
  generatedAt: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "white",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: "white" | "emerald" | "amber" | "red" | "blue";
}) {
  const textColor =
    color === "emerald" ? "text-emerald-400" :
    color === "amber" ? "text-amber-400" :
    color === "red" ? "text-red-400" :
    color === "blue" ? "text-blue-400" :
    "text-white";

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 text-white/40" />
          <span className="text-xs text-white/40 uppercase tracking-widest">{label}</span>
        </div>
        <p className={`text-2xl font-semibold tabular-nums ${textColor}`}>{value}</p>
        {sub && <p className="text-xs text-white/35 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminDeliveryPage() {
  const { data, isLoading, error, refetch } = useQuery<AnalyticsResponse>({
    queryKey: ["admin-delivery"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/delivery`);
      if (!res.ok) throw new Error("Failed to fetch delivery analytics");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/analytics">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Analytics
              </Button>
            </Link>
            <h1 className="text-lg font-semibold tracking-tight">Delivery Analytics V2</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-white/40 hover:text-white gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            Failed to load analytics. API server may be unavailable.
          </div>
        )}

        {data && (
          <>
            {/* Infrastructure health */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">Infrastructure Health</h2>
              <div className={`p-4 rounded-xl border flex items-center gap-4 ${
                data.recoverySnapshot.overallHealthy
                  ? "bg-emerald-500/8 border-emerald-500/20"
                  : "bg-amber-500/8 border-amber-500/20"
              }`}>
                <Shield className={`w-5 h-5 flex-shrink-0 ${
                  data.recoverySnapshot.overallHealthy ? "text-emerald-400" : "text-amber-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    data.recoverySnapshot.overallHealthy ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {data.recoverySnapshot.overallHealthy ? "All systems healthy" : "Attention required"}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    Uptime {formatUptime(data.recoverySnapshot.heartbeat.uptimeSeconds)}
                    {data.recoverySnapshot.failedDigests > 0 && ` · ${data.recoverySnapshot.failedDigests} failed digest(s)`}
                    {data.recoverySnapshot.retryQueueLength > 0 && ` · ${data.recoverySnapshot.retryQueueLength} in retry queue`}
                  </p>
                </div>
                <div className="text-right text-xs text-white/30">
                  <p>{data.recoverySnapshot.heartbeat.totalHeartbeats} heartbeats</p>
                  <p className="mt-0.5">Started {new Date(data.recoverySnapshot.heartbeat.serverStartedAt).toLocaleTimeString()}</p>
                </div>
              </div>
            </section>

            {/* Core delivery stats */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">Delivery Performance</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Activity}
                  label="Success Rate"
                  value={`${data.stats.successRate}%`}
                  sub={`${data.stats.successfulDeliveries}/${data.stats.totalDeliveries} total`}
                  color={data.stats.successRate >= 90 ? "emerald" : data.stats.successRate >= 70 ? "amber" : "red"}
                />
                <StatCard
                  icon={BookOpen}
                  label="Avg Reading"
                  value={`${Math.round(data.stats.avgReadingTimeSecs / 60)} min`}
                  sub={`${data.stats.avgWordCount} words avg`}
                />
                <StatCard
                  icon={FileText}
                  label="Avg Articles"
                  value={data.stats.avgArticlesIncluded}
                  sub="per briefing"
                />
                <StatCard
                  icon={Clock}
                  label="Avg Gen Time"
                  value={`${(data.stats.avgGenerationTimeMs / 1000).toFixed(1)}s`}
                  sub="AI + collection"
                />
              </div>
            </section>

            {/* Token economy */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">Token Economy</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Cpu}
                  label="Total Input Tokens"
                  value={data.tokenStats.totalInputTokens.toLocaleString()}
                  sub={`${data.tokenStats.totalRequests} requests`}
                />
                <StatCard
                  icon={Zap}
                  label="Avg per Request"
                  value={data.tokenStats.avgInputTokensPerRequest.toLocaleString()}
                  sub="input tokens"
                  color="blue"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Compression"
                  value={`${data.tokenStats.avgCompressionPercent}%`}
                  sub="avg reduction"
                  color="emerald"
                />
                <StatCard
                  icon={BarChart3}
                  label="Est. Cost"
                  value={`$${data.tokenStats.totalEstimatedCostUSD.toFixed(4)}`}
                  sub="OpenAI-equivalent"
                />
              </div>
              <div className="mt-3 p-3 rounded-lg bg-white/3 border border-white/8 text-xs text-white/40">
                Cost estimates use OpenAI GPT-4o-mini pricing as reference ($0.00015/1k input, $0.0006/1k output).
                GitHub Models free tier has no direct cost.
              </div>
            </section>

            {/* Signal & narrative intelligence */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">Signal Intelligence</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={TrendingUp}
                  label="Signal Efficiency"
                  value={`${data.signalEfficiency}%`}
                  sub="high-signal articles"
                  color={data.signalEfficiency >= 60 ? "emerald" : "amber"}
                />
                <StatCard
                  icon={BookOpen}
                  label="Narrative Density"
                  value={data.narrativeDensity}
                  sub="avg articles/briefing"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Priority Alerts"
                  value={data.alertStats.totalInLast24h}
                  sub="last 24h"
                  color={data.alertStats.totalInLast24h > 0 ? "amber" : "white"}
                />
                <StatCard
                  icon={RefreshCw}
                  label="Retry Rate"
                  value={`${data.retryRate}%`}
                  sub="of recent deliveries"
                  color={data.retryRate > 20 ? "red" : "white"}
                />
              </div>
            </section>

            {/* Last 7 days summary */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">Last 7 Days</h2>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-semibold tabular-nums">{data.stats.last7Days.morning}</p>
                      <p className="text-xs text-white/40 mt-1">Morning briefings</p>
                    </div>
                    <div className="text-center border-x border-white/10">
                      <p className="text-2xl font-semibold tabular-nums">{data.stats.last7Days.evening}</p>
                      <p className="text-xs text-white/40 mt-1">Evening recaps</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-semibold tabular-nums ${data.stats.last7Days.failures > 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {data.stats.last7Days.failures}
                      </p>
                      <p className="text-xs text-white/40 mt-1">Failures</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Recent deliveries log */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">Recent Deliveries</h2>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-0">
                  {data.recentDeliveries.length === 0 ? (
                    <p className="text-sm text-white/30 p-5">No deliveries recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {data.recentDeliveries.map((record) => (
                        <div key={record.id} className="flex items-center gap-4 px-5 py-3.5">
                          {record.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium uppercase px-1.5 py-0.5 rounded ${
                                record.type === "morning"
                                  ? "bg-amber-500/15 text-amber-400"
                                  : "bg-blue-500/15 text-blue-400"
                              }`}>
                                {record.type}
                              </span>
                              <span className="text-sm text-white/80">
                                {record.articlesIncluded} articles
                              </span>
                              {record.deliveryChannel !== "none" && record.deliveryChannel !== "pending" && (
                                <span className="text-xs text-white/30">{record.deliveryChannel}</span>
                              )}
                            </div>
                            {record.error && (
                              <p className="text-xs text-red-400/70 mt-0.5 truncate">{record.error}</p>
                            )}
                          </div>
                          <div className="text-right text-xs text-white/30 flex-shrink-0">
                            <p>{Math.round(record.generationTimeMs / 1000)}s gen</p>
                            <p>{new Date(record.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <p className="text-xs text-white/20 text-center">
              Updated {new Date(data.generatedAt).toLocaleTimeString()} · refreshes every 30s
            </p>
          </>
        )}
      </main>
    </div>
  );
}

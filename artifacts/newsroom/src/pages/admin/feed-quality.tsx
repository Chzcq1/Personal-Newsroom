// ============================================================
// FEED QUALITY DASHBOARD — Sprint 9 Task J
//
// Internal quality metrics for feed intelligence.
//
// Displays:
//   • Overall stats (relevance accuracy, clustering, diversity)
//   • Quality trend (improving / stable / degrading)
//   • Recent request log
//   • Relevance class distribution breakdown
// ============================================================

import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Layers,
  Filter,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────

interface FeedQualityStats {
  totalRequests: number;
  avgRelevanceAccuracy: number;
  avgClusteringRate: number;
  avgFeedDiversity: number;
  avgCombinedScore: number;
  avgFilteredCount: number;
  last24hRequests: number;
  qualityTrend: "improving" | "stable" | "degrading";
}

interface FeedQualityRecord {
  id: string;
  recordedAt: string;
  interestCount: number;
  totalArticles: number;
  directCount: number;
  contextualCount: number;
  weakCount: number;
  incidentalCount: number;
  filteredCount: number;
  clusterCount: number;
  clusteringRate: number;
  avgCombinedScore: number;
  uniqueSourceCount: number;
  relevanceAccuracy: number;
  processingTimeMs: number;
}

interface FeedQualityResponse {
  stats: FeedQualityStats;
  recentRecords: FeedQualityRecord[];
  generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: FeedQualityStats["qualityTrend"] }) {
  if (trend === "improving") return (
    <span className="flex items-center gap-1 text-[11px] text-emerald-400">
      <TrendingUp className="w-3.5 h-3.5" /> Improving
    </span>
  );
  if (trend === "degrading") return (
    <span className="flex items-center gap-1 text-[11px] text-red-400/70">
      <TrendingDown className="w-3.5 h-3.5" /> Degrading
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px] text-white/40">
      <Minus className="w-3.5 h-3.5" /> Stable
    </span>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
    </div>
  );
}

function RelevancePie({ direct, contextual, weak, incidental }: {
  direct: number; contextual: number; weak: number; incidental: number;
}) {
  const total = direct + contextual + weak + incidental || 1;
  const pctDirect = Math.round((direct / total) * 100);
  const pctContextual = Math.round((contextual / total) * 100);
  const pctWeak = Math.round((weak / total) * 100);
  const pctIncidental = 100 - pctDirect - pctContextual - pctWeak;

  return (
    <div className="space-y-2">
      {[
        { label: "Direct", pct: pctDirect, color: "bg-emerald-400/70" },
        { label: "Contextual", pct: pctContextual, color: "bg-sky-400/70" },
        { label: "Weak", pct: pctWeak, color: "bg-white/30" },
        { label: "Incidental", pct: Math.max(0, pctIncidental), color: "bg-white/10" },
      ].map(({ label, pct, color }) => (
        <div key={label} className="flex items-center gap-2.5">
          <span className="text-[10px] text-white/40 w-16">{label}</span>
          <MiniBar value={pct} max={100} color={color} />
          <span className="text-[10px] font-medium text-white/50 w-8 text-right">{pct}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function FeedQualityPage() {
  const { data, isLoading, refetch, isFetching } = useQuery<FeedQualityResponse>({
    queryKey: ["feed-quality"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin/feed-quality`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const stats = data?.stats;
  const records = data?.recentRecords ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <Link href="/my-feed">
            <Button variant="ghost" size="sm" className="text-white/50 hover:text-white -ml-2 px-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-sm font-semibold">Feed Quality</h1>
            <p className="text-[10px] text-white/30">Sprint 9 · Internal Metrics</p>
          </div>
          {stats && <TrendBadge trend={stats.qualityTrend} />}
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}
            className="text-white/50 hover:text-white px-2">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-6">

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-4 animate-pulse h-20" />
            ))}
          </div>
        )}

        {stats && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                icon={<Target className="w-4 h-4" />}
                label="Relevance Accuracy"
                value={`${stats.avgRelevanceAccuracy}%`}
                subtext={stats.avgRelevanceAccuracy >= 70 ? "Good" : "Needs improvement"}
                highlight={stats.avgRelevanceAccuracy >= 70}
              />
              <StatCard
                icon={<Layers className="w-4 h-4" />}
                label="Clustering Rate"
                value={`${stats.avgClusteringRate}%`}
                subtext="Stories clustered"
              />
              <StatCard
                icon={<BarChart3 className="w-4 h-4" />}
                label="Feed Diversity"
                value={`${stats.avgFeedDiversity}%`}
                subtext="Unique sources"
              />
              <StatCard
                icon={<Filter className="w-4 h-4" />}
                label="Filtered/Request"
                value={`${stats.avgFilteredCount}`}
                subtext="Low-quality removed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Request activity */}
              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">Activity</p>
                <div className="space-y-2.5">
                  <MetricRow label="Total requests" value={stats.totalRequests} />
                  <MetricRow label="Last 24h" value={stats.last24hRequests} />
                  <MetricRow label="Avg combined score" value={stats.avgCombinedScore} />
                </div>
              </div>

              {/* Relevance distribution (aggregated) */}
              {records.length > 0 && (
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">Relevance Distribution</p>
                  <RelevancePie
                    direct={records.reduce((s, r) => s + r.directCount, 0)}
                    contextual={records.reduce((s, r) => s + r.contextualCount, 0)}
                    weak={records.reduce((s, r) => s + r.weakCount, 0)}
                    incidental={records.reduce((s, r) => s + r.incidentalCount, 0)}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Recent requests log */}
        {records.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Recent Requests</p>
            <div className="space-y-1.5">
              {records.slice(0, 20).map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-white/5 text-[10px]">
                  <span className="text-white/25 w-32 flex-shrink-0">
                    {format(new Date(r.recordedAt), "MMM d HH:mm:ss")}
                  </span>
                  <span className={`w-8 font-medium ${r.relevanceAccuracy >= 70 ? "text-emerald-400/70" : "text-white/40"}`}>
                    {r.relevanceAccuracy}%
                  </span>
                  <span className="text-white/25">{r.totalArticles} arts</span>
                  <span className="text-emerald-400/50">{r.directCount}D</span>
                  <span className="text-sky-400/50">{r.contextualCount}C</span>
                  <span className="text-white/30">{r.weakCount}W</span>
                  <span className="text-sky-400/30">{r.clusterCount} clust</span>
                  <span className="text-red-400/40">{r.filteredCount} filt</span>
                  <span className="text-white/20 ml-auto">{r.processingTimeMs}ms</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-white/15 mt-2">D=Direct · C=Contextual · W=Weak · clust=Clusters · filt=Filtered</p>
          </div>
        )}

        {stats?.totalRequests === 0 && !isLoading && (
          <div className="text-center py-16">
            <BarChart3 className="w-8 h-8 mx-auto mb-3 text-white/15" />
            <p className="text-sm text-white/30">No data yet.</p>
            <p className="text-xs text-white/20 mt-1">Load your feed a few times to populate metrics.</p>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StatCard({ icon, label, value, subtext, highlight = false }: {
  icon: React.ReactNode; label: string; value: string; subtext?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/8 bg-white/[0.02]"}`}>
      <div className={`flex items-center gap-2 mb-2 ${highlight ? "text-emerald-400/60" : "text-white/25"}`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-bold ${highlight ? "text-emerald-400/90" : "text-white/70"}`}>{value}</p>
      {subtext && <p className="text-[10px] text-white/25 mt-0.5">{subtext}</p>}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className="text-[11px] font-medium text-white/60">{value}</span>
    </div>
  );
}

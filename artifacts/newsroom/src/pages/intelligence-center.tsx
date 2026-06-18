// ============================================================
// INTELLIGENCE CENTER — Sprint 19 Task B
// Unified analytics hub replacing 7 separate admin pages:
//   admin/analytics, admin/delivery, admin/feed-quality,
//   admin/system-intelligence, admin/source-trust,
//   settings/intelligence-score, admin/habit
// ============================================================

import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Activity, Clock, CheckCircle2, XCircle,
  TrendingUp, BarChart3, Zap, Brain, Shield, Database,
  Flame, Radio, BookOpen, AlertTriangle, RefreshCw,
  Star, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
type Section = "intelligence" | "delivery" | "sources" | "tokens" | "system";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmtMs(ms: number) { return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`; }
function fmtSecs(s: number) { return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; }

function MetricCard({ label, value, sub, color = "white", icon: Icon }: {
  label: string; value: string | number; sub?: string;
  color?: "white" | "emerald" | "amber" | "rose" | "blue" | "violet";
  icon: React.FC<{ className?: string }>;
}) {
  const c: Record<string, string> = {
    white: "text-white", emerald: "text-emerald-400", amber: "text-amber-400",
    rose: "text-rose-400", blue: "text-blue-400", violet: "text-violet-400",
  };
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-white/40 mb-1">{label}</p>
            <p className={`text-2xl font-semibold tracking-tight ${c[color]}`}>{value}</p>
            {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
          </div>
          <Icon className={`w-4 h-4 flex-shrink-0 mt-1 ${c[color]}`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Intelligence Section ──────────────────────────────────────

interface IntelligenceData {
  compound: {
    estimatedHoursSaved: number;
    estimatedMinutesSaved: number;
    signalAccuracyRate: number;
    noiseFilteredCount: number;
    noiseFilteredPercent: number;
    alertsDelivered: number;
    narrativesFollowed: number;
    highValueReads: number;
    totalBriefings: number;
    compoundInsight: string;
    periodDays: number;
  };
  weekly: {
    daily: Array<{ date: string; briefings: number; minutesSaved: number; noiseFiltered: number }>;
  };
}

function IntelligenceSection() {
  const { data, isLoading, error } = useQuery<IntelligenceData>({
    queryKey: ["ic-intelligence"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/analytics/compound`);
      if (!r.ok) throw new Error("Not available");
      return r.json() as Promise<IntelligenceData>;
    },
    retry: 1,
  });

  if (isLoading) return <SkeletonGrid />;
  if (error || !data) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Time Saved" value="—" sub="start reading to track" icon={Clock} color="amber" />
        <MetricCard label="Briefings" value="0" sub="all time" icon={BookOpen} color="blue" />
        <MetricCard label="Noise Filtered" value="—" sub="signal accuracy" icon={Filter} />
      </div>
      <p className="text-xs text-white/30 text-center">Compound rate builds up after your first few briefings.</p>
    </div>
  );

  const c = data.compound;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Time Saved" value={`${c.estimatedMinutesSaved}m`} sub={`${c.periodDays}-day window`} icon={Clock} color="amber" />
        <MetricCard label="Signal Accuracy" value={`${c.signalAccuracyRate}%`} sub="noise filtered" icon={TrendingUp} color="emerald" />
        <MetricCard label="Briefings" value={c.totalBriefings} sub="total delivered" icon={BookOpen} color="blue" />
        <MetricCard label="Noise Filtered" value={c.noiseFilteredCount} sub={`${c.noiseFilteredPercent}% blocked`} icon={Filter} />
        <MetricCard label="High-Value Reads" value={c.highValueReads} sub="signal stories" icon={Star} color="violet" />
        <MetricCard label="Alerts Delivered" value={c.alertsDelivered} sub="priority signals" icon={Zap} color="rose" />
      </div>
      {c.compoundInsight && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Compound Insight</p>
          <p className="text-sm text-white/80 leading-relaxed">{c.compoundInsight}</p>
        </div>
      )}
    </div>
  );
}

// ── Delivery Section ──────────────────────────────────────────

interface AnalyticsSnapshot {
  ok: boolean;
  snapshot: {
    users: { total: number; dau: number; wau: number; mau: number };
    deliveries: {
      total: number; delivered: number; failed: number;
      successRate: number; queuePending: number; queueFailed: number;
    };
    events: {
      last24h: { total: number; byType: Record<string, number> };
      last7d: { total: number; byType: Record<string, number> };
    };
    generatedAt: string;
  };
}

interface AlertsData {
  ok: boolean;
  alerts: Array<{ severity: "critical" | "warning" | "info"; message: string; metric: string }>;
  count: number;
  generatedAt: string;
}

function DeliverySection() {
  const { data, isLoading, error, refetch } = useQuery<AnalyticsSnapshot>({
    queryKey: ["ic-analytics"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin/analytics`);
      if (!r.ok) throw new Error("Not available");
      return r.json() as Promise<AnalyticsSnapshot>;
    },
    refetchInterval: 60_000,
  });

  const { data: alertsData } = useQuery<AlertsData>({
    queryKey: ["ic-alerts"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin/analytics/alerts`);
      if (!r.ok) throw new Error("Not available");
      return r.json() as Promise<AlertsData>;
    },
    refetchInterval: 60_000,
  });

  if (isLoading) return <SkeletonGrid />;
  if (error || !data?.snapshot) return <EmptyState label="ข้อมูลการส่งจะปรากฏหลังจากมีการส่งสรุปข่าวครั้งแรก" />;

  const d = data.snapshot.deliveries;
  const alerts = alertsData?.alerts ?? [];
  const criticalAlerts = alerts.filter((a) => a.severity === "critical" || a.severity === "warning");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="การส่งทั้งหมด" value={d.total} icon={Activity} />
        <MetricCard label="อัตราสำเร็จ" value={`${d.successRate}%`}
          color={d.successRate >= 90 ? "emerald" : d.successRate >= 70 ? "amber" : "rose"}
          sub={`${d.delivered} สำเร็จ`} icon={CheckCircle2} />
        <MetricCard label="คิวรอส่ง" value={d.queuePending} sub="รายการ" icon={Clock} color="blue" />
        <MetricCard label="ส่งล้มเหลว" value={d.failed}
          color={d.failed > 0 ? "rose" : "emerald"}
          sub={d.queueFailed > 0 ? `${d.queueFailed} ค้างในคิว` : "ไม่มีข้อผิดพลาด"} icon={XCircle} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-white/50 uppercase tracking-wider">สถิติการส่ง</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { label: "ส่งสำเร็จ", val: d.delivered, color: "text-emerald-400" },
              { label: "ส่งล้มเหลว", val: d.failed, color: d.failed > 0 ? "text-rose-400" : "text-white/40" },
              { label: "คิวรอดำเนินการ", val: d.queuePending, color: "text-amber-300" },
              { label: "คิวที่ล้มเหลว", val: d.queueFailed, color: d.queueFailed > 0 ? "text-rose-400" : "text-white/40" },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-white/50">{label}</span>
                <span className={`text-sm font-mono ${color}`}>{val}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-white/50 uppercase tracking-wider">การแจ้งเตือนระบบ</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {criticalAlerts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>ระบบทำงานปกติ</span>
              </div>
            ) : (
              criticalAlerts.slice(0, 3).map((a, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs ${a.severity === "critical" ? "text-rose-400" : "text-amber-400"}`}>
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{a.message}</span>
                </div>
              ))
            )}
            <div className="flex items-center justify-between border-t border-white/8 pt-2">
              <span className="text-sm text-white/50">อัปเดตล่าสุด</span>
              <span className="text-sm text-white/40">{data.snapshot.generatedAt ? timeAgo(data.snapshot.generatedAt) : "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { void refetch(); }} variant="ghost" size="sm"
          className="text-white/40 hover:text-white/70 gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>
    </div>
  );
}

// ── Sources Section ───────────────────────────────────────────

interface SourceTrustData {
  totalSources: number;
  avgTrustScore: number;
  distribution: Array<{ class: string; count: number }>;
  sources: Array<{
    sourceId: string; displayName: string; trustScore: number;
    stabilityClass: string; totalArticles: number; clickbaitFlags: number;
  }>;
}

function SourcesSection() {
  const { data, isLoading, error } = useQuery<SourceTrustData>({
    queryKey: ["ic-sources"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin/source-trust`);
      if (!r.ok) throw new Error("Not available");
      return r.json() as Promise<SourceTrustData>;
    },
  });

  const stabilityColors: Record<string, string> = {
    tier_one: "text-emerald-400 bg-emerald-400/10",
    reliable: "text-blue-400 bg-blue-400/10",
    mixed: "text-amber-400 bg-amber-400/10",
    unreliable: "text-orange-400 bg-orange-400/10",
    toxic: "text-red-400 bg-red-400/10",
  };

  if (isLoading) return <SkeletonGrid />;
  if (error || !data) return <EmptyState label="Source trust profiles build up as articles are processed." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Sources Tracked" value={data.totalSources} icon={Database} />
        <MetricCard label="Avg Trust Score" value={`${data.avgTrustScore}/100`}
          color={data.avgTrustScore >= 70 ? "emerald" : data.avgTrustScore >= 50 ? "amber" : "rose"}
          icon={Shield} />
      </div>

      {data.sources.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-white/40 uppercase tracking-wider">Source Profiles</p>
          {data.sources.slice(0, 10).map((s) => (
            <div key={s.sourceId} className="flex items-center justify-between p-3.5 bg-white/4 border border-white/8 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${stabilityColors[s.stabilityClass] ?? "text-white/40 bg-white/5"}`}>
                  {s.stabilityClass.replace("_", " ")}
                </div>
                <span className="text-sm text-white/80 truncate">{s.displayName || s.sourceId}</span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 text-xs text-white/40">
                <span className={`font-mono ${s.trustScore >= 70 ? "text-emerald-400" : s.trustScore >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                  {s.trustScore}
                </span>
                <span>{s.totalArticles} art.</span>
                {s.clickbaitFlags > 0 && <span className="text-orange-400">{s.clickbaitFlags} flags</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState label="Source profiles appear after briefings are generated." />
      )}
    </div>
  );
}

// ── Token Economy Section ─────────────────────────────────────

interface EconomicsData {
  periodDays: number;
  estimatedCostUSD: number;
  totalTokensUsed: number;
  avgTokensPerBriefing: number;
  totalBriefings: number;
  tokensByProvider: Array<{ provider: string; tokens: number; cost: number }>;
  costTrend: Array<{ date: string; tokens: number; cost: number }>;
  projections: { monthly: number; annual: number };
}

function TokensSection() {
  const { data, isLoading, error } = useQuery<EconomicsData>({
    queryKey: ["ic-tokens"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin/economics`);
      if (!r.ok) throw new Error("Not available");
      return r.json() as Promise<EconomicsData>;
    },
  });

  if (isLoading) return <SkeletonGrid />;
  if (error || !data) return <EmptyState label="Token usage data appears after briefings are generated." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Tokens" value={data.totalTokensUsed.toLocaleString()} sub={`${data.periodDays}-day period`} icon={Zap} color="amber" />
        <MetricCard label="Est. Cost" value={`$${data.estimatedCostUSD.toFixed(4)}`} sub="this period" icon={BarChart3} color="emerald" />
        <MetricCard label="Avg / Briefing" value={data.avgTokensPerBriefing.toLocaleString()} sub="tokens" icon={Brain} />
        <MetricCard label="Monthly Proj." value={`$${data.projections.monthly.toFixed(3)}`} icon={TrendingUp} color="blue" />
      </div>

      {data.tokensByProvider.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-white/50 uppercase tracking-wider">By Provider</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {data.tokensByProvider.map((p) => (
              <div key={p.provider} className="flex items-center justify-between">
                <span className="text-sm text-white/60 capitalize">{p.provider}</span>
                <div className="flex items-center gap-4 text-sm font-mono">
                  <span className="text-white/50">{p.tokens.toLocaleString()}</span>
                  <span className="text-amber-400">${p.cost.toFixed(5)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="p-4 bg-white/3 border border-white/8 rounded-xl">
        <p className="text-xs text-white/40 mb-2">Annual projection at current rate</p>
        <p className="text-xl font-semibold text-white/80">${data.projections.annual.toFixed(2)} / year</p>
        <p className="text-xs text-white/30 mt-1">Based on {data.totalBriefings} briefings over {data.periodDays} days</p>
      </div>
    </div>
  );
}

// ── System Section ────────────────────────────────────────────

interface SystemData {
  sprint18?: {
    systems: {
      thaiLocalization: { status: string; avgThaiRatio: number };
      sourceTrust: { status: string; totalSources: number };
      tokenSurvival: { status: string; mode: string; estimatedTokensSaved: number };
      signalMemory: { status: string; health: string; totalNarratives: number };
      byok: { status: string };
      platforms: { status: string; enabledAdapters: number; totalAdapters: number };
      deployment: { status: string; score: number };
    };
  };
  signalMode?: { current: string; label: string; riskLevel: string };
  narratives?: { stats: { total: number; active: number; emerging: number } };
  entities?: { totalTracked: number };
  delivery?: { total: number; successful: number; successRate: number };
}

function SystemSection() {
  const { data: sprint18 } = useQuery({
    queryKey: ["ic-sprint18"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin/sprint18`);
      if (!r.ok) return null;
      return r.json() as Promise<{ ok: boolean; systems: SystemData["sprint18"] extends object ? SystemData["sprint18"]["systems"] : never }>;
    },
    retry: 1,
  });

  const { data: sysIntel } = useQuery({
    queryKey: ["ic-system"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin/system-intelligence`);
      if (!r.ok) return null;
      return r.json() as Promise<SystemData>;
    },
    retry: 1,
  });

  const statusDot = (s: string) => s === "active" || s === "production_ready" || s === "healthy"
    ? "bg-emerald-400" : s === "architecture_ready" ? "bg-blue-400" : "bg-white/20";

  return (
    <div className="space-y-6">
      {sprint18?.systems && (
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">System Status</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(sprint18.systems).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2.5 p-3 bg-white/4 border border-white/8 rounded-xl">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot((val as Record<string, string>).status ?? (val as Record<string, string>).health ?? "")}`} />
                <div className="min-w-0">
                  <p className="text-xs text-white/60 capitalize truncate">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p className="text-[10px] text-white/30 capitalize truncate">
                    {(val as Record<string, string>).status ?? (val as Record<string, string>).health}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sysIntel?.signalMode && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">Intelligence Pipeline</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Signal Mode</span>
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-sm text-white/80 capitalize">{sysIntel.signalMode.label}</span>
              </div>
            </div>
            {sysIntel.narratives && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Active Narratives</span>
                <span className="text-sm font-mono text-white/70">{sysIntel.narratives.stats.active}</span>
              </div>
            )}
            {sysIntel.entities && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Entities Tracked</span>
                <span className="text-sm font-mono text-white/70">{sysIntel.entities.totalTracked}</span>
              </div>
            )}
            {sysIntel.delivery && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Delivery Success Rate</span>
                <span className={`text-sm font-mono ${sysIntel.delivery.successRate >= 90 ? "text-emerald-400" : "text-amber-400"}`}>
                  {sysIntel.delivery.successRate}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <Link href="/admin/economics">
          <Button variant="outline" size="sm" className="border-white/15 text-white/60 hover:text-white text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Token Economics
          </Button>
        </Link>
        <Link href="/admin/efficiency">
          <Button variant="outline" size="sm" className="border-white/15 text-white/60 hover:text-white text-xs gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Efficiency Admin
          </Button>
        </Link>
        <Link href="/admin/debug">
          <Button variant="outline" size="sm" className="border-white/15 text-white/60 hover:text-white text-xs gap-1.5">
            <Brain className="w-3.5 h-3.5" />
            Debug Tools
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Shared Helpers ────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 bg-white/5 border border-white/8 rounded-xl skeleton-shimmer" />
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-12 text-center">
      <BarChart3 className="w-8 h-8 mx-auto mb-3 text-white/15" />
      <p className="text-sm text-white/30">{label}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

const SECTIONS: { id: Section; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "intelligence", label: "Intelligence", icon: Brain },
  { id: "delivery", label: "Delivery", icon: Activity },
  { id: "sources", label: "Sources", icon: Shield },
  { id: "tokens", label: "Tokens", icon: Zap },
  { id: "system", label: "System", icon: Database },
];

export default function IntelligenceCenterPage() {
  const [active, setActive] = useState<Section>("intelligence");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              กลับ
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">ศูนย์ข่าวกรอง</h1>
            <p className="text-xs text-white/40">Analytics, sources, tokens, and system health</p>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 flex gap-0 overflow-x-auto">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActive(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active === id ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/70"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {active === "intelligence" && <IntelligenceSection />}
        {active === "delivery" && <DeliverySection />}
        {active === "sources" && <SourcesSection />}
        {active === "tokens" && <TokensSection />}
        {active === "system" && <SystemSection />}
      </main>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, Activity, Brain, TrendingUp, BarChart3,
  Shield, Zap, Database, Radio, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SystemIntelligenceData {
  generatedAt: string;
  signalMode: { current: string; label: string; riskLevel: string };
  narratives: {
    top: Array<{
      id: string; headline: string; maturity: string;
      mentionCount: number; score: number; entitiesInvolved: string[];
    }>;
    stats: { total: number; active: number; emerging: number; peaking: number; resolved: number };
  };
  entities: {
    top: Array<{
      entityId: string; label: string;
      mentions24h: number; mentions7d: number; trendDirection: string;
    }>;
    totalTracked: number;
  };
  signalQuality: {
    signalNoiseRatio: number;
    activeNarrativeCount: number;
    noisyNarrativeCount: number;
    confidenceDistribution: Array<{ class: string; label: string; count: number }>;
  };
  delivery: { total: number; successful: number; failed: number; successRate: number };
  tokens: {
    estimatedDailyBriefings: number;
    avgTokensPerBriefing: number;
    estimatedDailyTokens: number;
    provider: string;
  };
  adaptation: {
    topBoostedEntities: Array<{ entityId: string; boostMultiplier: number; engagements: number }>;
    topSuppressedEntities: Array<{ entityId: string; boostMultiplier: number; ignores: number }>;
    expansionClusters: number;
  };
}

const MATURITY_COLORS: Record<string, string> = {
  emerging:  "text-amber-400 bg-amber-400/10",
  active:    "text-blue-400 bg-blue-400/10",
  peaking:   "text-violet-400 bg-violet-400/10",
  declining: "text-white/40 bg-white/5",
  resolved:  "text-zinc-500 bg-zinc-500/10",
};

const TREND_ICONS: Record<string, string> = {
  rising:   "↑",
  stable:   "→",
  declining: "↓",
};

const RISK_COLORS: Record<string, string> = {
  low:      "text-emerald-400 bg-emerald-400/10",
  moderate: "text-blue-400 bg-blue-400/10",
  high:     "text-amber-400 bg-amber-400/10",
};

function StatCard({ label, value, sub, icon: Icon, accent = "white" }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>; accent?: string;
}) {
  const accents: Record<string, string> = {
    white:  "text-white/80",
    blue:   "text-blue-400",
    emerald: "text-emerald-400",
    amber:  "text-amber-400",
    violet: "text-violet-400",
  };
  return (
    <div className="bg-white/4 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${accents[accent] ?? accents.white}`} />
        <p className="text-xs text-white/50 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-semibold tabular-nums ${accents[accent] ?? accents.white}`}>{value}</p>
      {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SystemIntelligencePage() {
  const { data, isLoading, error } = useQuery<SystemIntelligenceData>({
    queryKey: ["system-intelligence"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/admin/system-intelligence`);
      if (!res.ok) throw new Error("Failed to fetch system intelligence");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const updated = data ? new Date(data.generatedAt).toLocaleTimeString("th-TH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  }) : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <h1 className="text-lg font-semibold tracking-tight">System Intelligence</h1>
            {updated && (
              <span className="text-xs text-white/30">Updated {updated} ICT</span>
            )}
          </div>
          {data && (
            <span className={`text-xs px-2.5 py-1 rounded-full ${RISK_COLORS[data.signalMode.riskLevel]}`}>
              {data.signalMode.label}
            </span>
          )}
          <Link href="/admin/efficiency">
            <Button variant="ghost" size="sm" className="text-white/40 hover:text-white text-xs gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Efficiency
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Failed to load system intelligence data. Check API server logs.</p>
          </div>
        )}

        {data && (
          <div className="space-y-8">

            {/* Overview stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Signal / Noise"
                value={`${data.signalQuality.signalNoiseRatio}%`}
                sub={`${data.signalQuality.activeNarrativeCount} active signals`}
                icon={Radio}
                accent="blue"
              />
              <StatCard
                label="Active Narratives"
                value={data.narratives.stats.active + data.narratives.stats.peaking}
                sub={`${data.narratives.stats.total} total tracked`}
                icon={Brain}
                accent="violet"
              />
              <StatCard
                label="Delivery Success"
                value={`${data.delivery.successRate}%`}
                sub={`${data.delivery.successful}/${data.delivery.total} sent`}
                icon={Activity}
                accent="emerald"
              />
              <StatCard
                label="Entities Tracked"
                value={data.entities.totalTracked}
                sub={`${data.entities.top.filter((e) => e.trendDirection === "rising").length} rising`}
                icon={Database}
                accent="amber"
              />
            </div>

            {/* Top narratives */}
            <Card className="bg-white/3 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" />
                  Top Narratives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.narratives.top.length === 0 && (
                  <p className="text-sm text-white/30 py-4 text-center">No active narratives yet</p>
                )}
                {data.narratives.top.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${MATURITY_COLORS[n.maturity] ?? "text-white/40 bg-white/5"}`}>
                      {n.maturity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90 leading-snug truncate">{n.headline}</p>
                      {n.entitiesInvolved.length > 0 && (
                        <p className="text-xs text-white/40 mt-0.5">
                          {n.entitiesInvolved.slice(0, 3).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-white/60 tabular-nums">{n.mentionCount} mentions</p>
                      <p className="text-xs text-white/30">score {n.score}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Top accelerating entities */}
              <Card className="bg-white/3 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    Top Accelerating Entities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {data.entities.top.length === 0 && (
                    <p className="text-sm text-white/30 py-4 text-center">No entities tracked yet</p>
                  )}
                  {data.entities.top.map((e, i) => (
                    <div key={e.entityId} className="flex items-center gap-3 py-1.5">
                      <span className="text-xs text-white/20 w-5 tabular-nums">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{e.label || e.entityId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40 tabular-nums">{e.mentions24h}×</span>
                        <span className={`text-xs ${
                          e.trendDirection === "rising" ? "text-emerald-400" :
                          e.trendDirection === "declining" ? "text-red-400" : "text-white/30"
                        }`}>
                          {TREND_ICONS[e.trendDirection] ?? "→"}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Narrative maturity distribution */}
              <Card className="bg-white/3 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    Narrative Maturity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(["emerging", "active", "peaking", "declining", "resolved"] as const).map((stage) => {
                    const count = data.narratives.stats[stage as keyof typeof data.narratives.stats] ?? 0;
                    const total = data.narratives.stats.total || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={stage}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${MATURITY_COLORS[stage] ?? "text-white/40"}`}>
                            {stage}
                          </span>
                          <span className="text-xs text-white/40 tabular-nums">{count}</span>
                        </div>
                        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white/20 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Token economy */}
              <Card className="bg-white/3 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    AI Token Consumption
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-white/50">Provider</span>
                    <span className="text-xs text-white/80 font-mono uppercase">{data.tokens.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-white/50">Avg tokens / briefing</span>
                    <span className="text-xs text-white/80 tabular-nums">{data.tokens.avgTokensPerBriefing.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-white/50">Est. daily tokens</span>
                    <span className="text-xs text-white/80 tabular-nums">{data.tokens.estimatedDailyTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-white/50">Briefings today</span>
                    <span className="text-xs text-white/80 tabular-nums">{data.tokens.estimatedDailyBriefings}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Adaptation signals */}
              <Card className="bg-white/3 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Intelligence Adaptation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Top Boosted</p>
                    {data.adaptation.topBoostedEntities.length === 0 ? (
                      <p className="text-xs text-white/30">No boost signals yet</p>
                    ) : (
                      data.adaptation.topBoostedEntities.map((e) => (
                        <div key={e.entityId} className="flex justify-between py-1">
                          <span className="text-xs text-white/70">{e.entityId}</span>
                          <span className="text-xs text-emerald-400 tabular-nums">×{e.boostMultiplier.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-white/8 pt-3">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Top Suppressed</p>
                    {data.adaptation.topSuppressedEntities.length === 0 ? (
                      <p className="text-xs text-white/30">No suppression signals yet</p>
                    ) : (
                      data.adaptation.topSuppressedEntities.map((e) => (
                        <div key={e.entityId} className="flex justify-between py-1">
                          <span className="text-xs text-white/70">{e.entityId}</span>
                          <span className="text-xs text-red-400 tabular-nums">×{e.boostMultiplier.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-white/8 pt-3 flex justify-between">
                    <span className="text-xs text-white/50">Expansion clusters</span>
                    <span className="text-xs text-white/80 tabular-nums">{data.adaptation.expansionClusters}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

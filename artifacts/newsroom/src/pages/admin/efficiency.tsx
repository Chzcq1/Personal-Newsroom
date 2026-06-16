import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, AlertTriangle, Gauge, Coins, Database,
  Radio, Server, Cpu, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// ── API shapes ─────────────────────────────────────────────────

interface DegradationData {
  level: number;
  config: { label: string; description: string; allowPremiumLLM: boolean; maxArticlesPerBriefing: number; summaryMaxChars: number };
  manualOverride: boolean;
  reason: string;
  activatedAt: string | null;
  recentHistory: Array<{ level: number; reason: string; changedAt: string }>;
  allLevels: Array<{ level: number; label: string; description: string }>;
}

interface TokenGovernorData {
  dailyUsed: number;
  dailyBudget: number;
  premiumUsed: number;
  premiumBudget: number;
  sessionUsed: number;
  sessionBudget: number;
  budgetFraction: number;
  premiumFraction: number;
  pressureLevel: string;
  budgetExhausted: boolean;
  resetAt: string;
  topFeatures: Array<{ feature: string; tokens: number }>;
  topNarratives: Array<{ narrativeId: string; tokens: number }>;
}

interface CacheData {
  stats: {
    totalEntries: number;
    hits: number;
    misses: number;
    staleHits: number;
    evictions: number;
    hitRatio: number;
    byType: Record<string, { entries: number; hits: number; misses: number }>;
  };
}

interface SourcesData {
  adapters: Array<{ id: string; displayName: string; tier: string; isEnabled: boolean; health: { ok: boolean; latencyMs: number; reason?: string } }>;
  totalEnabled: number;
  totalHealthy: number;
}

interface RuntimeData {
  stats: { uptimeSince: string; sleepCount: number; estimatedSleepGapMs: number; p0ServicesAtRisk: string[] };
  migrationPlan: Array<{ phase: string; priority: string; services: Array<{ serviceId: string; displayName: string; sleepSafety: string; persistenceRequirement: string; migrationTarget: string; priority: string }>; targetPlatform: string }>;
}

// ── Helpers ────────────────────────────────────────────────────

const LEVEL_COLORS: Record<number, string> = {
  0: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  1: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  2: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  3: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  4: "text-red-400 bg-red-400/10 border-red-400/20",
};

const PRESSURE_COLORS: Record<string, string> = {
  normal:   "text-emerald-400",
  moderate: "text-blue-400",
  high:     "text-amber-400",
  critical: "text-orange-400",
  exhausted: "text-red-400",
};

const SLEEP_COLORS: Record<string, string> = {
  safe:     "text-emerald-400",
  degrades: "text-amber-400",
  breaks:   "text-red-400",
};

function pct(n: number): string { return `${Math.round(n * 100)}%`; }
function fmt(n: number): string { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

function Bar({ fraction, accent = "blue" }: { fraction: number; accent?: string }) {
  const colors: Record<string, string> = { blue: "bg-blue-500", amber: "bg-amber-500", emerald: "bg-emerald-500", red: "bg-red-500" };
  const pctVal = Math.min(100, Math.round(fraction * 100));
  const barColor = pctVal > 90 ? colors.red : pctVal > 75 ? colors.amber : colors[accent] ?? colors.blue;
  return (
    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pctVal}%` }} />
    </div>
  );
}

// ── Degradation panel ──────────────────────────────────────────

function DegradationPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<DegradationData>({
    queryKey: ["admin-degradation"],
    queryFn: async () => {
      const r = await fetch(`${import.meta.env.BASE_URL}api/admin/degradation`);
      if (!r.ok) throw new Error("fetch failed");
      return r.json();
    },
    refetchInterval: 20_000,
  });

  const setLevel = useMutation({
    mutationFn: async ({ level, reason }: { level: number; reason: string }) => {
      const r = await fetch(`${import.meta.env.BASE_URL}api/admin/degradation`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, reason }),
      });
      if (!r.ok) throw new Error("set failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-degradation"] }),
  });

  const clearOverride = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${import.meta.env.BASE_URL}api/admin/degradation`, { method: "DELETE" });
      if (!r.ok) throw new Error("clear failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-degradation"] }),
  });

  if (isLoading || !data) return <LoadingCard label="Degradation" />;

  const levelColor = LEVEL_COLORS[data.level] ?? "text-white";

  return (
    <Card className="bg-white/4 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-amber-400" />
          Degradation Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current level */}
        <div className={`flex items-center justify-between rounded-xl border p-4 ${levelColor}`}>
          <div>
            <p className="text-lg font-semibold">Level {data.level} — {data.config.label}</p>
            <p className="text-xs mt-0.5 opacity-70">{data.config.description}</p>
          </div>
          {data.manualOverride && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/20">Manual</span>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2 text-xs text-white/60">
          <div className="bg-white/4 rounded-lg p-2.5">
            <p className="text-white/40 mb-0.5">Max articles</p>
            <p className="text-white font-medium">{data.config.maxArticlesPerBriefing}</p>
          </div>
          <div className="bg-white/4 rounded-lg p-2.5">
            <p className="text-white/40 mb-0.5">Summary chars</p>
            <p className="text-white font-medium">{fmt(data.config.summaryMaxChars)}</p>
          </div>
        </div>

        {/* Manual controls */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Manual Override</p>
          <div className="flex flex-wrap gap-1.5">
            {data.allLevels.map((l) => (
              <button
                key={l.level}
                onClick={() => setLevel.mutate({ level: l.level, reason: `Admin override to Level ${l.level}` })}
                disabled={setLevel.isPending}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${data.level === l.level ? LEVEL_COLORS[l.level] : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"}`}
              >
                L{l.level}
              </button>
            ))}
            {data.manualOverride && (
              <button
                onClick={() => clearOverride.mutate()}
                disabled={clearOverride.isPending}
                className="text-xs px-2.5 py-1 rounded-lg border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-all"
              >
                Clear override
              </button>
            )}
          </div>
        </div>

        {/* Recent history */}
        {data.recentHistory.length > 0 && (
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Recent changes</p>
            <div className="space-y-1">
              {data.recentHistory.slice(0, 4).map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                  <span className={`font-medium ${LEVEL_COLORS[h.level]?.split(" ")[0] ?? ""}`}>L{h.level}</span>
                  <span className="flex-1 truncate">{h.reason}</span>
                  <span className="text-white/30 shrink-0">{new Date(h.changedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Token Governor panel ───────────────────────────────────────

function TokenGovernorPanel() {
  const { data, isLoading } = useQuery<TokenGovernorData>({
    queryKey: ["admin-token-governor"],
    queryFn: async () => {
      const r = await fetch(`${import.meta.env.BASE_URL}api/admin/token-governor`);
      if (!r.ok) throw new Error("fetch failed");
      return r.json();
    },
    refetchInterval: 15_000,
  });

  if (isLoading || !data) return <LoadingCard label="Token Governor" />;

  const pressureColor = PRESSURE_COLORS[data.pressureLevel] ?? "text-white";

  return (
    <Card className="bg-white/4 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
          <Coins className="w-4 h-4 text-violet-400" />
          Token Governor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold capitalize ${pressureColor}`}>{data.pressureLevel} pressure</p>
          <p className="text-xs text-white/40">Resets {new Date(data.resetAt).toLocaleDateString("th-TH", { month: "short", day: "numeric" })}</p>
        </div>

        {[
          { label: "Daily budget", used: data.dailyUsed, total: data.dailyBudget, fraction: data.budgetFraction },
          { label: "Premium quota", used: data.premiumUsed, total: data.premiumBudget, fraction: data.premiumFraction },
          { label: "Session cap", used: data.sessionUsed, total: data.sessionBudget, fraction: data.sessionUsed / data.sessionBudget },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex justify-between text-xs text-white/50 mb-1.5">
              <span>{row.label}</span>
              <span>{fmt(row.used)} / {fmt(row.total)} ({pct(row.fraction)})</span>
            </div>
            <Bar fraction={row.fraction} accent={row.fraction > 0.85 ? "red" : row.fraction > 0.7 ? "amber" : "blue"} />
          </div>
        ))}

        {data.topFeatures.length > 0 && (
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Top consumers</p>
            {data.topFeatures.slice(0, 4).map((f) => (
              <div key={f.feature} className="flex justify-between text-xs text-white/60 mb-1">
                <span className="truncate">{f.feature}</span>
                <span className="text-white/40 ml-2">{fmt(f.tokens)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Intelligence Cache panel ───────────────────────────────────

function CachePanel() {
  const { data, isLoading } = useQuery<CacheData>({
    queryKey: ["admin-cache"],
    queryFn: async () => {
      const r = await fetch(`${import.meta.env.BASE_URL}api/admin/intelligence-cache`);
      if (!r.ok) throw new Error("fetch failed");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  if (isLoading || !data) return <LoadingCard label="Intelligence Cache" />;

  const s = data.stats;
  const hitPct = s.hits + s.misses > 0 ? Math.round((s.hits / (s.hits + s.misses)) * 100) : 0;

  return (
    <Card className="bg-white/4 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          Intelligence Cache
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Hit ratio", value: `${hitPct}%`, accent: hitPct > 60 ? "emerald" : hitPct > 30 ? "amber" : "red" },
            { label: "Entries", value: s.totalEntries, accent: "blue" },
            { label: "Hits", value: fmt(s.hits), accent: "emerald" },
            { label: "Misses", value: fmt(s.misses), accent: "amber" },
            { label: "Stale hits", value: fmt(s.staleHits), accent: "blue" },
            { label: "Evictions", value: fmt(s.evictions), accent: "amber" },
          ].map((stat) => {
            const accent: Record<string, string> = { emerald: "text-emerald-400", amber: "text-amber-400", red: "text-red-400", blue: "text-blue-400" };
            return (
              <div key={stat.label} className="bg-white/4 rounded-lg p-2.5">
                <p className="text-xs text-white/40 mb-0.5">{stat.label}</p>
                <p className={`text-base font-semibold tabular-nums ${accent[stat.accent] ?? "text-white"}`}>{stat.value}</p>
              </div>
            );
          })}
        </div>

        {Object.entries(s.byType).length > 0 && (
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">By type</p>
            {Object.entries(s.byType).map(([type, stats]) => (
              <div key={type} className="flex justify-between text-xs text-white/60 mb-1">
                <span className="text-white/50">{type}</span>
                <span>{stats.entries} entries, {Math.round((stats.hits / Math.max(stats.hits + stats.misses, 1)) * 100)}% hit</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sources panel ──────────────────────────────────────────────

function SourcesPanel() {
  const { data, isLoading } = useQuery<SourcesData>({
    queryKey: ["admin-sources"],
    queryFn: async () => {
      const r = await fetch(`${import.meta.env.BASE_URL}api/admin/sources`);
      if (!r.ok) throw new Error("fetch failed");
      return r.json();
    },
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return <LoadingCard label="Source Adapters" />;

  return (
    <Card className="bg-white/4 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400" />
          Source Adapters
          <span className="ml-auto text-xs text-white/40">{data.totalHealthy}/{data.totalEnabled} healthy</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.adapters.length === 0 ? (
          <p className="text-xs text-white/40 py-2">No adapters registered</p>
        ) : (
          <div className="space-y-2">
            {data.adapters.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-white/6 last:border-0">
                {a.health.ok
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{a.displayName}</p>
                  <p className="text-xs text-white/40">Tier {a.tier} · {a.isEnabled ? "enabled" : "disabled"}</p>
                </div>
                {a.health.ok && (
                  <span className="text-xs text-white/30 shrink-0">{a.health.latencyMs}ms</span>
                )}
                {!a.health.ok && a.health.reason && (
                  <span className="text-xs text-red-400/60 shrink-0 max-w-32 truncate">{a.health.reason}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Runtime Separation panel ───────────────────────────────────

function RuntimePanel() {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useQuery<RuntimeData>({
    queryKey: ["admin-runtime"],
    queryFn: async () => {
      const r = await fetch(`${import.meta.env.BASE_URL}api/admin/runtime`);
      if (!r.ok) throw new Error("fetch failed");
      return r.json();
    },
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return <LoadingCard label="Runtime Separation" />;

  const { stats } = data;
  const uptimeMins = Math.round((Date.now() - new Date(stats.uptimeSince).getTime()) / 60_000);

  return (
    <Card className="bg-white/4 border-white/10 col-span-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
          <Server className="w-4 h-4 text-white/50" />
          Runtime Separation
          <span className="ml-auto">
            <button onClick={() => setExpanded(!expanded)} className="text-white/30 hover:text-white/60 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Uptime", value: `${uptimeMins}m` },
            { label: "Sleep events", value: stats.sleepCount, warn: stats.sleepCount > 0 },
            { label: "P0 at risk", value: stats.p0ServicesAtRisk.length, warn: stats.p0ServicesAtRisk.length > 0 },
            { label: "Gap since ping", value: `${Math.round(stats.estimatedSleepGapMs / 1000)}s` },
          ].map((s) => (
            <div key={s.label} className="bg-white/4 rounded-lg p-2.5">
              <p className="text-xs text-white/40 mb-0.5">{s.label}</p>
              <p className={`text-lg font-semibold tabular-nums ${s.warn ? "text-amber-400" : "text-white"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {stats.p0ServicesAtRisk.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-400/5 border border-amber-400/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-400/80">
              <p className="font-medium mb-0.5">P0 services at risk during Replit sleep</p>
              <ul className="list-disc list-inside space-y-0.5">
                {stats.p0ServicesAtRisk.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Migration plan (expandable) */}
        {expanded && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-white/40 uppercase tracking-wider">Migration Plan</p>
            {data.migrationPlan.map((phase) => (
              <div key={phase.phase} className="bg-white/3 rounded-xl border border-white/8 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-white/80">{phase.phase}</p>
                  <span className="text-xs text-white/40">{phase.priority}</span>
                </div>
                <p className="text-xs text-white/50 mb-3">{phase.targetPlatform}</p>
                <div className="space-y-2">
                  {phase.services.map((svc) => (
                    <div key={svc.serviceId} className="flex items-center gap-2 text-xs">
                      <span className={`font-medium ${SLEEP_COLORS[svc.sleepSafety] ?? "text-white"}`}>
                        {svc.sleepSafety === "safe" ? "✓" : svc.sleepSafety === "degrades" ? "~" : "✗"}
                      </span>
                      <span className="text-white/70">{svc.displayName}</span>
                      <span className="text-white/30 ml-auto truncate max-w-40">{svc.migrationTarget}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Loading card ───────────────────────────────────────────────

function LoadingCard({ label }: { label: string }) {
  return (
    <Card className="bg-white/4 border-white/10">
      <CardContent className="flex items-center gap-3 py-8">
        <div className="w-4 h-4 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
        <span className="text-sm text-white/40">Loading {label}…</span>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function EfficiencyAdminPage() {
  const { data: pipeline } = useQuery({
    queryKey: ["admin-pipeline"],
    queryFn: async () => {
      const r = await fetch(`${import.meta.env.BASE_URL}api/admin/pipeline`);
      if (!r.ok) throw new Error("fetch failed");
      return r.json() as Promise<{ pipeline: { degradationLevel: number; tokenPressure: string; signalMode: string; premiumThreshold: number }; sessions: { activeSessions: number; byTier: Record<string, number> } }>;
    },
    refetchInterval: 20_000,
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/admin/system-intelligence">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              System Intelligence
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold tracking-tight">Efficiency Control</h1>
            <p className="text-xs text-white/40">Token governor · Degradation · Cache · Sources · Runtime</p>
          </div>
          {pipeline && (
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-white/30" />
              <span className="text-xs text-white/50">
                {pipeline.pipeline.signalMode} mode
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Pipeline summary bar */}
        {pipeline && (
          <div className="flex items-center gap-4 bg-white/4 border border-white/10 rounded-xl px-5 py-3">
            <Cpu className="w-4 h-4 text-white/40 shrink-0" />
            <div className="flex items-center gap-4 text-xs text-white/60 flex-wrap">
              <span>AI Pipeline</span>
              <span className="text-white/20">·</span>
              <span>Degradation <span className="text-white/80 font-medium">L{pipeline.pipeline.degradationLevel}</span></span>
              <span className="text-white/20">·</span>
              <span>Pressure <span className={`font-medium capitalize ${PRESSURE_COLORS[pipeline.pipeline.tokenPressure] ?? "text-white"}`}>{pipeline.pipeline.tokenPressure}</span></span>
              <span className="text-white/20">·</span>
              <span>Premium threshold <span className="text-white/80 font-medium">{pipeline.pipeline.premiumThreshold}</span></span>
              <span className="text-white/20">·</span>
              <span>Sessions <span className="text-white/80 font-medium">{pipeline.sessions.activeSessions}</span></span>
            </div>
            <Clock className="w-4 h-4 text-white/20 ml-auto shrink-0" />
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DegradationPanel />
          <TokenGovernorPanel />
          <CachePanel />
          <SourcesPanel />
          <RuntimePanel />
        </div>
      </main>
    </div>
  );
}

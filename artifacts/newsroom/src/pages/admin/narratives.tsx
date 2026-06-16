import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Activity, TrendingUp, TrendingDown, Minus, Layers,
  Zap, BarChart2, Network, AlertTriangle, Clock, Filter,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────
interface NarrativeHealth {
  id: string;
  canonicalHeadline: string;
  theme: string;
  dominantEntity: string | null;
  maturity: "emerging" | "active" | "peaking" | "declining" | "resolved";
  sentimentDirection: string;
  momentum: number;
  velocity: number;
  acceleration: number;
  persistence: number;
  spread: number;
  saturation: number;
  classification: "emerging" | "accelerating" | "peak" | "declining" | "dormant";
  totalMentions: number;
  mentionsLast24h: number;
  entityDensity: number;
  firstSeen: string;
  lastSeen: string;
  ageHours: number;
  peakScore: number;
  avgScore: number;
  isEarlySignal: boolean;
}

interface NarrativeStats {
  total: number;
  emerging: number;
  active: number;
  peaking: number;
  declining: number;
  resolved: number;
  avgLifespanHours: number;
  avgMomentum: number;
  acceleratingCount: number;
  earlySignalCount: number;
  activeSignals: number;
  ecosystemCount: number;
  narrativeRelationships: number;
}

// ── Helpers ───────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (h < 1) return `${Math.round(h * 60)}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function momentumColor(score: number): string {
  if (score >= 70) return "text-amber-400";
  if (score >= 40) return "text-emerald-400";
  if (score >= 20) return "text-blue-400";
  return "text-slate-500";
}

function classificationBadge(cls: NarrativeHealth["classification"]): string {
  switch (cls) {
    case "accelerating": return "text-amber-400 border-amber-400/40 bg-amber-400/10";
    case "peak": return "text-orange-400 border-orange-400/40 bg-orange-400/10";
    case "emerging": return "text-blue-400 border-blue-400/40 bg-blue-400/10";
    case "declining": return "text-slate-400 border-slate-400/30 bg-slate-400/10";
    case "dormant": return "text-slate-600 border-slate-600/20 bg-slate-600/5";
  }
}

function MomentumBar({ score }: { score: number }) {
  const w = Math.round(score);
  const color = score >= 70 ? "bg-amber-400" : score >= 40 ? "bg-emerald-400" : score >= 20 ? "bg-blue-400" : "bg-slate-700";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${w}%` }} />
      </div>
      <span className={`text-xs font-mono ${momentumColor(score)}`}>{score}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AdminNarrativesPage() {
  const [, navigate] = useLocation();
  const [narratives, setNarratives] = useState<NarrativeHealth[]>([]);
  const [stats, setStats] = useState<NarrativeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "accelerating" | "emerging" | "peak" | "declining">("all");
  const [sortBy, setSortBy] = useState<"momentum" | "velocity" | "spread" | "age">("momentum");

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/admin/narratives`).then((r) => r.json()),
      fetch(`${BASE}/api/admin/narratives/stats`).then((r) => r.json()),
    ])
      .then(([nData, sData]) => {
        setNarratives(nData.narratives ?? []);
        setStats(sData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = narratives
    .filter((n) => filter === "all" || n.classification === filter)
    .sort((a, b) => {
      if (sortBy === "momentum") return b.momentum - a.momentum;
      if (sortBy === "velocity") return b.velocity - a.velocity;
      if (sortBy === "spread") return b.spread - a.spread;
      return a.ageHours - b.ageHours;
    });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/admin/analytics")} className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Activity size={16} className="text-amber-400" />
              Narrative Health Monitor
            </h1>
            <p className="text-xs text-slate-500">Live lifecycle metrics for all tracked narratives</p>
          </div>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-5">
            {[
              { label: "Total", value: stats.total, color: "text-slate-200" },
              { label: "Accelerating", value: stats.acceleratingCount, color: "text-amber-400" },
              { label: "Emerging", value: stats.emerging, color: "text-blue-400" },
              { label: "Peaking", value: stats.peaking, color: "text-orange-400" },
              { label: "Signals", value: stats.activeSignals, color: "text-purple-400" },
              { label: "Ecosystems", value: stats.ecosystemCount, color: "text-emerald-400" },
              { label: "Avg Momentum", value: stats.avgMomentum, color: momentumColor(stats.avgMomentum) },
              { label: "Relations", value: stats.narrativeRelationships, color: "text-slate-300" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center">
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-600 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex gap-1">
            {(["all", "accelerating", "peak", "emerging", "declining"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors capitalize ${
                  filter === f ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Filter size={11} className="text-slate-600" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none"
            >
              <option value="momentum">Momentum</option>
              <option value="velocity">Velocity</option>
              <option value="spread">Source Spread</option>
              <option value="age">Newest First</option>
            </select>
          </div>
        </div>

        {/* Narrative table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <Layers size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No narrative data yet</p>
            <p className="text-xs mt-1">Load your personal feed to start tracking narratives</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <div key={n.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {n.isEarlySignal && (
                        <span className="text-[9px] font-bold text-purple-400 border border-purple-400/30 px-1.5 py-0.5 rounded bg-purple-400/10">
                          EARLY SIGNAL
                        </span>
                      )}
                      <span className={`text-[9px] font-medium border rounded px-1.5 py-0.5 ${classificationBadge(n.classification)}`}>
                        {n.classification.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-100 leading-snug line-clamp-1">
                      {n.canonicalHeadline}
                    </p>
                    <p className="text-xs text-slate-500">{n.theme} · {relativeTime(n.lastSeen)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <MomentumBar score={n.momentum} />
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { label: "Velocity", value: `${n.velocity.toFixed(1)}/h`, icon: <Zap size={9} /> },
                    { label: "Accel", value: n.acceleration > 0 ? `+${n.acceleration.toFixed(1)}` : n.acceleration.toFixed(1), color: n.acceleration > 0 ? "text-emerald-400" : n.acceleration < 0 ? "text-red-400" : "text-slate-400" },
                    { label: "Spread", value: `${n.spread}`, icon: <Network size={9} /> },
                    { label: "Persist", value: `${n.persistence}%` },
                    { label: "Satur", value: `${n.saturation}%` },
                    { label: "24h", value: n.mentionsLast24h },
                  ].map((m, i) => (
                    <div key={i} className="text-center">
                      <p className={`text-xs font-mono ${m.color ?? "text-slate-300"}`}>
                        {m.value}
                      </p>
                      <p className="text-[9px] text-slate-600">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

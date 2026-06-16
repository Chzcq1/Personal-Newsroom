// ============================================================
// DEBUG CENTER — Sprint 19 Task C
// Consolidated admin debug page replacing 3 separate routes:
//   /debug/relevance, /debug/entities, /debug/feed-evolution
// ============================================================

import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Brain, Network, TrendingUp, RefreshCw,
  ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
type DebugSection = "entities" | "narratives" | "diagnostics";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

// ── Entities Debug ────────────────────────────────────────────

function EntitiesDebug() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["debug-entities"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/debug/entities`);
      if (!r.ok) throw new Error("Not available");
      return r.json() as Promise<{
        totalTracked: number;
        entities: Array<{
          entityId: string; label: string;
          mentions24h: number; mentions7d: number;
          trendDirection: string; boostMultiplier: number;
        }>;
      }>;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">
          {data ? `${data.totalTracked} entities tracked` : "Loading…"}
        </p>
        <Button onClick={() => { void refetch(); }} variant="ghost" size="sm"
          className="text-white/40 hover:text-white/70 gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {data?.entities.map((e) => (
        <div key={e.entityId} className="flex items-center justify-between p-3.5 bg-white/4 border border-white/8 rounded-xl">
          <div>
            <p className="text-sm text-white/80">{e.label || e.entityId}</p>
            <p className="text-xs text-white/35 mt-0.5">{e.mentions24h} mentions (24h) · {e.mentions7d} (7d)</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className={`font-mono ${
              e.trendDirection === "rising" ? "text-emerald-400" :
              e.trendDirection === "declining" ? "text-rose-400" : "text-white/40"
            }`}>
              {e.trendDirection === "rising" ? "↑" : e.trendDirection === "declining" ? "↓" : "→"}
            </span>
            {e.boostMultiplier !== 1 && (
              <span className={`text-xs px-2 py-0.5 rounded ${e.boostMultiplier > 1 ? "text-emerald-400 bg-emerald-400/10" : "text-white/30 bg-white/5"}`}>
                ×{e.boostMultiplier.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      ))}

      {data && data.entities.length === 0 && (
        <p className="text-sm text-white/30 text-center py-8">No entities tracked yet. Entities build up after briefings.</p>
      )}
    </div>
  );
}

// ── Narratives Debug ──────────────────────────────────────────

function NarrativesDebug() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["debug-narratives"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/narratives`);
      if (!r.ok) throw new Error("Not available");
      return r.json() as Promise<{
        narratives: Array<{
          id: string; headline: string; maturity: string;
          mentionCount: number; score: number;
          entitiesInvolved: string[]; lastSeen: string;
        }>;
        stats: { total: number; active: number; emerging: number; peaking: number };
      }>;
    },
  });

  const maturityColors: Record<string, string> = {
    emerging: "text-amber-400 bg-amber-400/10",
    active: "text-blue-400 bg-blue-400/10",
    peaking: "text-violet-400 bg-violet-400/10",
    declining: "text-white/30 bg-white/5",
    resolved: "text-zinc-500 bg-zinc-500/10",
  };

  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {data?.stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", val: data.stats.total },
            { label: "Active", val: data.stats.active, color: "text-blue-400" },
            { label: "Emerging", val: data.stats.emerging, color: "text-amber-400" },
            { label: "Peaking", val: data.stats.peaking, color: "text-violet-400" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white/4 border border-white/8 rounded-xl p-3 text-center">
              <p className={`text-xl font-semibold ${color ?? "text-white/70"}`}>{val}</p>
              <p className="text-xs text-white/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => { void refetch(); }} variant="ghost" size="sm"
          className="text-white/40 hover:text-white/70 gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>}

      {data?.narratives.map((n) => (
        <div key={n.id} className="bg-white/4 border border-white/8 rounded-xl overflow-hidden">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/3"
            onClick={() => setExpanded(expanded === n.id ? null : n.id)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${maturityColors[n.maturity] ?? "text-white/40 bg-white/5"}`}>
                {n.maturity}
              </span>
              <p className="text-sm text-white/80 truncate">{n.headline}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <span className="text-xs text-white/30 font-mono">{n.mentionCount}x</span>
              {expanded === n.id ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
            </div>
          </div>
          {expanded === n.id && (
            <div className="px-4 pb-4 space-y-2 border-t border-white/5">
              <div className="flex items-center gap-2 flex-wrap mt-3">
                {n.entitiesInvolved.map((e) => (
                  <span key={e} className="text-xs px-2 py-0.5 bg-white/8 rounded text-white/50">{e}</span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-white/30">
                <span>Score: {n.score.toFixed(2)}</span>
                <span>Last seen: {timeAgo(n.lastSeen)}</span>
              </div>
            </div>
          )}
        </div>
      ))}

      {data && data.narratives.length === 0 && (
        <p className="text-sm text-white/30 text-center py-8">No narratives yet. They build up after 2–3 briefings on the same topic.</p>
      )}
    </div>
  );
}

// ── Diagnostics Debug ─────────────────────────────────────────

function DiagnosticsDebug() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["debug-diagnostics"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/health`);
      if (!r.ok) throw new Error("Not available");
      return r.json() as Promise<{
        status: string; aiProviderWorking: boolean; aiProviderName: string;
        aiProviderDetail: string; rssFeedsWorking: boolean; rssFeedDetail: string;
        storageWorking: boolean; timestamp: string; checkDurationMs: number;
      }>;
    },
  });

  const sprint18 = useQuery({
    queryKey: ["debug-sprint18"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin/sprint18`);
      if (!r.ok) return null;
      return r.json();
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => { void refetch(); void sprint18.refetch(); }} variant="ghost" size="sm"
          className="text-white/40 hover:text-white/70 gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>}

      {data && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-white/50 uppercase tracking-wider">System Health</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "API Server", ok: data.status === "healthy", detail: `${data.checkDurationMs}ms` },
              { label: "AI Provider", ok: data.aiProviderWorking, detail: `${data.aiProviderName} — ${data.aiProviderDetail}` },
              { label: "RSS Feeds", ok: data.rssFeedsWorking, detail: data.rssFeedDetail },
              { label: "Storage", ok: data.storageWorking, detail: "database" },
            ].map(({ label, ok, detail }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-400" : "bg-rose-400"}`} />
                  <span className="text-sm text-white/70">{label}</span>
                </div>
                <span className="text-xs text-white/35">{detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-300 font-medium mb-1">Developer Tools</p>
            <p className="text-xs text-white/40">
              These diagnostics are for debugging only. All production monitoring is in the Intelligence Center.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

const SECTIONS: { id: DebugSection; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "entities", label: "Entities", icon: Network },
  { id: "narratives", label: "Narratives", icon: TrendingUp },
  { id: "diagnostics", label: "Diagnostics", icon: Brain },
];

export default function DebugCenterPage() {
  const [active, setActive] = useState<DebugSection>("entities");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/intelligence-center">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Intelligence Center
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Debug Center</h1>
            <p className="text-xs text-white/40">Developer diagnostics — not for regular use</p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 flex gap-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActive(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active === id ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/70"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {active === "entities" && <EntitiesDebug />}
        {active === "narratives" && <NarrativesDebug />}
        {active === "diagnostics" && <DiagnosticsDebug />}
      </main>
    </div>
  );
}

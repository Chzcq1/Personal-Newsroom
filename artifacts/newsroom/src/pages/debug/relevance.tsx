// ============================================================
// RELEVANCE INSPECTOR — Sprint 9 Task E
//
// Developer-grade inspector for understanding feed decisions.
//
// Features:
//   • Interest graph expansion visualizer
//   • Live relevance test (enter any headline)
//   • Entity memory snapshot with trend indicators
//   • Relevance class breakdown from last feed
// ============================================================

import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  GitBranch,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInterests } from "@/lib/interestProfile";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────

interface RelevanceOverview {
  interestGraph: { totalNodes: number; nodes: string[] };
  entityMemory: {
    totalTracked: number;
    risingEntities: Array<{ entityId: string; label: string; trend: string; mentions24h: number }>;
    allEntities: Array<{ entityId: string; label: string; trend: string; mentions24h: number; recentDevelopment: string | null }>;
  };
  storyEvolution: { activeStories: number };
  generatedAt: string;
}

interface TestResult {
  input: { title: string; description?: string; interests: string[] };
  relevance: {
    class: string;
    combinedScore: number;
    breakdown: {
      directKeywordScore: number;
      graphScore: number;
      entityOverlapScore: number;
      sourceModifier: number;
    };
    matchedEntities: string[];
    directMatches: string[];
    explanation: string;
  };
  expandedEntities: Record<string, { weight: number; hop: number; keywords: string[] }>;
}

interface GraphExpansion {
  interest: string;
  label: string;
  coreKeywords: string[];
  expandedNodes: Array<{
    entityId: string;
    label: string;
    weight: number;
    hop: number;
    keywords: string[];
  }>;
}

// ── Helpers ───────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "rising") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === "declining") return <TrendingDown className="w-3.5 h-3.5 text-red-400/70" />;
  return <Minus className="w-3.5 h-3.5 text-white/30" />;
}

function ClassPill({ cls }: { cls: string }) {
  const styles: Record<string, string> = {
    direct: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
    contextual: "text-sky-400 border-sky-400/30 bg-sky-400/5",
    weak: "text-white/40 border-white/15 bg-white/5",
    incidental: "text-white/25 border-white/10",
  };
  return (
    <span className={`text-[11px] font-semibold border px-2 py-0.5 rounded capitalize ${styles[cls] ?? ""}`}>
      {cls}
    </span>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-white/40">{label}</span>
        <span className="text-white/60 font-medium">{value}</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function RelevanceDebugPage() {
  const interests = getInterests();

  const [testTitle, setTestTitle] = useState("");
  const [testDesc, setTestDesc] = useState("");
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "test" | "graph" | "memory">("overview");

  // Fetch overview
  const { data: overview, isLoading: overviewLoading } = useQuery<RelevanceOverview>({
    queryKey: ["debug-relevance"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/debug/relevance`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 30_000,
  });

  // Test mutation
  const testMutation = useMutation<TestResult, Error, { title: string; description?: string }>({
    mutationFn: async ({ title, description }) => {
      const r = await fetch(`${BASE}/api/debug/relevance/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, interests }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  // Graph expansion query
  const { data: graphData } = useQuery<GraphExpansion>({
    queryKey: ["debug-graph", selectedInterest],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/debug/graph/${encodeURIComponent(selectedInterest!)}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!selectedInterest,
  });

  const hopColor = ["bg-emerald-400", "bg-sky-400", "bg-white/30"];

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
          <div>
            <h1 className="text-sm font-semibold">Relevance Inspector</h1>
            <p className="text-[10px] text-white/30">Sprint 9 · Contextual Intelligence</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/8">
          {(["overview", "test", "graph", "memory"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-[11px] font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-white/60 text-white/80"
                  : "border-transparent text-white/30 hover:text-white/50"
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {overviewLoading && <p className="text-sm text-white/30 animate-pulse">Loading...</p>}
            {overview && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Graph Nodes" value={overview.interestGraph.totalNodes} icon={<GitBranch className="w-4 h-4" />} />
                  <StatCard label="Tracked Entities" value={overview.entityMemory.totalTracked} icon={<Database className="w-4 h-4" />} />
                  <StatCard label="Active Stories" value={overview.storyEvolution.activeStories} icon={<Layers className="w-4 h-4" />} />
                </div>

                {overview.entityMemory.risingEntities.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Rising Entities</p>
                    <div className="space-y-1.5">
                      {overview.entityMemory.risingEntities.map((e) => (
                        <div key={e.entityId} className="flex items-center gap-2 py-2 border-b border-white/5">
                          <TrendIcon trend={e.trend} />
                          <span className="flex-1 text-[12px] text-white/70">{e.label}</span>
                          <span className="text-[10px] text-white/30">{e.mentions24h} mentions/24h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Test Tab */}
        {activeTab === "test" && (
          <div className="space-y-4">
            <p className="text-[11px] text-white/40">Test how any headline is scored against your current interests ({interests.length > 0 ? interests.join(", ") : "none set"}).</p>
            <div className="space-y-2">
              <input type="text" value={testTitle} onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Article headline…"
                className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
              />
              <input type="text" value={testDesc} onChange={(e) => setTestDesc(e.target.value)}
                placeholder="Description (optional)…"
                className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
              />
              <Button size="sm" onClick={() => testMutation.mutate({ title: testTitle, description: testDesc })}
                disabled={!testTitle.trim() || testMutation.isPending}
                className="bg-white/10 hover:bg-white/15 text-white border-0">
                <Search className="w-3.5 h-3.5 mr-1.5" />
                Test Relevance
              </Button>
            </div>

            {testMutation.data && (
              <div className="rounded-lg border border-white/10 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <ClassPill cls={testMutation.data.relevance.class} />
                  <span className="text-sm font-bold text-white/80">Score: {testMutation.data.relevance.combinedScore}</span>
                </div>

                <p className="text-[12px] text-white/50 italic">"{testMutation.data.relevance.explanation}"</p>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Score breakdown</p>
                  <ScoreBar label="Direct keyword" value={testMutation.data.relevance.breakdown.directKeywordScore} max={80} color="bg-emerald-400/60" />
                  <ScoreBar label="Graph proximity" value={Math.round(testMutation.data.relevance.breakdown.graphScore * 100)} max={100} color="bg-sky-400/60" />
                  <ScoreBar label="Entity overlap" value={testMutation.data.relevance.breakdown.entityOverlapScore} max={30} color="bg-purple-400/60" />
                  <ScoreBar label="Source modifier" value={testMutation.data.relevance.breakdown.sourceModifier} max={15} color="bg-amber-400/60" />
                </div>

                {testMutation.data.relevance.matchedEntities.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Graph matches</p>
                    <div className="flex flex-wrap gap-1.5">
                      {testMutation.data.relevance.matchedEntities.map((e) => (
                        <span key={e} className="text-[10px] px-2 py-0.5 bg-sky-400/10 text-sky-300/70 border border-sky-400/20 rounded-full">{e}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">
                    Expanded entities ({Object.keys(testMutation.data.expandedEntities).length})
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {Object.entries(testMutation.data.expandedEntities)
                      .sort((a, b) => b[1].weight - a[1].weight)
                      .slice(0, 20)
                      .map(([id, info]) => (
                        <div key={id} className="flex items-center gap-2 text-[10px]">
                          <div className={`w-1.5 h-1.5 rounded-full ${hopColor[info.hop] ?? "bg-white/20"}`} />
                          <span className="text-white/50 w-32 truncate">{id}</span>
                          <span className="text-white/25">hop {info.hop}</span>
                          <span className="text-white/40 font-medium ml-auto">{info.weight.toFixed(2)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Graph Tab */}
        {activeTab === "graph" && (
          <div className="space-y-4">
            <p className="text-[11px] text-white/40">Select an interest to visualize its graph expansion (all related entities within 2 hops).</p>
            <div className="flex flex-wrap gap-1.5">
              {interests.length > 0 ? interests.map((i) => (
                <button key={i} onClick={() => setSelectedInterest(i)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    selectedInterest === i
                      ? "bg-white/15 border-white/30 text-white"
                      : "border-white/10 text-white/40 hover:text-white/60"
                  }`}>
                  {i}
                </button>
              )) : (
                <p className="text-[11px] text-white/30">No interests set. Go to Settings → Interests.</p>
              )}
            </div>

            {graphData && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
                    {graphData.label} — {graphData.expandedNodes.length} expanded nodes
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {graphData.coreKeywords.map((kw) => (
                      <span key={kw} className="text-[10px] px-2 py-0.5 bg-emerald-400/10 text-emerald-300/70 border border-emerald-400/20 rounded">{kw}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {graphData.expandedNodes.map((node) => (
                    <div key={node.entityId} className="flex items-center gap-3 py-1.5 border-b border-white/5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hopColor[node.hop] ?? "bg-white/20"}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] text-white/70">{node.label}</span>
                        <span className="text-[9px] text-white/25 ml-2">{node.keywords.join(", ")}</span>
                      </div>
                      <span className="text-[10px] text-white/30">hop {node.hop}</span>
                      <span className="text-[11px] font-medium text-white/50 w-10 text-right">{node.weight.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 text-[10px] text-white/30">
                  {["Hop 0 — core", "Hop 1 — direct (×0.7)", "Hop 2 — indirect (×0.4)"].map((l, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${hopColor[i]}`} />
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Memory Tab */}
        {activeTab === "memory" && (
          <div className="space-y-4">
            {overview?.entityMemory.allEntities.length === 0 && (
              <p className="text-[12px] text-white/30">No entities tracked yet. Refresh your feed to populate entity memory.</p>
            )}
            {overview?.entityMemory.allEntities.map((e) => (
              <div key={e.entityId} className="flex items-start gap-3 py-3 border-b border-white/5">
                <TrendIcon trend={e.trend} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-white/70">{e.label}</span>
                    <span className="text-[9px] text-white/25 border border-white/10 px-1 py-0.5 rounded">{e.entityId}</span>
                  </div>
                  {e.recentDevelopment && (
                    <p className="text-[11px] text-white/40 mt-0.5 truncate">{e.recentDevelopment}</p>
                  )}
                </div>
                <span className="text-[10px] text-white/30 whitespace-nowrap">{e.mentions24h}/24h</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-white/30 mb-2">{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <p className="text-2xl font-bold text-white/80">{value}</p>
    </div>
  );
}

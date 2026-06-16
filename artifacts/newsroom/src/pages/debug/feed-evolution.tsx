import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Zap,
  BarChart2, Network, Activity, Eye, Star, Globe,
  AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { getInterests } from "@/lib/interestProfile";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────
interface TrendItem {
  narrativeId?: string;
  entityId?: string;
  label?: string;
  canonicalHeadline?: string;
  classification: string;
  momentumScore: number;
  velocity?: { mentionsPerHour: number; acceleration: number };
  dominantEntity?: string | null;
  isEarlySignal?: boolean;
  detectedAt?: string;
}

interface EarlySignal {
  id: string;
  type: string;
  label: string;
  entities: string[];
  sourceCount: number;
  confidence: number;
  firstDetectedAt: string;
  articleSample: string[];
}

interface InfluenceItem {
  entityId: string;
  label: string;
  influenceScore: number;
  tier: string;
  influenceDirection: string;
  breadthScore: number;
  velocityScore: number;
}

interface BriefingData {
  generatedAt: string;
  majorDevelopments: Array<{ headline: string; momentum: number; maturity: string; dominantEntity: string | null }>;
  acceleratingNarratives: TrendItem[];
  emergingSignals: EarlySignal[];
  risingEntities: Array<{ label: string; mentionsLast24h: number; trend: string }>;
  topInfluencers: InfluenceItem[];
  ecosystemSnapshot: Array<{ label: string; nodeCount: number; dominantEntities: string[]; description: string }>;
  systemMomentum: number;
}

// ── Helpers ───────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (h < 1) return `${Math.round(h * 60)}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function MomentumOrb({ score }: { score: number }) {
  const color = score >= 70 ? "bg-amber-400" : score >= 40 ? "bg-emerald-400" : score >= 20 ? "bg-blue-400" : "bg-slate-700";
  const glow = score >= 70 ? "shadow-amber-400/30" : score >= 40 ? "shadow-emerald-400/20" : "";
  return (
    <div className={`w-8 h-8 rounded-full ${color} shadow-lg ${glow} flex items-center justify-center shrink-0`}>
      <span className="text-[10px] font-bold text-slate-900">{score}</span>
    </div>
  );
}

function ClassificationChip({ cls }: { cls: string }) {
  const styles: Record<string, string> = {
    accelerating: "text-amber-400 border-amber-400/40 bg-amber-400/10",
    peak: "text-orange-400 border-orange-400/40 bg-orange-400/10",
    emerging: "text-blue-400 border-blue-400/40 bg-blue-400/10",
    declining: "text-slate-400 border-slate-400/30 bg-slate-400/10",
    dormant: "text-slate-600 border-slate-600/20",
  };
  return (
    <span className={`text-[9px] font-medium border rounded px-1.5 py-0.5 capitalize ${styles[cls] ?? "text-slate-400 border-slate-700"}`}>
      {cls}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    dominant: "text-amber-400",
    major: "text-emerald-400",
    moderate: "text-blue-400",
    minor: "text-slate-500",
  };
  return <span className={`text-xs font-medium capitalize ${colors[tier] ?? "text-slate-500"}`}>{tier}</span>;
}

// ── Panel components ──────────────────────────────────────────
function CollapsiblePanel({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function FeedEvolutionPage() {
  const [, navigate] = useLocation();
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [trends, setTrends] = useState<{ topAccelerating: TrendItem[]; emerging: TrendItem[]; systemMomentum: number } | null>(null);
  const [signals, setSignals] = useState<EarlySignal[]>([]);
  const [influence, setInfluence] = useState<{ topInfluencers: InfluenceItem[]; expandingInfluencers: InfluenceItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const interests = getInterests();

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/intelligence/briefing`).then((r) => r.json()),
      fetch(`${BASE}/api/intelligence/trends`).then((r) => r.json()),
      fetch(`${BASE}/api/intelligence/signals`).then((r) => r.json()),
      fetch(`${BASE}/api/intelligence/influence`).then((r) => r.json()),
    ])
      .then(([briefingData, trendsData, signalsData, influenceData]) => {
        setBriefing(briefingData);
        setTrends(trendsData);
        setSignals(signalsData.signals ?? []);
        setInfluence(influenceData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Building intelligence picture...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/debug/relevance")} className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Activity size={16} className="text-amber-400" />
              Feed Evolution Intelligence
            </h1>
            <p className="text-xs text-slate-500">Why your feed looks the way it does right now</p>
          </div>
        </div>

        {/* System momentum */}
        {briefing && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">System Momentum</p>
                <div className="flex items-center gap-2">
                  <div className={`text-3xl font-bold ${briefing.systemMomentum >= 60 ? "text-amber-400" : briefing.systemMomentum >= 30 ? "text-emerald-400" : "text-slate-400"}`}>
                    {briefing.systemMomentum}
                  </div>
                  <div className="text-slate-500 text-xs">/100</div>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>{briefing.majorDevelopments.length} major developments</p>
                <p>{briefing.emergingSignals.length} early signals</p>
                <p>Updated {relativeTime(briefing.generatedAt)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Major developments */}
        {briefing && briefing.majorDevelopments.length > 0 && (
          <CollapsiblePanel title="Major Developments" icon={<TrendingUp size={14} className="text-amber-400" />}>
            <div className="space-y-3">
              {briefing.majorDevelopments.map((dev, i) => (
                <div key={i} className="flex items-start gap-3">
                  <MomentumOrb score={dev.momentum} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-100 leading-snug line-clamp-2">{dev.headline}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="capitalize">{dev.maturity}</span>
                      {dev.dominantEntity && <span>· {dev.dominantEntity}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsiblePanel>
        )}

        {/* Accelerating narratives */}
        {trends && trends.topAccelerating.length > 0 && (
          <CollapsiblePanel title="Accelerating Narratives" icon={<Zap size={14} className="text-amber-400" />}>
            <div className="space-y-2">
              {trends.topAccelerating.slice(0, 6).map((t) => (
                <div key={t.narrativeId ?? t.entityId} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm text-slate-100 line-clamp-1">{t.canonicalHeadline ?? t.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <ClassificationChip cls={t.classification} />
                      {t.isEarlySignal && (
                        <span className="text-[9px] text-purple-400 border border-purple-400/30 rounded px-1.5 py-0.5 bg-purple-400/10">
                          SIGNAL
                        </span>
                      )}
                      {t.velocity && (
                        <span className="text-[10px] text-slate-500">{t.velocity.mentionsPerHour.toFixed(1)}/h</span>
                      )}
                    </div>
                  </div>
                  <MomentumOrb score={t.momentumScore} />
                </div>
              ))}
            </div>
          </CollapsiblePanel>
        )}

        {/* Early signals */}
        {signals.length > 0 && (
          <CollapsiblePanel title={`Early Signals (${signals.length})`} icon={<AlertTriangle size={14} className="text-purple-400" />}>
            <div className="space-y-3">
              {signals.slice(0, 5).map((sig) => (
                <div key={sig.id} className="border border-purple-500/20 bg-purple-500/5 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm text-slate-100 leading-snug">{sig.label}</p>
                    <span className="text-[10px] font-mono text-purple-400 shrink-0">
                      {Math.round(sig.confidence * 100)}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {sig.entities.slice(0, 3).map((e) => (
                      <span key={e} className="text-[10px] text-slate-400 bg-slate-800 rounded px-1.5 py-0.5">{e}</span>
                    ))}
                    <span className="text-[10px] text-slate-600">{sig.sourceCount} sources</span>
                  </div>
                  {sig.articleSample[0] && (
                    <p className="text-[10px] text-slate-500 italic mt-1.5 line-clamp-1">"{sig.articleSample[0]}"</p>
                  )}
                </div>
              ))}
            </div>
          </CollapsiblePanel>
        )}

        {/* Rising entities */}
        {briefing && briefing.risingEntities.length > 0 && (
          <CollapsiblePanel title="Rising Entities" icon={<TrendingUp size={14} className="text-emerald-400" />}>
            <div className="grid grid-cols-2 gap-2">
              {briefing.risingEntities.slice(0, 8).map((e, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/60 rounded-lg p-2">
                  <div>
                    <p className="text-xs font-medium text-slate-200">{e.label}</p>
                    <p className="text-[10px] text-slate-500">{e.mentionsLast24h} in 24h</p>
                  </div>
                  {e.trend === "rising" ? <TrendingUp size={12} className="text-emerald-400" /> :
                   e.trend === "declining" ? <TrendingDown size={12} className="text-red-400" /> :
                   <Minus size={12} className="text-slate-500" />}
                </div>
              ))}
            </div>
          </CollapsiblePanel>
        )}

        {/* Top influencers */}
        {influence && influence.topInfluencers.length > 0 && (
          <CollapsiblePanel title="Entity Influence" icon={<Network size={14} className="text-blue-400" />} defaultOpen={false}>
            <div className="space-y-2">
              {influence.topInfluencers.slice(0, 8).map((inf) => (
                <div key={inf.entityId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-100">{inf.label}</p>
                      <TierBadge tier={inf.tier} />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                      <span>Breadth {inf.breadthScore}</span>
                      <span>Velocity {inf.velocityScore}</span>
                      <span className={inf.influenceDirection === "expanding" ? "text-emerald-400" : inf.influenceDirection === "contracting" ? "text-red-400" : "text-slate-500"}>
                        {inf.influenceDirection}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-bold ${inf.influenceScore >= 60 ? "text-amber-400" : "text-slate-300"}`}>
                      {inf.influenceScore}
                    </p>
                    <p className="text-[9px] text-slate-600">influence</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsiblePanel>
        )}

        {/* Ecosystem snapshot */}
        {briefing && briefing.ecosystemSnapshot.length > 0 && (
          <CollapsiblePanel title="Ecosystem Connections" icon={<Globe size={14} className="text-blue-400" />} defaultOpen={false}>
            <div className="space-y-3">
              {briefing.ecosystemSnapshot.map((eco, i) => (
                <div key={i} className="border border-slate-700/50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <p className="text-sm font-medium text-slate-100">{eco.label}</p>
                    <span className="text-xs text-slate-500">{eco.nodeCount} narratives</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{eco.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {eco.dominantEntities.map((e) => (
                      <span key={e} className="text-[10px] text-slate-400 bg-slate-800 rounded px-1.5 py-0.5">{e}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsiblePanel>
        )}

        {/* Empty state */}
        {!loading && !briefing?.majorDevelopments.length && !trends?.topAccelerating.length && (
          <div className="text-center py-16 text-slate-600">
            <Activity size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No intelligence data yet</p>
            <p className="text-xs mt-1">Load your personal feed to start detecting trends</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  TrendingUp, TrendingDown, Minus, Clock, BarChart2,
  ChevronRight, ArrowLeft, Layers, Activity, Flame,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────

interface NarrativeDevelopment {
  headline: string;
  sources: string[];
  recordedAt: string;
  articleCount: number;
  avgSignalScore: number;
  dominantEntity: string | null;
}

interface NarrativeMilestone {
  label: string;
  recordedAt: string;
  significance: "low" | "medium" | "high";
}

interface NarrativeThread {
  id: string;
  canonicalHeadline: string;
  theme: string;
  dominantEntity: string | null;
  relatedEntities: string[];
  developments: NarrativeDevelopment[];
  totalMentions: number;
  mentionsLast24h: number;
  mentionsLast7d: number;
  avgScore: number;
  peakScore: number;
  maturity: "emerging" | "active" | "peaking" | "declining" | "resolved";
  sentimentDirection: "positive" | "negative" | "mixed" | "neutral";
  trendAcceleration: number;
  firstSeen: string;
  lastSeen: string;
  milestones: NarrativeMilestone[];
}

interface NarrativeStats {
  total: number;
  emerging: number;
  active: number;
  peaking: number;
  declining: number;
  resolved: number;
  avgLifespanHours: number;
}

// ── Helpers ───────────────────────────────────────────────────

function maturityColor(maturity: NarrativeThread["maturity"]): string {
  switch (maturity) {
    case "peaking": return "text-amber-400 border-amber-400/40 bg-amber-400/10";
    case "active": return "text-emerald-400 border-emerald-400/40 bg-emerald-400/10";
    case "emerging": return "text-blue-400 border-blue-400/40 bg-blue-400/10";
    case "declining": return "text-slate-400 border-slate-400/30 bg-slate-400/10";
    case "resolved": return "text-slate-500 border-slate-500/20 bg-slate-500/5";
  }
}

function maturityLabel(maturity: NarrativeThread["maturity"]): string {
  switch (maturity) {
    case "peaking": return "Peaking";
    case "active": return "Active";
    case "emerging": return "Emerging";
    case "declining": return "Declining";
    case "resolved": return "Resolved";
  }
}

function sentimentIcon(s: NarrativeThread["sentimentDirection"]) {
  if (s === "positive") return <TrendingUp size={12} className="text-emerald-400" />;
  if (s === "negative") return <TrendingDown size={12} className="text-red-400" />;
  return <Minus size={12} className="text-slate-400" />;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = ms / 3_600_000;
  if (h < 1) return `${Math.round(ms / 60_000)}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function accelerationLabel(accel: number): string {
  if (accel > 0.5) return "Accelerating";
  if (accel < -0.5) return "Decelerating";
  return "Stable";
}

// ── Timeline component ────────────────────────────────────────

function NarrativeTimeline({ thread }: { thread: NarrativeThread }) {
  const devs = [...thread.developments].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-700" />

      {devs.map((dev, i) => (
        <div key={i} className="relative mb-6 last:mb-0">
          {/* Dot */}
          <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 ${
            i === devs.length - 1
              ? "bg-amber-400 border-amber-400"
              : "bg-slate-800 border-slate-600"
          }`} />

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
            <p className="text-sm text-slate-200 leading-snug mb-2">{dev.headline}</p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {relativeTime(dev.recordedAt)}
              </span>
              {dev.sources.slice(0, 2).map((s) => (
                <span key={s} className="text-slate-400">{s}</span>
              ))}
              {dev.articleCount > 1 && (
                <span className="text-slate-500">{dev.articleCount} articles</span>
              )}
              {dev.avgSignalScore > 0 && (
                <span className={`${dev.avgSignalScore >= 80 ? "text-amber-400" : dev.avgSignalScore >= 50 ? "text-emerald-400" : "text-slate-500"}`}>
                  Signal {dev.avgSignalScore}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Milestones */}
      {thread.milestones.filter((m) => m.significance !== "low").map((m, i) => (
        <div key={`ms-${i}`} className="relative mb-4">
          <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-500" />
          <div className="text-xs text-slate-500 italic">
            {m.label} · {relativeTime(m.recordedAt)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Narrative card ────────────────────────────────────────────

function NarrativeCard({
  thread,
  onSelect,
}: {
  thread: NarrativeThread;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(thread.id)}
      className="w-full text-left bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-100 leading-snug line-clamp-2 mb-1">
            {thread.canonicalHeadline}
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">{thread.theme}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs border rounded px-1.5 py-0.5 ${maturityColor(thread.maturity)}`}>
            {maturityLabel(thread.maturity)}
          </span>
          <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          {sentimentIcon(thread.sentimentDirection)}
          {thread.sentimentDirection}
        </span>
        <span className="flex items-center gap-1">
          <Activity size={10} />
          {thread.mentionsLast24h} in 24h
        </span>
        <span className="flex items-center gap-1">
          <BarChart2 size={10} />
          Peak {thread.peakScore}
        </span>
        <span>{relativeTime(thread.lastSeen)}</span>
      </div>

      {thread.relatedEntities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {thread.relatedEntities.slice(0, 4).map((e) => (
            <span key={e} className="text-[10px] text-slate-500 bg-slate-800 rounded px-1.5 py-0.5">
              {e}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function NarrativesPage() {
  const [, navigate] = useLocation();
  const [narratives, setNarratives] = useState<NarrativeThread[]>([]);
  const [stats, setStats] = useState<NarrativeStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<NarrativeThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "peaking" | "active" | "emerging">("all");

  useEffect(() => {
    fetch(`${BASE}/api/narratives?limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setNarratives(data.narratives ?? []);
        setStats(data.stats ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) { setSelectedThread(null); return; }
    fetch(`${BASE}/api/narratives/${selectedId}`)
      .then((r) => r.json())
      .then(setSelectedThread)
      .catch(() => {});
  }, [selectedId]);

  const filtered = narratives.filter(
    (n) => filter === "all" || n.maturity === filter,
  );

  if (selectedThread) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-6 transition-colors"
          >
            <ArrowLeft size={14} /> Back to narratives
          </button>

          <div className={`inline-flex items-center gap-1.5 text-xs border rounded px-2 py-1 mb-3 ${maturityColor(selectedThread.maturity)}`}>
            {selectedThread.maturity === "peaking" && <Flame size={11} />}
            {maturityLabel(selectedThread.maturity)}
          </div>

          <h1 className="text-lg font-semibold text-slate-100 mb-1 leading-snug">
            {selectedThread.canonicalHeadline}
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-4">{selectedThread.theme}</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-slate-100">{selectedThread.totalMentions}</p>
              <p className="text-xs text-slate-500">Total articles</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-slate-100">{selectedThread.mentionsLast24h}</p>
              <p className="text-xs text-slate-500">Last 24h</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-slate-100">{selectedThread.peakScore}</p>
              <p className="text-xs text-slate-500">Peak signal</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-slate-400 mb-6">
            <span className="flex items-center gap-1.5">
              {sentimentIcon(selectedThread.sentimentDirection)}
              <span className="capitalize">{selectedThread.sentimentDirection} sentiment</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Activity size={12} />
              {accelerationLabel(selectedThread.trendAcceleration)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              First seen {relativeTime(selectedThread.firstSeen)}
            </span>
          </div>

          {selectedThread.relatedEntities.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Related entities</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedThread.relatedEntities.map((e) => (
                  <span key={e} className="text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded px-2 py-1">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-4">
              Narrative Timeline — {selectedThread.developments.length} developments
            </p>
            <NarrativeTimeline thread={selectedThread} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/my-feed")}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Layers size={16} className="text-amber-400" />
              Narrative Intelligence
            </h1>
            <p className="text-xs text-slate-500">Persistent story threads across days</p>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-5 gap-2 mb-5">
            {[
              { label: "Emerging", value: stats.emerging, color: "text-blue-400" },
              { label: "Active", value: stats.active, color: "text-emerald-400" },
              { label: "Peaking", value: stats.peaking, color: "text-amber-400" },
              { label: "Declining", value: stats.declining, color: "text-slate-400" },
              { label: "Avg hours", value: `${stats.avgLifespanHours}h`, color: "text-slate-300" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center">
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4">
          {(["all", "peaking", "active", "emerging"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full transition-colors capitalize ${
                filter === f
                  ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Empty / loading */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <Layers size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No narrative threads yet</p>
            <p className="text-xs mt-1">Load your personal feed to start building narrative memory</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((thread) => (
              <NarrativeCard key={thread.id} thread={thread} onSelect={setSelectedId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Network, TrendingUp, TrendingDown, Minus,
  Search, GitBranch, Layers, Activity,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────

interface EntityMemoryEntry {
  entityId: string;
  label: string;
  mentions: number;
  mentionsLast24h: number;
  mentionsLast7d: number;
  trendDirection: "rising" | "stable" | "declining";
  relatedEntities: string[];
  firstSeen: string;
  lastSeen: string;
  recentDevelopments: Array<{
    headline: string;
    source: string | null;
    recordedAt: string;
    relevance: "high" | "medium" | "low";
  }>;
}

interface AdaptiveSummary {
  totalLearnedEdges: number;
  totalEngagements: number;
  expansionClusters: Array<{
    label: string;
    coreEntities: string[];
    confidence: number;
    detectedAt: string;
  }>;
  topLearnedEdges: Array<{
    from: string;
    to: string;
    confidence: number;
    effectiveConfidence: number;
    coOccurrences: number;
    lastSeen: string;
  }>;
}

// ── Helpers ───────────────────────────────────────────────────

function trendIcon(d: "rising" | "stable" | "declining") {
  if (d === "rising") return <TrendingUp size={12} className="text-emerald-400" />;
  if (d === "declining") return <TrendingDown size={12} className="text-red-400" />;
  return <Minus size={12} className="text-slate-500" />;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = ms / 3_600_000;
  if (h < 1) return `${Math.round(ms / 60_000)}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function confidenceBar(conf: number) {
  const pct = Math.round(conf * 100);
  const color = pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-slate-600";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400">{pct}%</span>
    </div>
  );
}

// ── Entity card ───────────────────────────────────────────────

function EntityCard({ entity }: { entity: EntityMemoryEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-medium text-slate-100">{entity.label}</p>
          <p className="text-xs text-slate-600">{entity.entityId}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {trendIcon(entity.trendDirection)}
          <span className="text-xs text-slate-400 capitalize">{entity.trendDirection}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-100">{entity.mentions}</p>
          <p className="text-[10px] text-slate-600">Total</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-100">{entity.mentionsLast24h}</p>
          <p className="text-[10px] text-slate-600">24h</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-100">{entity.mentionsLast7d}</p>
          <p className="text-[10px] text-slate-600">7d</p>
        </div>
      </div>

      {entity.relatedEntities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {entity.relatedEntities.slice(0, 5).map((r) => (
            <span key={r} className="text-[10px] text-slate-500 bg-slate-800 rounded px-1.5 py-0.5">
              {r}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
      >
        {expanded ? "Hide" : "Show"} recent developments ({entity.recentDevelopments.length})
      </button>

      {expanded && entity.recentDevelopments.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-slate-800 pt-2">
          {entity.recentDevelopments.slice(-4).reverse().map((d, i) => (
            <div key={i} className="text-xs text-slate-400">
              <span className={`mr-1.5 ${d.relevance === "high" ? "text-amber-400" : d.relevance === "medium" ? "text-blue-400" : "text-slate-600"}`}>
                ●
              </span>
              {d.headline}
              <span className="ml-1.5 text-slate-600">{relativeTime(d.recordedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function EntitiesDebugPage() {
  const [, navigate] = useLocation();
  const [entities, setEntities] = useState<EntityMemoryEntry[]>([]);
  const [adaptive, setAdaptive] = useState<AdaptiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"entities" | "learned" | "clusters">("entities");

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/debug/entities`).then((r) => r.json()),
      fetch(`${BASE}/api/adaptive/state`).then((r) => r.json()),
    ])
      .then(([entityData, adaptiveData]) => {
        setEntities(entityData.entities ?? []);
        setAdaptive(adaptiveData.adaptiveInterests ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredEntities = entities.filter(
    (e) =>
      !search ||
      e.label.toLowerCase().includes(search.toLowerCase()) ||
      e.entityId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/debug/relevance")}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Network size={16} className="text-blue-400" />
              Entity Relationship Map
            </h1>
            <p className="text-xs text-slate-500">Live entity intelligence + learned relationships</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-slate-100">{entities.length}</p>
            <p className="text-xs text-slate-500">Tracked entities</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-slate-100">{adaptive?.totalLearnedEdges ?? 0}</p>
            <p className="text-xs text-slate-500">Learned edges</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-slate-100">{adaptive?.expansionClusters.length ?? 0}</p>
            <p className="text-xs text-slate-500">Clusters found</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          {[
            { id: "entities" as const, label: "Entity Memory", icon: Activity },
            { id: "learned" as const, label: "Learned Edges", icon: GitBranch },
            { id: "clusters" as const, label: "Expansion Clusters", icon: Layers },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                tab === id
                  ? "bg-slate-800 text-slate-200"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>

        {/* Search (entities tab) */}
        {tab === "entities" && (
          <div className="relative mb-4">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entities..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500"
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tab === "entities" ? (
          filteredEntities.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <Network size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No entities tracked yet</p>
              <p className="text-xs mt-1">Load your personal feed to populate entity memory</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntities.map((entity) => (
                <EntityCard key={entity.entityId} entity={entity} />
              ))}
            </div>
          )
        ) : tab === "learned" ? (
          !adaptive || adaptive.topLearnedEdges.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <GitBranch size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No learned edges yet</p>
              <p className="text-xs mt-1">Engage with articles to teach the system your interests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {adaptive.topLearnedEdges.map((edge, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-200 font-medium truncate">{edge.from}</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-slate-200 font-medium truncate">{edge.to}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{edge.coOccurrences} co-occurrences</span>
                      <span>last {relativeTime(edge.lastSeen)}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {confidenceBar(edge.effectiveConfidence)}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          !adaptive || adaptive.expansionClusters.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <Layers size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No expansion clusters detected yet</p>
              <p className="text-xs mt-1">Clusters form when entities consistently co-occur in your reading</p>
            </div>
          ) : (
            <div className="space-y-3">
              {adaptive.expansionClusters.map((cluster, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-slate-100">{cluster.label}</p>
                    {confidenceBar(cluster.confidence)}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cluster.coreEntities.map((e) => (
                      <span key={e} className="text-xs text-slate-400 bg-slate-800 border border-slate-700 rounded px-2 py-0.5">
                        {e}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-2">Detected {relativeTime(cluster.detectedAt)}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

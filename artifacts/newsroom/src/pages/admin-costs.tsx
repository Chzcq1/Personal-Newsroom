import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  Database,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CostData {
  provider: string;
  providerLabel: string;
  requests: {
    total: number;
    cacheHits: number;
    cacheMisses: number;
    hitRatePercent: number;
    fallbackCount: number;
    avgGenerationTimeMs: number;
  };
  tokens: {
    totalInputEstimate: number;
    totalOutputEstimate: number;
    totalArticlesCollected: number;
  };
  cost: {
    estimatedTotalUSD: number;
    estimatedDailyUSD: number;
    estimatedMonthlyUSD: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    currentEntries: number;
    entries: Array<{
      topicId: string;
      generatedAt: string;
      expiresAt: string;
      articleCount: number;
    }>;
  };
  trendMemory: {
    entryCount: number;
    entries: Array<{
      topicId: string;
      briefingHeadline: string;
      headlineCount: number;
      storedAt: string;
      expiresAt: string;
    }>;
  };
  recentRequests: Array<{
    timestamp: string;
    topicId: string;
    cacheHit: boolean;
    inputTokensEstimate: number;
    outputTokensEstimate: number;
    generationTimeMs: number;
    articleCount: number;
    preprocessedArticles: number;
    provider: string;
    fallbackMode: boolean;
  }>;
  generatedAt: string;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const bg = {
    slate: "bg-slate-50",
    green: "bg-green-50",
    blue: "bg-blue-50",
    purple: "bg-purple-50",
    amber: "bg-amber-50",
    red: "bg-red-50",
  }[color] ?? "bg-slate-50";

  return (
    <Card>
      <CardContent className={`p-4 ${bg}`}>
        <div className="flex items-center gap-2 mb-2 text-slate-500">{icon}<span className="text-xs font-medium">{label}</span></div>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminCostsPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<CostData>({
    queryKey: ["admin-costs"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/costs`);
      if (!res.ok) throw new Error("Failed to fetch cost data");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-slate-800">Cost Analytics</h1>
              <p className="text-xs text-slate-400">
                {data ? `Provider: ${data.providerLabel}` : "Loading..."}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-6">
        {isLoading && (
          <div className="text-center py-16 text-slate-400 text-sm">Loading analytics...</div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Failed to load analytics. Is the API server running?
          </div>
        )}

        {data && (
          <>
            {/* Requests overview */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">AI Requests</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard icon={<Activity className="w-4 h-4" />} label="Total Requests" value={data.requests.total} color="blue" />
                <StatCard
                  icon={<CheckCircle className="w-4 h-4 text-green-500" />}
                  label="Cache Hits"
                  value={data.requests.cacheHits}
                  sub={`${data.requests.hitRatePercent}% hit rate`}
                  color="green"
                />
                <StatCard
                  icon={<XCircle className="w-4 h-4 text-amber-500" />}
                  label="Cache Misses"
                  value={data.requests.cacheMisses}
                  color="amber"
                />
                <StatCard
                  icon={<Clock className="w-4 h-4" />}
                  label="Avg Gen Time"
                  value={data.requests.avgGenerationTimeMs > 0 ? `${(data.requests.avgGenerationTimeMs / 1000).toFixed(1)}s` : "—"}
                  color="slate"
                />
                <StatCard
                  icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
                  label="Fallback Mode"
                  value={data.requests.fallbackCount}
                  sub="AI unavailable"
                  color={data.requests.fallbackCount > 0 ? "amber" : "slate"}
                />
                <StatCard
                  icon={<Database className="w-4 h-4 text-violet-500" />}
                  label="Active Cache"
                  value={data.cache.currentEntries}
                  sub="entries"
                  color="purple"
                />
              </div>
            </section>

            {/* Token usage */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Token Usage (estimated)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  icon={<Zap className="w-4 h-4 text-blue-500" />}
                  label="Input Tokens"
                  value={data.tokens.totalInputEstimate.toLocaleString()}
                  sub="~4 chars/token"
                  color="blue"
                />
                <StatCard
                  icon={<Zap className="w-4 h-4 text-purple-500" />}
                  label="Output Tokens"
                  value={data.tokens.totalOutputEstimate.toLocaleString()}
                  color="purple"
                />
                <StatCard
                  icon={<TrendingUp className="w-4 h-4 text-slate-500" />}
                  label="Articles Collected"
                  value={data.tokens.totalArticlesCollected.toLocaleString()}
                  color="slate"
                />
              </div>
            </section>

            {/* Cost estimates */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cost Estimates (USD)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
                  label="Session Total"
                  value={`$${data.cost.estimatedTotalUSD.toFixed(5)}`}
                  sub="since server start"
                  color="green"
                />
                <StatCard
                  icon={<DollarSign className="w-4 h-4 text-blue-500" />}
                  label="Estimated Daily"
                  value={`$${data.cost.estimatedDailyUSD.toFixed(4)}`}
                  sub="extrapolated"
                  color="blue"
                />
                <StatCard
                  icon={<DollarSign className="w-4 h-4 text-violet-500" />}
                  label="Estimated Monthly"
                  value={`$${data.cost.estimatedMonthlyUSD.toFixed(2)}`}
                  sub="30 days"
                  color="purple"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Pricing: {data.providerLabel}. Estimates are approximate based on ~4 chars/token.
                Cache hits save 100% of generation cost.
              </p>
            </section>

            {/* Cache entries */}
            {data.cache.entries.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Active Cache Entries ({data.cache.entries.length})
                </h2>
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {data.cache.entries.map((entry) => (
                    <div key={entry.topicId} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <span className="text-xs font-semibold text-slate-700 uppercase">{entry.topicId}</span>
                        <span className="text-xs text-slate-400 ml-2">{entry.articleCount} articles</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Generated {format(new Date(entry.generatedAt), "HH:mm:ss")}</p>
                        <p className="text-[10px] text-slate-400">Expires {format(new Date(entry.expiresAt), "HH:mm:ss")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Trend memory */}
            {data.trendMemory.entries.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Trend Memory ({data.trendMemory.entryCount} topics)
                </h2>
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {data.trendMemory.entries.map((entry) => (
                    <div key={entry.topicId} className="px-4 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700 uppercase">{entry.topicId}</span>
                        <span className="text-[10px] text-slate-400">Stored {format(new Date(entry.storedAt), "HH:mm")}</span>
                      </div>
                      <p className="text-xs text-slate-500 italic truncate">{entry.briefingHeadline}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent requests log */}
            {data.recentRequests.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Recent Requests (last {data.recentRequests.length})
                </h2>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-3 py-2 font-semibold text-slate-500">Time</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-500">Topic</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-500">Status</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-500">In Tokens</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-500">Out Tokens</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-500">Gen Time</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-500">Articles</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.recentRequests.map((req, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-400">{format(new Date(req.timestamp), "HH:mm:ss")}</td>
                            <td className="px-3 py-2 font-medium text-slate-700 uppercase">{req.topicId}</td>
                            <td className="px-3 py-2">
                              {req.cacheHit ? (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-semibold">CACHE</span>
                              ) : req.fallbackMode ? (
                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-semibold">FALLBACK</span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-semibold">AI</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-500">{req.cacheHit ? "—" : req.inputTokensEstimate.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-slate-500">{req.outputTokensEstimate.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-slate-500">
                              {req.cacheHit ? "—" : `${(req.generationTimeMs / 1000).toFixed(1)}s`}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-500">
                              {req.cacheHit ? "—" : `${req.preprocessedArticles}/${req.articleCount}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Articles shown as preprocessed/raw. In/out tokens are estimates (÷4 chars).
                </p>
              </section>
            )}

            {data.requests.total === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No requests tracked yet.</p>
                <p className="text-xs mt-1">Generate a briefing on the home page to start tracking.</p>
              </div>
            )}

            <p className="text-[10px] text-slate-400 text-center pb-2">
              Last updated: {format(new Date(data.generatedAt), "HH:mm:ss")} · Resets on server restart
            </p>
          </>
        )}
      </main>
    </div>
  );
}

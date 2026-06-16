// ============================================================
// SOURCE TRUST DASHBOARD — Sprint 18 Task B admin page
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, XCircle, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface TrustProfile {
  sourceId: string;
  sourceName: string;
  trustScore: number;
  stabilityClass: string;
  factualConsistency: number;
  signalQuality: number;
  noiseRatio: number;
  clickbaitLikelihood: number;
  observationCount: number;
  hasRepeatedMisinformation: boolean;
  isClickbaitHeavy: boolean;
  lastActive: string;
}

interface TrustData {
  ok: boolean;
  snapshot: {
    totalSources: number;
    avgTrustScore: number;
    byStability: Record<string, number>;
    misinformationFlaggedCount: number;
  };
  profiles: TrustProfile[];
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] text-white/40 font-mono w-6 text-right">{Math.round(value)}</span>
    </div>
  );
}

function StabilityBadge({ cls }: { cls: string }) {
  const config: Record<string, { color: string; label: string }> = {
    tier_one: { color: "text-emerald-400 bg-emerald-400/10", label: "Tier 1" },
    reliable: { color: "text-blue-400 bg-blue-400/10", label: "Reliable" },
    mixed: { color: "text-yellow-400 bg-yellow-400/10", label: "Mixed" },
    unreliable: { color: "text-orange-400 bg-orange-400/10", label: "Unreliable" },
    toxic: { color: "text-red-400 bg-red-400/10", label: "Toxic" },
  };
  const c = config[cls] ?? config.mixed;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${c.color}`}>
      {c.label}
    </span>
  );
}

export default function SourceTrustPage() {
  const { data, isLoading, error } = useQuery<TrustData>({
    queryKey: ["source-trust"],
    queryFn: async () => {
      const res = await fetch("/api/admin/source-trust");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Source Trust Engine</h1>
            <p className="text-xs text-white/40">Per-source reputation & reliability scoring</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        )}

        {error && (
          <Card className="bg-red-950/30 border-red-500/20">
            <CardContent className="p-4 text-red-400 text-sm">Failed to load source trust data</CardContent>
          </Card>
        )}

        {data && (
          <>
            {/* Snapshot */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Sources", value: data.snapshot.totalSources, icon: Shield, color: "text-blue-400" },
                { label: "Avg Trust Score", value: Math.round(data.snapshot.avgTrustScore), icon: CheckCircle, color: "text-emerald-400" },
                { label: "Misinformation Flags", value: data.snapshot.misinformationFlaggedCount, icon: AlertTriangle, color: "text-orange-400" },
                { label: "Toxic Sources", value: data.snapshot.byStability.toxic ?? 0, icon: XCircle, color: "text-red-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="bg-white/3 border-white/10">
                  <CardContent className="p-4">
                    <Icon className={`w-4 h-4 mb-2 ${color}`} />
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stability distribution */}
            <Card className="bg-white/3 border-white/10">
              <CardHeader className="pb-3">
                <h2 className="text-sm font-semibold text-white/70">Stability Distribution</h2>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(data.snapshot.byStability).map(([cls, count]) => (
                    <div key={cls} className="flex items-center gap-2">
                      <StabilityBadge cls={cls} />
                      <span className="text-white/60 text-sm font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Source profiles */}
            {data.profiles.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-white/30 uppercase tracking-wider">Source Profiles</p>
                {data.profiles.map((profile) => (
                  <Card key={profile.sourceId} className="bg-white/3 border-white/10 hover:bg-white/5 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-medium text-white truncate">{profile.sourceName}</p>
                            <StabilityBadge cls={profile.stabilityClass} />
                            {profile.hasRepeatedMisinformation && (
                              <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">⚠ Misinfo</span>
                            )}
                            {profile.isClickbaitHeavy && (
                              <span className="text-[10px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">Clickbait</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <p className="text-[10px] text-white/30 mb-1">Factual</p>
                              <ScoreBar value={profile.factualConsistency} color="bg-emerald-400" />
                            </div>
                            <div>
                              <p className="text-[10px] text-white/30 mb-1">Signal</p>
                              <ScoreBar value={profile.signalQuality} color="bg-blue-400" />
                            </div>
                            <div>
                              <p className="text-[10px] text-white/30 mb-1">Noise</p>
                              <ScoreBar value={profile.noiseRatio} color="bg-orange-400" />
                            </div>
                            <div>
                              <p className="text-[10px] text-white/30 mb-1">Clickbait</p>
                              <ScoreBar value={profile.clickbaitLikelihood} color="bg-red-400" />
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-2xl font-bold text-white">{Math.round(profile.trustScore)}</p>
                          <p className="text-[10px] text-white/30">trust score</p>
                          <p className="text-[10px] text-white/20 mt-1">{profile.observationCount} obs</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-white/3 border-white/10">
                <CardContent className="p-8 text-center">
                  <TrendingDown className="w-8 h-8 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No source observations yet</p>
                  <p className="text-white/25 text-xs mt-1">Trust scores build up as articles are collected</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

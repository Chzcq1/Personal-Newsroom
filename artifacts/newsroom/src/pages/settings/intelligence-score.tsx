import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Clock, Zap, Filter, BookmarkCheck, TrendingUp, BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CompoundRate {
  estimatedHoursSaved: number;
  estimatedMinutesSaved: number;
  signalAccuracyRate: number;
  noiseFilteredCount: number;
  noiseFilteredPercent: number;
  alertsDelivered: number;
  narrativesFollowed: number;
  highValueReads: number;
  totalBriefings: number;
  totalArticlesDelivered: number;
  periodDays: number;
  compoundInsight: string;
}

interface WeeklySummary {
  daily: Array<{ date: string; briefings: number; minutesSaved: number; noiseFiltered: number }>;
  weeklyRate: CompoundRate;
}

function StatCard({ icon, label, value, sub, color = "zinc" }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    amber: "text-amber-400",
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    zinc: "text-zinc-300",
  };
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${colorMap[color] ?? "text-zinc-300"}`}>{icon}</div>
          <div>
            <div className="text-2xl font-bold text-zinc-100 tracking-tight">{value}</div>
            <div className="text-xs text-zinc-400 mt-0.5 uppercase tracking-wide">{label}</div>
            {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniBar({ value, max, color = "amber" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colorMap: Record<string, string> = {
    amber: "bg-amber-500",
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
  };
  return (
    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${colorMap[color] ?? "bg-amber-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function IntelligenceScorePage() {
  const [data, setData] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 14 | 30>(7);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/intelligence/compound?days=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const rate = data?.weeklyRate;
  const maxMinutes = data?.daily
    ? Math.max(...data.daily.map((d) => d.minutesSaved), 1)
    : 1;
  const maxFiltered = data?.daily
    ? Math.max(...data.daily.map((d) => d.noiseFiltered), 1)
    : 1;

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/settings">
            <button className="p-2 rounded-lg hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-zinc-200">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Intelligence Score</h1>
            <p className="text-xs text-zinc-500 mt-0.5">คุณค่าที่ INFOX มอบให้คุณ</p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-2 mb-6">
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={[
                "px-4 py-1.5 rounded-lg text-xs font-medium transition-colors",
                period === d
                  ? "bg-amber-500 text-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
              ].join(" ")}
            >
              {d} วัน
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-5 h-5 text-zinc-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Hero metric */}
            {rate && rate.estimatedMinutesSaved > 0 && (
              <Card className="bg-zinc-950 border-zinc-800 mb-6">
                <CardContent className="pt-6 pb-5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">ประหยัดเวลาได้</p>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-bold text-amber-400 tracking-tight">
                      {rate.estimatedHoursSaved >= 1
                        ? `${Math.floor(rate.estimatedHoursSaved)}h ${rate.estimatedMinutesSaved % 60}m`
                        : `${rate.estimatedMinutesSaved}m`}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-2">{rate.compoundInsight}</p>
                </CardContent>
              </Card>
            )}

            {/* Stat grid */}
            {rate && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <StatCard
                  icon={<Zap className="w-4 h-4" />}
                  label="ความแม่นยำสัญญาณ"
                  value={`${rate.signalAccuracyRate}%`}
                  sub="high-signal ratio"
                  color="amber"
                />
                <StatCard
                  icon={<Filter className="w-4 h-4" />}
                  label="กรองข่าวออก"
                  value={rate.noiseFilteredCount}
                  sub={`${rate.noiseFilteredPercent}% ของทั้งหมด`}
                  color="cyan"
                />
                <StatCard
                  icon={<BookmarkCheck className="w-4 h-4" />}
                  label="บันทึกแล้ว"
                  value={rate.highValueReads}
                  sub="high-value reads"
                  color="emerald"
                />
                <StatCard
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="เรื่องราวต่อเนื่อง"
                  value={rate.narrativesFollowed}
                  sub="narratives tracked"
                  color="zinc"
                />
              </div>
            )}

            {/* Daily breakdown */}
            {data?.daily && data.daily.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    รายวัน
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.daily.map((day) => {
                      const d = new Date(day.date);
                      const label = d.toLocaleDateString("th-TH", {
                        weekday: "short", day: "numeric", month: "short",
                      });
                      return (
                        <div key={day.date}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-zinc-400">{label}</span>
                            <span className="text-zinc-500">
                              {day.briefings} briefing{day.briefings !== 1 ? "s" : ""}
                              {day.minutesSaved > 0 && ` · ${day.minutesSaved}m saved`}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <MiniBar value={day.minutesSaved} max={maxMinutes} color="amber" />
                            <MiniBar value={day.noiseFiltered} max={maxFiltered} color="cyan" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-4 pt-3 border-t border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs text-zinc-500">เวลาที่ประหยัด</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                      <span className="text-xs text-zinc-500">ข่าวที่กรองออก</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(!rate || rate.totalBriefings === 0) && (
              <div className="text-center py-12 text-zinc-500">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">เริ่มอ่าน briefing เพื่อสะสม intelligence score</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

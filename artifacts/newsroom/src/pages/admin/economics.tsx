import { useQuery } from "@tanstack/react-query";
import { DollarSign, Users, Send, Zap, TrendingUp, Server, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EconomicsPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["economics-summary"],
    queryFn: () => fetchJson("/api/economics/summary"),
    refetchInterval: 60_000,
  });

  const { data: delivery, isLoading: loadingDelivery } = useQuery({
    queryKey: ["economics-delivery"],
    queryFn: () => fetchJson("/api/economics/delivery"),
    refetchInterval: 60_000,
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["economics-users"],
    queryFn: () => fetchJson("/api/economics/users"),
    refetchInterval: 60_000,
  });

  const { data: infra } = useQuery({
    queryKey: ["economics-infra"],
    queryFn: () => fetchJson("/api/economics/infrastructure"),
    refetchInterval: 120_000,
  });

  const s = summary?.summary;
  const u = users?.users;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Economics</h1>
        <p className="text-muted-foreground mt-1">
          Cost visibility, delivery efficiency, and sustainability metrics
        </p>
      </div>

      {/* Infrastructure Health */}
      {infra?.startupReport && (
        <Card className={infra.startupReport.degradedMode ? "border-amber-500" : "border-emerald-500"}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {infra.startupReport.degradedMode ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              )}
              <span className="text-sm font-medium">
                {infra.startupReport.degradedMode
                  ? "Degraded Mode — DB unavailable, using in-memory fallback"
                  : `Full Persistence Mode — DB latency ${infra.startupReport.dbLatencyMs}ms`}
              </span>
            </div>
            {infra.startupReport.warnings.length > 0 && (
              <ul className="mt-2 space-y-1">
                {infra.startupReport.warnings.map((w: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground">• {w}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cost Overview */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Cost Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={DollarSign}
            label="Total Cost (USD)"
            value={loadingSummary ? "..." : `$${s?.totalCostUsd ?? "0.0000"}`}
            sub="All-time AI + delivery"
            color="text-emerald-600"
          />
          <StatCard
            icon={Zap}
            label="AI Generation Cost"
            value={loadingSummary ? "..." : `$${s?.estimatedAiCostUsd ?? "0.0000"}`}
            sub={`${(s?.totalTokensUsed ?? 0).toLocaleString()} tokens`}
          />
          <StatCard
            icon={Send}
            label="Cost per Delivery"
            value={loadingSummary ? "..." : `$${s?.costPerDelivery ?? "0.000000"}`}
            sub={`${s?.totalDeliveries ?? 0} total deliveries`}
          />
          <StatCard
            icon={Users}
            label="Cost per User"
            value={loadingSummary ? "..." : `$${s?.costPerUser ?? "0.000000"}`}
            sub={`${u?.total ?? 0} profiles`}
          />
        </div>
      </div>

      {/* Delivery Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Delivery Performance
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={CheckCircle}
            label="Success Rate"
            value={loadingSummary ? "..." : `${s?.successRate ?? 100}%`}
            sub={`${s?.totalDeliveries ?? 0} total`}
            color={s?.successRate >= 95 ? "text-emerald-600" : "text-amber-600"}
          />
          <StatCard
            icon={Send}
            label="Queue Pending"
            value={loadingSummary ? "..." : s?.queuePending ?? 0}
            sub="Awaiting delivery"
            color={s?.queuePending > 0 ? "text-amber-600" : "text-foreground"}
          />
          <StatCard
            icon={AlertTriangle}
            label="Queue Failed"
            value={loadingSummary ? "..." : s?.queueFailed ?? 0}
            sub="Need attention"
            color={s?.queueFailed > 0 ? "text-red-600" : "text-foreground"}
          />
          <StatCard
            icon={TrendingUp}
            label="7-Day Deliveries"
            value={loadingDelivery ? "..." : delivery?.last7Days?.deliveries ?? 0}
            sub="Last 7 days"
          />
        </div>
      </div>

      {/* User Metrics */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          User Growth
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Profiles" value={loadingUsers ? "..." : u?.total ?? 0} sub="Anonymous identities" />
          <StatCard icon={TrendingUp} label="Active (7d)" value={loadingUsers ? "..." : u?.activeLastWeek ?? 0} sub="Seen this week" />
          <StatCard icon={TrendingUp} label="Active (30d)" value={loadingUsers ? "..." : u?.activeLastMonth ?? 0} sub="Seen this month" />
          <StatCard
            icon={CheckCircle}
            label="Founding Members"
            value={loadingUsers ? "..." : u?.foundingMembers ?? 0}
            sub={`${u?.onboardingRate ?? 0}% onboarded`}
            color="text-violet-600"
          />
        </div>
      </div>

      {/* Delivery by Type */}
      {delivery?.last7Days?.byType && Object.keys(delivery.last7Days.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery Cost by Type (7 days)</CardTitle>
            <CardDescription>AI generation cost broken down by briefing type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(delivery.last7Days.byType).map(([type, data]: [string, any]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{type}</Badge>
                    <span className="text-sm text-muted-foreground">{data.count} deliveries</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono">${data.costUsd.toFixed(6)}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {(data.tokens / 1000).toFixed(1)}K tokens
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Infrastructure Cost Estimates */}
      {infra?.monthlyInfraEstimatesUsd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Infrastructure Cost Estimates</CardTitle>
            <CardDescription>Approximate hosting costs by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(infra.monthlyInfraEstimatesUsd).map(([platform, cost]: [string, any]) => (
                <div key={platform} className="text-center p-3 rounded-lg border bg-muted/50">
                  <Server className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground capitalize">{platform.replace(/([A-Z])/g, " $1").trim()}</div>
                  <div className="text-sm font-semibold mt-1">
                    {cost === 0 ? "Free" : `$${cost}/mo`}
                  </div>
                </div>
              ))}
            </div>
            <ul className="mt-4 space-y-1">
              {infra.notes?.map((note: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground">• {note}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

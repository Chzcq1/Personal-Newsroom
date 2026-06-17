import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users, Zap, Send, Activity, Database, Server, AlertTriangle,
  CheckCircle2, XCircle, TrendingUp, BarChart3, Clock, Shield,
  RefreshCw, ArrowRight, Radio, Layers, DollarSign, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/hooks/useAnalytics";

// ── fetch helpers ────────────────────────────────────────────

function api(path: string) {
  return `${import.meta.env.BASE_URL ?? "/"}api${path}`;
}

async function fetchJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ── small primitives ─────────────────────────────────────────

function Metric({
  label,
  value,
  sub,
  accent = "text-foreground",
  warn = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-muted/40 rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${warn ? "text-amber-500" : accent}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
      {children}
    </h2>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`}
    />
  );
}

// ── Alert banner ─────────────────────────────────────────────

interface Alert {
  severity: "critical" | "warning" | "info";
  message: string;
  metric: string;
}

function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const criticals = alerts.filter((a) => a.severity === "critical");
  const warnings = alerts.filter((a) => a.severity === "warning");

  if (criticals.length === 0 && warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">All systems operational</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {criticals.map((a, i) => (
        <div key={i} className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{a.message}</span>
        </div>
      ))}
      {warnings.map((a, i) => (
        <div key={i} className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="text-sm">{a.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Funnel row ───────────────────────────────────────────────

function FunnelRow({
  stage,
  count,
  pct,
  label,
}: {
  stage: string;
  count: number;
  pct: number;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{stage}</span>
        <span className="text-muted-foreground tabular-nums">
          {count.toLocaleString()} <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────

export default function CommandCenterPage() {
  const trackedRef = useRef(false);
  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackEvent("PAGE_VIEW", { page: "admin_command_center" });
    }
  }, []);

  // ── Data fetching ──────────────────────────────────────────

  const { data: analytics, isLoading: loadingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["cc-analytics"],
    queryFn: () => fetchJson(api("/admin/analytics")),
    refetchInterval: 60_000,
  });

  const { data: usage } = useQuery({
    queryKey: ["cc-usage"],
    queryFn: () => fetchJson(api("/admin/analytics/usage")),
    refetchInterval: 120_000,
  });

  const { data: features } = useQuery({
    queryKey: ["cc-features"],
    queryFn: () => fetchJson(api("/admin/analytics/features")),
    refetchInterval: 120_000,
  });

  const { data: funnel } = useQuery({
    queryKey: ["cc-funnel"],
    queryFn: () => fetchJson(api("/admin/analytics/funnel")),
    refetchInterval: 120_000,
  });

  const { data: alertsData } = useQuery({
    queryKey: ["cc-alerts"],
    queryFn: () => fetchJson(api("/admin/analytics/alerts")),
    refetchInterval: 30_000,
  });

  const { data: economics } = useQuery({
    queryKey: ["cc-economics"],
    queryFn: () => fetchJson(api("/economics/summary")),
    refetchInterval: 120_000,
  });

  const { data: tokenGov } = useQuery({
    queryKey: ["cc-token-gov"],
    queryFn: () => fetchJson(api("/admin/token-governor")),
    refetchInterval: 30_000,
  });

  const { data: workers } = useQuery({
    queryKey: ["cc-workers"],
    queryFn: () => fetchJson(api("/admin/pipeline")),
    refetchInterval: 30_000,
  });

  const { data: health } = useQuery({
    queryKey: ["cc-health"],
    queryFn: () => fetchJson(api("/health")),
    refetchInterval: 30_000,
  });

  const { data: infra } = useQuery({
    queryKey: ["cc-infra"],
    queryFn: () => fetchJson(api("/economics/infrastructure")),
    refetchInterval: 180_000,
  });

  // ── Derived values ─────────────────────────────────────────

  const snap = analytics?.snapshot;
  const econ = economics?.summary;
  const tg = tokenGov;
  const alerts: Alert[] = alertsData?.alerts ?? [];
  const workerPipeline = workers?.pipeline;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">
            Single operational view — users, economics, delivery, system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAnalytics()}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="h-3.5 w-3.5" />
              Users
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Alerts ──────────────────────────────────────────── */}
      {alertsData && <AlertBanner alerts={alerts} />}

      {/* ── BUSINESS ────────────────────────────────────────── */}
      <section>
        <SectionTitle>Business</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric
            label="Total Users"
            value={loadingAnalytics ? "…" : (snap?.users.total ?? 0).toLocaleString()}
            sub="Anonymous profiles"
            accent="text-violet-600"
          />
          <Metric
            label="Active (DAU)"
            value={loadingAnalytics ? "…" : (snap?.users.dau ?? 0)}
            sub="Last 24 hours"
          />
          <Metric
            label="Active (WAU)"
            value={loadingAnalytics ? "…" : (snap?.users.wau ?? 0)}
            sub="Last 7 days"
          />
          <Metric
            label="Active (MAU)"
            value={loadingAnalytics ? "…" : (snap?.users.mau ?? 0)}
            sub="Last 30 days"
          />
        </div>

        {/* Conversion funnel */}
        {funnel?.funnel && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {funnel.funnel.map((f: { stage: string; count: number; pct: number; label: string }) => (
                <FunnelRow key={f.stage} {...f} />
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── AI ECONOMICS ────────────────────────────────────── */}
      <section>
        <SectionTitle>AI Economics</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric
            label="Total Cost (USD)"
            value={econ ? `$${econ.totalCostUsd}` : "…"}
            sub="All-time"
            accent="text-emerald-600"
          />
          <Metric
            label="Cost per User"
            value={econ ? `$${econ.costPerUser}` : "…"}
            sub={`${econ?.profileCount ?? 0} profiles`}
          />
          <Metric
            label="Cost per Delivery"
            value={econ ? `$${econ.costPerDelivery}` : "…"}
            sub={`${econ?.totalDeliveries ?? 0} total`}
          />
          <Metric
            label="Total Tokens"
            value={econ ? `${Math.round((econ.totalTokensUsed ?? 0) / 1000)}K` : "…"}
            sub="Input + output"
          />
        </div>

        {/* Token governor */}
        {tg && (
          <Card className="mt-4">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Daily Token Budget</span>
                <Badge
                  variant={tg.budgetExhausted ? "destructive" : tg.budgetFraction > 0.85 ? "secondary" : "outline"}
                  className="capitalize"
                >
                  {tg.pressureLevel} pressure
                </Badge>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    tg.budgetFraction > 0.9
                      ? "bg-red-500"
                      : tg.budgetFraction > 0.7
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.round(tg.budgetFraction * 100))}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {(tg.dailyUsed ?? 0).toLocaleString()} / {(tg.dailyBudget ?? 0).toLocaleString()} tokens used
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── PRODUCT ─────────────────────────────────────────── */}
      <section>
        <SectionTitle>Product</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric
            label="Page Views (24h)"
            value={usage?.usage?.pageViews24h ?? "…"}
            sub="Tracked sessions"
          />
          <Metric
            label="Feed Views (24h)"
            value={usage?.usage?.feedViews24h ?? "…"}
            sub="Feed page opens"
          />
          <Metric
            label="Article Opens (24h)"
            value={usage?.usage?.articleOpens24h ?? "…"}
            sub="Engagement"
          />
          <Metric
            label="Briefings Saved"
            value={econ ? (snap?.events?.last24h?.byType?.["BRIEFING_SAVE"] ?? 0) : "…"}
            sub="Last 24h"
            accent="text-violet-600"
          />
        </div>

        {/* Feature popularity */}
        {features?.features && features.features.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Feature Popularity (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {features.features.slice(0, 8).map(
                  (f: { key: string; label: string; events7d: number; category: string }) => (
                    <div key={f.key} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{f.category}</Badge>
                        <span className="text-sm">{f.label}</span>
                      </div>
                      <span className="text-sm font-mono text-muted-foreground">
                        {f.events7d.toLocaleString()}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── DELIVERY ────────────────────────────────────────── */}
      <section>
        <SectionTitle>Delivery</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric
            label="Success Rate"
            value={econ ? `${econ.successRate ?? 100}%` : "…"}
            sub={`${econ?.totalDeliveries ?? 0} total`}
            accent={econ?.successRate >= 95 ? "text-emerald-600" : "text-amber-600"}
          />
          <Metric
            label="Telegram"
            value={health?.telegramConfigured ? "Active" : "Inactive"}
            sub={health?.telegramConfigured ? "Configured" : "Set token in secrets"}
            accent={health?.telegramConfigured ? "text-emerald-600" : "text-muted-foreground"}
          />
          <Metric
            label="Queue Pending"
            value={econ?.queuePending ?? "…"}
            sub="Awaiting delivery"
            warn={(econ?.queuePending ?? 0) > 0}
          />
          <Metric
            label="Queue Failed"
            value={econ?.queueFailed ?? "…"}
            sub="Need attention"
            warn={(econ?.queueFailed ?? 0) > 0}
          />
        </div>
        <div className="mt-3">
          <Link href="/delivery-studio">
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              Delivery Studio <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── SYSTEM ──────────────────────────────────────────── */}
      <section>
        <SectionTitle>System</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Health checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Infrastructure Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: "Database",
                  ok: !infra?.startupReport?.degradedMode,
                  detail: infra?.startupReport?.degradedMode
                    ? "Degraded — using in-memory fallback"
                    : `Connected · ${infra?.startupReport?.dbLatencyMs ?? "?"}ms latency`,
                },
                {
                  label: "AI Provider",
                  ok: health?.aiProviderWorking,
                  detail: health?.aiProviderDetail ?? "Checking…",
                },
                {
                  label: "RSS Feeds",
                  ok: health?.rssFeedsWorking,
                  detail: health?.rssFeedDetail ?? "Checking…",
                },
                {
                  label: "Persistence Mode",
                  ok: !infra?.startupReport?.degradedMode,
                  detail: infra?.startupReport?.degradedMode ? "Degraded" : "Full persistence",
                },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <StatusDot ok={!!row.ok} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Workers + degradation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Runtime
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Degradation level</span>
                <Badge
                  variant={
                    (workerPipeline?.degradationLevel ?? 0) === 0
                      ? "outline"
                      : (workerPipeline?.degradationLevel ?? 0) >= 3
                      ? "destructive"
                      : "secondary"
                  }
                >
                  Level {workerPipeline?.degradationLevel ?? 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Signal mode</span>
                <Badge variant="outline" className="capitalize">
                  {workerPipeline?.signalMode ?? "balanced"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Token pressure</span>
                <Badge
                  variant={workerPipeline?.tokenPressure === "critical" ? "destructive" : "outline"}
                  className="capitalize"
                >
                  {workerPipeline?.tokenPressure ?? "normal"}
                </Badge>
              </div>
              <div className="border-t border-border pt-3 flex items-center gap-3 flex-wrap">
                <Link href="/admin/efficiency">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground h-7">
                    Efficiency <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
                <Link href="/admin/economics">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground h-7">
                    Economics <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
                <Link href="/admin/debug">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground h-7">
                    Debug <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

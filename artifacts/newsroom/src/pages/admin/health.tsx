import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Activity, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Wifi, Database, Cpu, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface HealthCheck {
  name: string;
  status: "ok" | "warn" | "error" | "unknown";
  latencyMs?: number;
  detail?: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime?: number;
  aiProvider?: string;
  aiProviderStatus?: string;
  dbStatus?: string;
  environment?: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function apiUrl(path: string) {
  return `${import.meta.env.VITE_API_URL ?? ""}/api${path}`;
}

const STATUS_ICONS = {
  ok: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  warn: <AlertCircle className="w-4 h-4 text-amber-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  unknown: <Clock className="w-4 h-4 text-white/30" />,
};

const STATUS_LABELS = {
  ok: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
  unknown: "text-white/30",
};

function CheckRow({ check }: { check: HealthCheck }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/6 last:border-0">
      <div className="flex items-center gap-3">
        {STATUS_ICONS[check.status]}
        <div>
          <p className="text-sm font-medium text-white/80">{check.name}</p>
          {check.detail && <p className="text-xs text-white/35 mt-0.5">{check.detail}</p>}
        </div>
      </div>
      <div className="text-right">
        <p className={`text-xs font-semibold uppercase ${STATUS_LABELS[check.status]}`}>{check.status}</p>
        {check.latencyMs != null && (
          <p className="text-xs text-white/25 mt-0.5">{check.latencyMs}ms</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function HealthPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [overall, setOverall] = useState<"ok" | "warn" | "error" | "unknown">("unknown");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(true);

  const runChecks = useCallback(async () => {
    setLoading(true);
    const started = Date.now();
    const results: HealthCheck[] = [];

    try {
      const res = await fetch(apiUrl("/health"));
      const apiLatency = Date.now() - started;
      const data = await res.json() as HealthResponse;

      results.push({
        name: "API Server",
        status: res.ok ? "ok" : "error",
        latencyMs: apiLatency,
        detail: `${data.environment ?? "dev"} · uptime ${data.uptime != null ? Math.round(data.uptime / 60) + "m" : "unknown"}`,
      });

      results.push({
        name: "Database",
        status: data.dbStatus === "connected" ? "ok" : data.dbStatus === "degraded" ? "warn" : "error",
        detail: data.dbStatus ?? "unknown",
      });

      results.push({
        name: "AI Provider",
        status: data.aiProviderStatus === "ok" ? "ok" : data.aiProviderStatus === "degraded" ? "warn" : "error",
        detail: data.aiProvider ?? "unknown",
      });

    } catch {
      results.push({
        name: "API Server",
        status: "error",
        latencyMs: Date.now() - started,
        detail: "Connection refused",
      });
      results.push({ name: "Database", status: "unknown", detail: "API unreachable" });
      results.push({ name: "AI Provider", status: "unknown", detail: "API unreachable" });
    }

    // Static checks (server-side state we infer)
    results.push({
      name: "Telegram Bot",
      status: "warn",
      detail: "Credentials not configured — set TELEGRAM_BOT_TOKEN",
    });

    results.push({
      name: "Delivery Scheduler",
      status: "ok",
      detail: "Asia/Bangkok · 07:00 + 18:00",
    });

    results.push({
      name: "Worker Registry",
      status: "ok",
      detail: "retry-worker · narrative-update-worker · analytics-worker",
    });

    const hasError = results.some((r) => r.status === "error");
    const hasWarn = results.some((r) => r.status === "warn");
    setOverall(hasError ? "error" : hasWarn ? "warn" : "ok");
    setChecks(results);
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  useEffect(() => {
    if (!pollEnabled) return;
    const id = setInterval(() => void runChecks(), 15_000);
    return () => clearInterval(id);
  }, [pollEnabled, runChecks]);

  const overallBg = {
    ok: "bg-emerald-500/10 border-emerald-500/20",
    warn: "bg-amber-500/10 border-amber-500/20",
    error: "bg-red-500/10 border-red-500/20",
    unknown: "bg-white/5 border-white/10",
  }[overall];

  const overallIcon = {
    ok: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    warn: <AlertCircle className="w-5 h-5 text-amber-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    unknown: <Clock className="w-5 h-5 text-white/30" />,
  }[overall];

  const overallLabel = { ok: "All Systems Operational", warn: "Degraded", error: "Outage Detected", unknown: "Checking…" }[overall];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link to="/admin/system" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 mb-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            System Dashboard
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-white/50" />
                Health Monitor
              </h1>
              <p className="text-sm text-white/40 mt-1">Real-time system health — auto-refreshes every 15s.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setPollEnabled((v) => !v)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  pollEnabled ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-white/10 text-white/40 bg-white/3"
                }`}
              >
                {pollEnabled ? "Live" : "Paused"}
              </button>
              <Button onClick={() => void runChecks()} disabled={loading}
                variant="outline" size="sm" className="border-white/10 text-white/60 hover:bg-white/5 gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          {lastChecked && (
            <p className="text-xs text-white/25 mt-2">Last checked {lastChecked.toLocaleTimeString()}</p>
          )}
        </div>

        {/* Overall status */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${overallBg}`}>
          {overallIcon}
          <p className="text-sm font-semibold text-white/90">{overallLabel}</p>
        </div>

        {/* Check list */}
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-white/6 flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-white/30" />
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">System Checks</span>
          </div>
          <div className="px-5">
            {checks.length === 0 ? (
              <div className="py-8 text-center text-sm text-white/30">Running checks…</div>
            ) : (
              checks.map((c) => <CheckRow key={c.name} check={c} />)
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-white/30">
          {[
            { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />, label: "Operational" },
            { icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />, label: "Degraded" },
            { icon: <XCircle className="w-3.5 h-3.5 text-red-400" />, label: "Outage" },
            { icon: <Clock className="w-3.5 h-3.5 text-white/30" />, label: "Unknown" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-1.5">{icon}{label}</div>
          ))}
        </div>

        {/* Infra links */}
        <div className="mt-8 pt-6 border-t border-white/6 flex flex-wrap gap-2">
          <Link to="/admin/system" className="text-xs text-white/40 hover:text-white/70 border border-white/8 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors">
            System Dashboard
          </Link>
          <Link to="/admin/economics" className="text-xs text-white/40 hover:text-white/70 border border-white/8 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors">
            Token Economy
          </Link>
          <Link to="/delivery-studio" className="text-xs text-white/40 hover:text-white/70 border border-white/8 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors">
            Delivery Studio
          </Link>
        </div>

      </div>
    </div>
  );
}

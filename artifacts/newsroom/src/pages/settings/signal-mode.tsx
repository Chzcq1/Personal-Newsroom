import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ShieldCheck, Sliders, Zap, ChevronRight, Check,
  AlertTriangle, Clock, Radio,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSignalMode, setSignalMode, SIGNAL_MODE_META, type SignalMode } from "@/lib/signalMode";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "shield-check": ShieldCheck,
  "sliders": Sliders,
  "zap": Zap,
};

const RISK_COLORS: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-400/10",
  moderate: "text-blue-400 bg-blue-400/10",
  high: "text-amber-400 bg-amber-400/10",
};

const SPEED_LABELS: Record<string, string> = {
  slow: "Slower · more accurate",
  moderate: "Balanced speed",
  fast: "Fastest · less filtering",
};

const MODE_ACCENT: Record<SignalMode, string> = {
  safe: "border-emerald-500/40 bg-emerald-500/5",
  balanced: "border-blue-500/40 bg-blue-500/5",
  raw: "border-amber-500/40 bg-amber-500/5",
};

const MODE_ICON_BG: Record<SignalMode, string> = {
  safe: "bg-emerald-500/15",
  balanced: "bg-blue-500/15",
  raw: "bg-amber-500/15",
};

const MODE_ICON_COLOR: Record<SignalMode, string> = {
  safe: "text-emerald-400",
  balanced: "text-blue-400",
  raw: "text-amber-400",
};

export default function SignalModePage() {
  const [current, setCurrent] = useState<SignalMode>(getSignalMode());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSelect(mode: SignalMode) {
    if (mode === current) return;
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/signal-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        setSignalMode(mode);
        setCurrent(mode);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // network error — still persist locally
      setSignalMode(mode);
      setCurrent(mode);
    } finally {
      setSaving(false);
    }
  }

  const modes: SignalMode[] = ["safe", "balanced", "raw"];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Settings
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-lg font-semibold tracking-tight">Signal Mode</h1>
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Intro */}
        <div>
          <p className="text-white/60 text-sm leading-relaxed">
            Signal Mode controls how INFOX balances <span className="text-white/90">speed vs. verification</span> across
            your feed, Telegram briefings, and alert engine. Choose based on how you use the intelligence.
          </p>
        </div>

        {/* Mode cards */}
        {modes.map((mode) => {
          const meta = SIGNAL_MODE_META[mode];
          const Icon = ICON_MAP[meta.icon] ?? Sliders;
          const isActive = current === mode;

          return (
            <button
              key={mode}
              onClick={() => handleSelect(mode)}
              disabled={saving}
              className={`w-full text-left rounded-xl border transition-all duration-200 ${
                isActive
                  ? MODE_ACCENT[mode]
                  : "border-white/10 bg-white/3 hover:bg-white/6"
              }`}
            >
              <div className="p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isActive ? MODE_ICON_BG[mode] : "bg-white/8"
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive ? MODE_ICON_COLOR[mode] : "text-white/40"}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white">{meta.label}</p>
                      {isActive && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          RISK_COLORS[meta.riskLevel]
                        }`}>
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/50 italic mb-2">{meta.tagline}</p>
                    <p className="text-sm text-white/70 leading-relaxed">{meta.description}</p>
                  </div>
                </div>

                {/* Indicators */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${RISK_COLORS[meta.riskLevel]}`}>
                    <ShieldCheck className="w-3 h-3" />
                    Risk: {meta.riskLevel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full text-white/50 bg-white/8">
                    <Clock className="w-3 h-3" />
                    {SPEED_LABELS[meta.speed]}
                  </span>
                </div>

                {/* Pros / Cons */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    {meta.pros.map((pro, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-white/60">{pro}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {meta.cons.map((con, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-white/30 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-white/40">{con}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {/* What this affects */}
        <div className="pt-2">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-3">What Signal Mode affects</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Radio, label: "Feed ranking", desc: "Priority thresholds" },
              { icon: Zap, label: "Alert engine", desc: "Source confirmation" },
              { icon: ShieldCheck, label: "Telegram delivery", desc: "Article filtering" },
              { icon: Sliders, label: "Noise suppression", desc: "Signal acceptance" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white/3 border border-white/8 rounded-lg p-3">
                <Icon className="w-4 h-4 text-white/30 mb-1.5" />
                <p className="text-xs font-medium text-white/80">{label}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}

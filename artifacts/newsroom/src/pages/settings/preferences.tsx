// ============================================================
// PREFERENCES — Sprint 8 Task G
// Executive Mode and reading preferences
// ============================================================

import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Zap, Clock, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getExecutiveMode, setExecutiveMode } from "@/lib/executiveMode";

export default function PreferencesPage() {
  const { toast } = useToast();
  const [execEnabled, setExecEnabled] = useState(() => getExecutiveMode().enabled);

  const handleSave = () => {
    setExecutiveMode(execEnabled);
    toast({
      title: "Preferences saved",
      description: execEnabled
        ? "Executive Mode is on. Briefings will use the 5-bullet compact format."
        : "Executive Mode is off. Full briefings enabled.",
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Preferences</h1>
            <p className="text-xs text-white/40">Reading mode and display options</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">

        {/* Executive Mode */}
        <Card className={`border transition-colors ${execEnabled ? "bg-amber-500/8 border-amber-500/20" : "bg-white/5 border-white/10"}`}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${execEnabled ? "bg-amber-500/20" : "bg-white/8"}`}>
                <Zap className={`w-5 h-5 ${execEnabled ? "text-amber-400" : "text-white/40"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white text-sm">Executive Mode</p>
                      {execEnabled && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-full">
                          <Check className="w-2.5 h-2.5" /> On
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Replaces full briefings with a 5-bullet impact-first summary.
                      Under 90 seconds to read.
                    </p>
                  </div>
                  <button
                    onClick={() => setExecEnabled(!execEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${execEnabled ? "bg-amber-500" : "bg-white/10"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${execEnabled ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>

                {execEnabled && (
                  <div className="mt-4 space-y-2 border-t border-amber-500/15 pt-4">
                    <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Format preview</p>
                    {[
                      "1. Impact statement — what changed and why it matters",
                      "2. Market or tech development with specific numbers",
                      "3. Geopolitical or macro shift with named actors",
                      "4. Watchlist-relevant development",
                      "5. Forward-looking signal to watch today",
                    ].map((line, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-[9px] text-amber-400 flex-shrink-0 mt-0.5 font-bold">
                          {i + 1}
                        </span>
                        <p className="text-xs text-white/35 leading-relaxed">{line}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reading time guide */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5">
            <p className="text-sm font-medium mb-3 text-white/70">Reading time guide</p>
            <div className="space-y-3">
              {[
                { label: "Executive Mode", time: "~90 sec", desc: "5-bullet impact summary", active: execEnabled },
                { label: "Morning Briefing", time: "2–4 min", desc: "Top 5 developments + analysis", active: !execEnabled },
                { label: "Evening Recap", time: "3–5 min", desc: "What changed, what matters tomorrow", active: !execEnabled },
                { label: "Topic Briefing", time: "4–7 min", desc: "Deep-dive on one topic", active: !execEnabled },
              ].map(({ label, time, desc, active }) => (
                <div key={label} className={`flex items-center gap-3 p-3 rounded-lg ${active ? "bg-white/8" : "opacity-40"}`}>
                  <Clock className="w-4 h-4 text-white/30 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/80">{label}</span>
                      <span className="text-xs text-amber-400 font-mono">{time}</span>
                    </div>
                    <p className="text-xs text-white/40">{desc}</p>
                  </div>
                  {active && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          className="w-full bg-white text-black hover:bg-white/90 font-medium"
        >
          Save preferences
        </Button>
      </main>
    </div>
  );
}

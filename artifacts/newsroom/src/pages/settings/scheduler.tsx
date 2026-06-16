import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Clock, Sun, Moon, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "ai-newsroom:scheduler-prefs";

interface SchedulerPrefs {
  morningEnabled: boolean;
  eveningEnabled: boolean;
  savedAt: string;
}

function loadPrefs(): SchedulerPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { morningEnabled: true, eveningEnabled: true, savedAt: "" };
    return JSON.parse(raw) as SchedulerPrefs;
  } catch {
    return { morningEnabled: true, eveningEnabled: true, savedAt: "" };
  }
}

function savePrefs(prefs: SchedulerPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prefs, savedAt: new Date().toISOString() }));
}

function getNextDelivery(hourICT: number): string {
  const now = new Date();
  const offset = 7 * 60; // ICT = UTC+7
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60_000);
  const ictNow = new Date(utcMs + offset * 60_000);
  const ictHour = ictNow.getHours() + ictNow.getMinutes() / 60;

  const target = new Date(ictNow);
  if (ictHour >= hourICT) {
    target.setDate(target.getDate() + 1);
  }
  target.setHours(hourICT, 0, 0, 0);

  const diffMs = target.getTime() - ictNow.getTime();
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffMins = Math.floor((diffMs % 3_600_000) / 60_000);

  if (diffHours > 0) {
    return `in ${diffHours}h ${diffMins}m`;
  }
  return `in ${diffMins}m`;
}

export default function SchedulerPage() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<SchedulerPrefs>(() => loadPrefs());
  const [nextMorning, setNextMorning] = useState("");
  const [nextEvening, setNextEvening] = useState("");

  useEffect(() => {
    const update = () => {
      setNextMorning(getNextDelivery(7));
      setNextEvening(getNextDelivery(18));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const toggle = (key: "morningEnabled" | "eveningEnabled") => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    savePrefs(prefs);
    toast({ title: "Preferences saved", description: "Your delivery schedule preferences are saved." });
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
            <h1 className="text-lg font-semibold tracking-tight">Delivery Schedule</h1>
            <p className="text-xs text-white/40">Morning and evening briefing times</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
          <Info className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/50 leading-relaxed">
            The AI Newsroom sends briefings automatically at{" "}
            <span className="text-white">07:00 ICT (morning)</span> and{" "}
            <span className="text-white">18:00 ICT (evening)</span>. Delivery times are set
            by the server — your preferences below control which briefings you receive.
          </p>
        </div>

        {/* Morning briefing */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Sun className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Morning Briefing</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-white/30" />
                    <span className="text-xs text-white/40">07:00 ICT</span>
                    {prefs.morningEnabled && (
                      <span className="text-xs text-emerald-400 ml-1">· Next: {nextMorning}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggle("morningEnabled")}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  prefs.morningEnabled ? "bg-amber-500" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    prefs.morningEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {prefs.morningEnabled && (
              <p className="mt-3 text-xs text-white/40 pl-13">
                Cross-topic intelligence briefing: AI, tech, markets, economy, politics.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Evening briefing */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Evening Recap</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-white/30" />
                    <span className="text-xs text-white/40">18:00 ICT</span>
                    {prefs.eveningEnabled && (
                      <span className="text-xs text-emerald-400 ml-1">· Next: {nextEvening}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggle("eveningEnabled")}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  prefs.eveningEnabled ? "bg-indigo-500" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    prefs.eveningEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {prefs.eveningEnabled && (
              <p className="mt-3 text-xs text-white/40">
                Day-in-review: what changed, what matters tomorrow.
              </p>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5">
            <p className="text-sm font-medium mb-3 text-white/80">How it works</p>
            <div className="space-y-3">
              {[
                { step: "1", text: "Server collects latest articles from all topic RSS feeds" },
                { step: "2", text: "AI synthesises the top 12 articles into a Thai-language briefing" },
                { step: "3", text: "Briefing is formatted and sent to your Telegram chat" },
                { step: "4", text: "Evening digest remembers morning context for story continuity" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/50 flex-shrink-0 mt-0.5">
                    {step}
                  </span>
                  <p className="text-xs text-white/50 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          className="w-full bg-white text-black hover:bg-white/90 font-medium"
        >
          Save Preferences
        </Button>
      </main>
    </div>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRESET_INTERESTS, getInterests, addInterest, removeInterest, hasInterest } from "@/lib/interestProfile";
import { useToast } from "@/hooks/use-toast";

// Which topics each interest maps to (display only)
const INTEREST_TOPICS: Record<string, string> = {
  Tesla: "Stocks · EV",
  Nvidia: "Stocks · AI · Tech",
  BYD: "Stocks · EV",
  Bitcoin: "Stocks",
  Ethereum: "Stocks",
  Nintendo: "Tech · Stocks",
  Steam: "Tech",
  OpenAI: "AI · Tech",
  Anthropic: "AI · Tech",
  "AI Agents": "AI · Tech",
  EV: "Economy · Tech",
  Gaming: "Tech · Stocks",
};

export default function InterestsPage() {
  const { toast } = useToast();
  // force re-render on toggle by tracking active list in state
  const [activeInterests, setActiveInterests] = useState<string[]>(() => getInterests());

  function toggle(interest: string) {
    if (hasInterest(interest)) {
      removeInterest(interest);
      setActiveInterests((prev) => prev.filter((i) => i !== interest));
      toast({ title: `Removed: ${interest}` });
    } else {
      addInterest(interest);
      setActiveInterests((prev) => [...prev, interest]);
      toast({ title: `Added: ${interest}` });
    }
  }

  function clearAll() {
    for (const i of [...activeInterests]) removeInterest(i);
    setActiveInterests([]);
    toast({ title: "All interests cleared" });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Settings
              </Button>
            </Link>
            <h1 className="text-lg font-semibold tracking-tight">Interest Profile</h1>
          </div>
          {activeInterests.length > 0 && (
            <span className="text-sm text-purple-400 bg-purple-400/10 px-2.5 py-1 rounded-full">
              {activeInterests.length} active
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <p className="text-sm text-white/50">
          Select topics you care about. Your morning and evening briefings will prioritise news about these subjects.
        </p>

        {/* Interest grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PRESET_INTERESTS.map((interest) => {
            const active = activeInterests.includes(interest);
            return (
              <button
                key={interest}
                onClick={() => toggle(interest)}
                className={`relative text-left rounded-xl border p-4 transition-all ${
                  active
                    ? "bg-purple-500/10 border-purple-500/40 shadow-[0_0_0_1px_rgba(168,85,247,0.15)]"
                    : "bg-white/3 border-white/10 hover:bg-white/6 hover:border-white/20"
                }`}
              >
                {active && (
                  <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </span>
                )}
                <p className={`font-medium text-sm mb-1 ${active ? "text-purple-200" : "text-white"}`}>
                  {interest}
                </p>
                <p className="text-xs text-white/35">{INTEREST_TOPICS[interest] ?? ""}</p>
              </button>
            );
          })}
        </div>

        {activeInterests.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-white/40">
              {activeInterests.length} interest{activeInterests.length !== 1 ? "s" : ""} active —{" "}
              briefings will highlight related news
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-white/40 hover:text-white/70 text-xs"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Empty state hint */}
        {activeInterests.length === 0 && (
          <Card className="bg-white/3 border-white/8">
            <CardContent className="p-5 text-center text-sm text-white/40">
              No interests selected — all topics are treated equally in your briefings
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

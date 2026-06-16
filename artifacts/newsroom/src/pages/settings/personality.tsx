// ============================================================
// BRIEFING PERSONALITY — Sprint 8 Task E
// Choose how the AI writes briefings
// ============================================================

import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getPersonality,
  setPersonality,
  PERSONALITY_OPTIONS,
  type BriefingPersonality,
} from "@/lib/personalitySettings";

const PERSONALITY_ACCENT: Record<BriefingPersonality, string> = {
  analyst: "blue",
  concise: "emerald",
  financial: "amber",
  neutral: "slate",
  aggressive: "rose",
};

const PERSONALITY_COLOR: Record<BriefingPersonality, { bg: string; border: string; text: string; dot: string }> = {
  analyst: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-300",
    dot: "bg-blue-400",
  },
  concise: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  financial: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-300",
    dot: "bg-amber-400",
  },
  neutral: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    text: "text-slate-300",
    dot: "bg-slate-400",
  },
  aggressive: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-300",
    dot: "bg-rose-400",
  },
};

export default function PersonalityPage() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<BriefingPersonality>(() => getPersonality());

  const handleSave = () => {
    setPersonality(selected);
    toast({
      title: "Personality saved",
      description: `Briefings will now use the ${PERSONALITY_OPTIONS.find((p) => p.id === selected)?.name} style.`,
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
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Briefing Personality</h1>
            <p className="text-xs text-white/40">Choose how INFOX writes your briefings</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {/* Description */}
        <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
          <Brain className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/50 leading-relaxed">
            The AI uses the same news sources for everyone. Personality changes how it
            frames analysis — depth, focus, and tone. All personalities follow the same
            quality standards and write in Thai.
          </p>
        </div>

        {/* Personality options */}
        <div className="space-y-3">
          {PERSONALITY_OPTIONS.map((option) => {
            const isActive = selected === option.id;
            const colors = PERSONALITY_COLOR[option.id];

            return (
              <button
                key={option.id}
                onClick={() => setSelected(option.id)}
                className={`w-full text-left transition-all rounded-xl border ${
                  isActive
                    ? `${colors.bg} ${colors.border}`
                    : "bg-white/3 border-white/8 hover:bg-white/5 hover:border-white/15"
                }`}
              >
                <div className="p-5 flex items-start gap-4">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 transition-colors ${isActive ? colors.dot : "bg-white/15"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold text-sm ${isActive ? "text-white" : "text-white/70"}`}>
                        {option.name}
                      </span>
                      {isActive && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed ${isActive ? "text-white/75" : "text-white/40"}`}>
                      {option.description}
                    </p>
                    <p className={`text-xs mt-1.5 ${isActive ? colors.text : "text-white/25"}`}>
                      {option.tone}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleSave}
          className="w-full bg-white text-black hover:bg-white/90 font-medium"
        >
          Save personality
        </Button>
      </main>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Cpu, Send, Globe, ChevronRight, Star, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOrCreateProfile } from "@/lib/userIdentity";
import { setInterests } from "@/lib/interestProfile";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const TOPIC_PRESETS = [
  { id: "ai", label: "AI & Machine Learning", icon: "🤖" },
  { id: "technology", label: "Technology", icon: "💻" },
  { id: "crypto", label: "Crypto & Web3", icon: "₿" },
  { id: "stocks", label: "Stock Market", icon: "📈" },
  { id: "business", label: "Business & Finance", icon: "📊" },
  { id: "startups", label: "Startups & VC", icon: "🚀" },
  { id: "energy", label: "Energy & Climate", icon: "🌱" },
  { id: "politics", label: "Politics", icon: "🏛️" },
  { id: "geopolitics", label: "Geopolitics", icon: "🌍" },
  { id: "science", label: "Science & Research", icon: "🔬" },
  { id: "gaming", label: "Gaming", icon: "🎮" },
  { id: "sports", label: "Sports", icon: "⚽" },
];

const MIN_INTERESTS = 3;

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to INFOX",
    subtitle: "Your personal AI intelligence briefing, delivered in Thai",
  },
  {
    id: "topics",
    title: "What do you follow?",
    subtitle: "Pick at least 3 topics. The feed personalises around these.",
  },
  {
    id: "delivery",
    title: "Get briefings when it matters",
    subtitle: "Morning and evening briefings, delivered to Telegram when you're ready.",
  },
  {
    id: "founding",
    title: "You're an early member",
    subtitle: "You're joining INFOX before its public launch.",
  },
];

function WelcomeStep() {
  return (
    <div className="text-center space-y-6">
      <div className="text-6xl">📰</div>
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Cpu className="h-5 w-5 text-violet-500" />
          <span className="text-sm font-medium">AI-powered intelligence</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Send className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium">Delivered to Telegram</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Globe className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium">Summarised in Thai</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        INFOX reads hundreds of news sources, scores them for signal, and
        delivers only what matters — in clear Thai.
      </p>
    </div>
  );
}

function TopicsStep({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const remaining = Math.max(0, MIN_INTERESTS - selected.length);
  return (
    <div className="space-y-4">
      {remaining > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Select {remaining} more topic{remaining !== 1 ? "s" : ""} to continue</span>
        </div>
      )}
      {remaining === 0 && (
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Great — {selected.length} topics selected. Add more or continue.</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {TOPIC_PRESETS.map((topic) => {
          const isSelected = selected.includes(topic.id);
          return (
            <button
              key={topic.id}
              onClick={() => onToggle(topic.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-violet-500 bg-violet-500/10 dark:bg-violet-950/50"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <span className="text-xl shrink-0">{topic.icon}</span>
              <span className="text-sm font-medium leading-tight flex-1">{topic.label}</span>
              {isSelected && <CheckCircle className="h-4 w-4 text-violet-500 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DeliveryStep() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 space-y-2 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌅</span>
          <div>
            <div className="text-sm font-semibold">Morning Briefing</div>
            <div className="text-xs text-muted-foreground">07:00 — Overnight news, market open</div>
          </div>
          <Badge variant="secondary" className="ml-auto">07:00</Badge>
        </div>
      </div>
      <div className="rounded-xl border p-4 space-y-2 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌆</span>
          <div>
            <div className="text-sm font-semibold">Evening Briefing</div>
            <div className="text-xs text-muted-foreground">18:00 — Day wrap-up, what changed</div>
          </div>
          <Badge variant="secondary" className="ml-auto">18:00</Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Connect Telegram in Settings → Delivery to activate scheduled briefings.
        You can read briefings here anytime without Telegram.
      </p>
    </div>
  );
}

function FoundingStep() {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="p-4 rounded-full bg-violet-100 dark:bg-violet-950">
          <Star className="h-10 w-10 text-violet-600" />
        </div>
      </div>
      <div className="space-y-2">
        <Badge className="bg-violet-600 text-white">Founding Member</Badge>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          You're among the first people to use INFOX. Your feedback directly shapes
          how the platform evolves. Thank you for being here early.
        </p>
      </div>
      <div className="rounded-xl border p-4 bg-muted/30 text-left space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          What's coming
        </div>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• Multi-device sync via account login</li>
          <li>• Custom source subscriptions</li>
          <li>• Entity watchlists & alerts</li>
          <li>• Deeper narrative tracking</li>
        </ul>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["ai", "technology"]);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function toggleTopic(id: string) {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function handleNext() {
    if (isLast) {
      await completeOnboarding();
      return;
    }
    setStep((s) => s + 1);
  }

  async function completeOnboarding() {
    const identity = getOrCreateProfile();

    // Map topic IDs to their labels for display
    const labels = selectedTopics.map((id) => {
      const preset = TOPIC_PRESETS.find((t) => t.id === id);
      return preset?.label ?? id;
    });

    // Save interests to localStorage immediately — feeds personalise from this
    if (selectedTopics.length >= MIN_INTERESTS) {
      setInterests(labels);
    }

    // Mark as onboarded — prevents redirect loop on next visit
    localStorage.setItem("ai-newsroom:onboarded", "true");

    try {
      await fetch(`${BASE}/api/identity/${identity.profileId}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foundingMember: true }),
      });
    } catch {
      // Non-critical — continue regardless
    }

    // Sync interests to server (best-effort)
    if (selectedTopics.length >= MIN_INTERESTS) {
      try {
        await fetch(`${BASE}/api/interests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: identity.profileId, labels }),
        });
      } catch {
        // Non-critical
      }
    }

    navigate("/");
  }

  const canProceed =
    currentStep.id !== "topics" || selectedTopics.length >= MIN_INTERESTS;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-violet-500" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold">{currentStep.title}</h1>
              <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
            </div>

            {currentStep.id === "welcome" && <WelcomeStep />}
            {currentStep.id === "topics" && (
              <TopicsStep selected={selectedTopics} onToggle={toggleTopic} />
            )}
            {currentStep.id === "delivery" && <DeliveryStep />}
            {currentStep.id === "founding" && <FoundingStep />}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex flex-col gap-3">
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            {isLast ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Start reading
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)} className="text-muted-foreground">
              Back
            </Button>
          )}

          {!isLast && (
            <button
              onClick={completeOnboarding}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              Skip setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

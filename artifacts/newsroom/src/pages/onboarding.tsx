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
  { id: "thai-news", label: "ข่าวไทย", labelTh: "ข่าวไทย", icon: "🇹🇭" },
  { id: "ai", label: "AI & Machine Learning", labelTh: "AI & Machine Learning", icon: "🤖" },
  { id: "technology", label: "Technology", labelTh: "เทคโนโลยี", icon: "💻" },
  { id: "stocks", label: "Stock Market", labelTh: "ตลาดหุ้น", icon: "📈" },
  { id: "economy", label: "Economy", labelTh: "เศรษฐกิจ", icon: "📊" },
  { id: "politics", label: "Politics", labelTh: "การเมืองไทยและโลก", icon: "🏛️" },
  { id: "crypto", label: "Crypto & Web3", labelTh: "Crypto & Web3", icon: "₿" },
  { id: "startups", label: "Startups & VC", labelTh: "Startups & VC", icon: "🚀" },
  { id: "energy", label: "Energy & Climate", labelTh: "พลังงานและสิ่งแวดล้อม", icon: "🌱" },
  { id: "geopolitics", label: "Geopolitics", labelTh: "ภูมิรัฐศาสตร์", icon: "🌍" },
  { id: "science", label: "Science & Research", labelTh: "วิทยาศาสตร์และวิจัย", icon: "🔬" },
  { id: "gaming", label: "Gaming", labelTh: "เกม", icon: "🎮" },
];

const MIN_INTERESTS = 3;

const STEPS = [
  {
    id: "welcome",
    title: "ยินดีต้อนรับสู่ INFOX",
    subtitle: "สรุปข่าวกรอง AI ส่วนตัว ส่งตรงถึงคุณเป็นภาษาไทย",
  },
  {
    id: "topics",
    title: "คุณสนใจเรื่องอะไร?",
    subtitle: "เลือกอย่างน้อย 3 หัวข้อ ฟีดจะปรับแต่งตามนี้",
  },
  {
    id: "delivery",
    title: "รับข่าวสารในเวลาที่เหมาะสม",
    subtitle: "สรุปข่าวเช้า-เย็น ส่งถึง Telegram เมื่อคุณพร้อม",
  },
  {
    id: "founding",
    title: "คุณเป็นสมาชิกคนแรกๆ",
    subtitle: "คุณกำลังเข้าร่วม INFOX ก่อนเปิดตัวสาธารณะ",
  },
];

function WelcomeStep() {
  return (
    <div className="text-center space-y-6">
      <div className="text-6xl">📰</div>
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Cpu className="h-5 w-5 text-violet-500" />
          <span className="text-sm font-medium">ข่าวกรองพลัง AI</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Send className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium">ส่งตรงถึง Telegram</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Globe className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium">สรุปเป็นภาษาไทย</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        INFOX อ่านข่าวจากหลายร้อยแหล่ง, ให้คะแนนสัญญาณ,
        และส่งเฉพาะสิ่งที่สำคัญ — ชัดเจนเป็นภาษาไทย
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
          <span>เลือกเพิ่มอีก {remaining} หัวข้อ{remaining !== 1 ? "" : ""} เพื่อดำเนินการต่อ</span>
        </div>
      )}
      {remaining === 0 && (
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          <span>เยี่ยม — เลือกแล้ว {selected.length} หัวข้อ เพิ่มได้อีกหรือดำเนินการต่อ</span>
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
              <span className="text-sm font-medium leading-tight flex-1">{topic.labelTh}</span>
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
            <div className="text-sm font-semibold">สรุปข่าวเช้า</div>
            <div className="text-xs text-muted-foreground">07:00 — ข่าวค้างคืน, ตลาดเปิด</div>
          </div>
          <Badge variant="secondary" className="ml-auto">07:00</Badge>
        </div>
      </div>
      <div className="rounded-xl border p-4 space-y-2 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌆</span>
          <div>
            <div className="text-sm font-semibold">สรุปข่าวเย็น</div>
            <div className="text-xs text-muted-foreground">18:00 — สรุปวัน, สิ่งที่เปลี่ยนแปลง</div>
          </div>
          <Badge variant="secondary" className="ml-auto">18:00</Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center">
        เชื่อมต่อ Telegram ใน การตั้งค่า → ศูนย์ส่งข้อมูล เพื่อเปิดใช้การส่งตามกำหนดเวลา
        คุณสามารถอ่านสรุปข่าวที่นี่ได้ทุกเวลาโดยไม่ต้องใช้ Telegram
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
        <Badge className="bg-violet-600 text-white">สมาชิกผู้ก่อตั้ง</Badge>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          คุณเป็นหนึ่งในผู้ใช้งานคนแรกๆ ของ INFOX
          ความคิดเห็นของคุณจะช่วยกำหนดทิศทางของแพลตฟอร์ม
          ขอบคุณที่เข้าร่วมตั้งแต่เนิ่นๆ
        </p>
      </div>
      <div className="rounded-xl border p-4 bg-muted/30 text-left space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          กำลังจะมา
        </div>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• ซิงค์หลายอุปกรณ์ผ่านบัญชีผู้ใช้</li>
          <li>• สมัครติดตามแหล่งข้อมูลกำหนดเอง</li>
          <li>• Watchlist และการแจ้งเตือน Entity</li>
          <li>• ติดตามเรื่องเล่าเชิงลึก</li>
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

    // Map topic IDs to their English labels for internal use (feed engine matches on English)
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
                เริ่มอ่านเลย
              </>
            ) : (
              <>
                ต่อไป
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)} className="text-muted-foreground">
              กลับ
            </Button>
          )}

          {!isLast && (
            <button
              onClick={completeOnboarding}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              ข้ามการตั้งค่า
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

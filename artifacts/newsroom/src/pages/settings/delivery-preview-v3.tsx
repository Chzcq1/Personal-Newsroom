// ============================================================
// TELEGRAM DELIVERY PREVIEW V3 — Sprint 18 Task E
//
// Preview page for the new V3 Telegram format.
// Shows all three density modes side-by-side.
// ============================================================

import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Send, Eye, Zap, FileText, Layers,
  ChevronDown, ChevronUp, MessageCircle, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// ── V3 density modes ───────────────────────────────────────────

type DensityMode = "ultra_compact" | "compact" | "standard";

interface DensityConfig {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  estimatedReadSecs: number;
}

const DENSITY_CONFIGS: Record<DensityMode, DensityConfig> = {
  ultra_compact: {
    label: "Express",
    description: "Headline + 3 bullets. Read in 5 seconds.",
    icon: Zap,
    color: "text-yellow-400",
    estimatedReadSecs: 5,
  },
  compact: {
    label: "Compact",
    description: "Headline + bullets + watch list. ~15 seconds.",
    icon: FileText,
    color: "text-blue-400",
    estimatedReadSecs: 15,
  },
  standard: {
    label: "Standard",
    description: "Full briefing with context and confidence. ~30 seconds.",
    icon: Layers,
    color: "text-emerald-400",
    estimatedReadSecs: 30,
  },
};

// ── Sample briefing data ───────────────────────────────────────

const SAMPLE_BRIEFINGS: Record<string, SampleBriefing> = {
  ai: {
    topic: "AI",
    headline: "Nvidia ประกาศชิป Blackwell Ultra ก่อนกำหนด — ราคาหุ้นพุ่ง 8%",
    bullets: [
      "Nvidia เร่งเปิดตัว B300 Ultra เร็วกว่าแผน 2 ไตรมาส หลัง AI demand ล้นตลาด",
      "ประสิทธิภาพ inference เพิ่ม 4× จาก H100 — OpenAI, Anthropic จองล่วงหน้าทันที",
      "AMD และ Intel ต้องเร่ง roadmap รับมือ — ช่องว่างเทคโนโลยีขยายกว้างขึ้น",
      "นักวิเคราะห์ปรับราคาเป้าหมาย NVDA สูงสุดถึง $1,200",
    ],
    whyItMatters: "การเร่งเปิดตัวชิปใหม่ของ Nvidia ส่งสัญญาณว่า AI infrastructure boom ยังไม่ถึงจุดสูงสุด และอาจเปิดรอบการลงทุนใหม่ทั่ว sector",
    watchNext: [
      "ผลประกอบการ Nvidia Q2 — คาดโตเกิน 100% YoY",
      "การตอบสนองของ TSMC ต่อ capacity demand ใหม่",
      "ราคาหุ้น AI cluster companies (CoreWeave, Lambda)",
    ],
    entities: ["Nvidia", "OpenAI", "Anthropic", "AMD", "Intel", "TSMC"],
    sourceCount: 8,
    confidenceClass: "confirmed",
    confidenceScore: 78,
  },
  economy: {
    topic: "Economy",
    headline: "Fed ส่งสัญญาณลดดอกเบี้ย 2 ครั้งในปีนี้ หลัง CPI ชะลอตัวต่อเนื่อง",
    bullets: [
      "CPI เดือนพฤษภาคมอยู่ที่ 2.4% — ต่ำกว่าคาด 0.2% เป็นครั้งแรกใน 5 เดือน",
      "Powell ส่งสัญญาณ rate cut ไตรมาส 3 และ 4 หากข้อมูลเป็นไปตามนี้",
      "ตลาดหุ้น S&P 500 ตอบสนองบวก +1.8% — bond yield ลดลง 12bps",
      "นักเศรษฐศาสตร์ 73% คาด Fed จะลดดอกเบี้ย กันยายน 2026",
    ],
    whyItMatters: "การลดดอกเบี้ยจะส่งผลต่อต้นทุนสินเชื่อ ราคาอสังหาริมทรัพย์ และ valuation ของหุ้น growth ทั่วโลก",
    watchNext: [
      "การประชุม FOMC ครั้งถัดไป — 30 กรกฎาคม",
      "ตัวเลข PCE เดือนมิถุนายน (indicator สำคัญของ Fed)",
      "ผลกระทบต่อ USD/THB และตลาด SET",
    ],
    entities: ["Federal Reserve", "Powell", "S&P 500"],
    sourceCount: 6,
    confidenceClass: "developing",
    confidenceScore: 65,
  },
};

type SampleBriefing = {
  topic: string;
  headline: string;
  bullets: string[];
  whyItMatters: string;
  watchNext: string[];
  entities: string[];
  sourceCount: number;
  confidenceClass: "experimental" | "early_signal" | "developing" | "confirmed" | "established";
  confidenceScore: number;
};

// ── Format V3 message in browser (mirrors server logic) ────────

function formatV3Message(briefing: SampleBriefing, mode: DensityMode): string {
  const topicEmoji: Record<string, string> = {
    AI: "🤖", Economy: "📊", Technology: "💻", Stocks: "📈", Politics: "🏛",
  };
  const emoji = topicEmoji[briefing.topic] ?? "📰";
  const time = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const sep = "──────────────";

  const boldEntities = (text: string) =>
    briefing.entities.reduce((t, e) => t.replace(new RegExp(`\\b${e}\\b`, "g"), `**${e}**`), text);

  const headline = `${emoji} **${briefing.headline}** · ${time}`;
  const bullets = briefing.bullets.slice(0, mode === "ultra_compact" ? 3 : 5).map((b) => `▸ ${boldEntities(b)}`).join("\n");

  if (mode === "ultra_compact") {
    return [headline, sep, bullets, sep, `*📡 ${briefing.sourceCount} sources · Express · INFOX*`].join("\n");
  }

  if (mode === "compact") {
    const watch = briefing.watchNext.slice(0, 2).map((w) => `👁 ${w}`).join("\n");
    return [
      headline, sep, bullets, sep,
      `จับตา:\n${watch}`,
      sep,
      `*📡 ${briefing.sourceCount} sources · Compact · INFOX*`,
    ].join("\n");
  }

  // standard
  const confidenceBadge = {
    established: "🟢 Established",
    confirmed: "🔵 Confirmed",
    developing: "🟡 Developing",
    early_signal: "🟠 Early Signal",
    experimental: "⚪ Experimental",
  }[briefing.confidenceClass];

  const why = `💡 *${boldEntities(briefing.whyItMatters)}*`;
  const watch = briefing.watchNext.slice(0, 3).map((w) => `👁 ${w}`).join("\n");

  return [
    headline, sep, bullets, sep,
    why, sep,
    `จับตา:\n${watch}`, sep,
    `${confidenceBadge} · Confidence ${briefing.confidenceScore}/100`,
    sep,
    `*📡 ${briefing.sourceCount} sources · Standard · INFOX*`,
  ].join("\n");
}

// ── Telegram message renderer ──────────────────────────────────

function TelegramPreview({ text }: { text: string }) {
  return (
    <div className="bg-[#17212b] rounded-xl p-3 font-[system-ui] text-[13px] leading-relaxed max-h-80 overflow-y-auto">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("──────────────")) {
          return <div key={i} className="border-t border-white/10 my-1.5" />;
        }

        // Process inline bold (**text**)
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const rendered = parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
            : part.startsWith("*") && part.endsWith("*")
            ? <em key={j} className="text-white/60 italic">{part.slice(1, -1)}</em>
            : <span key={j} className="text-[#e1e5ea]">{part}</span>
        );

        return <div key={i} className="min-h-[1.4em]">{rendered}</div>;
      })}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function DeliveryPreviewV3Page() {
  const [selectedTopic, setSelectedTopic] = useState<"ai" | "economy">("ai");
  const [activeDensity, setActiveDensity] = useState<DensityMode>("standard");
  const [showAllModes, setShowAllModes] = useState(false);

  const briefing = SAMPLE_BRIEFINGS[selectedTopic];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Settings
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Telegram Preview V3</h1>
            <p className="text-xs text-white/40">Ultra-scannable delivery format</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Topic selector */}
        <div>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Sample Topic</p>
          <div className="flex gap-2">
            {(["ai", "economy"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTopic(t)}
                className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
                  selectedTopic === t
                    ? "bg-white/15 text-white font-medium"
                    : "bg-white/5 text-white/50 hover:bg-white/8"
                }`}
              >
                {t === "ai" ? "🤖 AI & Tech" : "📊 Economy"}
              </button>
            ))}
          </div>
        </div>

        {/* Density selector */}
        <div>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Delivery Density</p>
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(DENSITY_CONFIGS) as [DensityMode, DensityConfig][]).map(([mode, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={mode}
                  onClick={() => setActiveDensity(mode)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activeDensity === mode
                      ? "bg-white/10 border-white/20"
                      : "bg-white/3 border-white/8 hover:bg-white/6"
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1.5 ${cfg.color}`} />
                  <p className="text-sm font-medium text-white mb-0.5">{cfg.label}</p>
                  <p className="text-[11px] text-white/40 leading-snug">{cfg.description}</p>
                  <p className="text-[10px] text-white/25 mt-1">{cfg.estimatedReadSecs}s read</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-[#2AABEE]" />
            <p className="text-sm font-medium text-white">
              Telegram Preview — {DENSITY_CONFIGS[activeDensity].label}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] overflow-hidden">
            {/* Fake Telegram chrome */}
            <div className="bg-[#232e3c] px-4 py-2.5 flex items-center gap-2 border-b border-white/10">
              <div className="w-6 h-6 rounded-full bg-[#2AABEE] flex items-center justify-center text-xs">
                I
              </div>
              <div>
                <p className="text-[12px] font-medium text-white">INFOX Intelligence</p>
                <p className="text-[10px] text-white/40">bot</p>
              </div>
            </div>

            <div className="p-4 bg-[#17212b]">
              <TelegramPreview text={formatV3Message(briefing, activeDensity)} />
            </div>
          </div>
        </div>

        {/* Compare all modes */}
        <div>
          <button
            onClick={() => setShowAllModes((v) => !v)}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <Eye className="w-4 h-4" />
            {showAllModes ? "Hide comparison" : "Compare all density modes"}
            {showAllModes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAllModes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {(["ultra_compact", "compact", "standard"] as DensityMode[]).map((mode) => {
                const cfg = DENSITY_CONFIGS[mode];
                const Icon = cfg.icon;
                return (
                  <div key={mode} className="rounded-xl border border-white/10 overflow-hidden">
                    <div className="p-3 border-b border-white/10 bg-white/3 flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      <span className="text-xs font-medium text-white/70">{cfg.label}</span>
                      <span className="ml-auto text-[10px] text-white/30">{cfg.estimatedReadSecs}s</span>
                    </div>
                    <TelegramPreview text={formatV3Message(briefing, mode)} />
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Format guide */}
        <Card className="bg-white/3 border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-white/40" />
              <h2 className="text-sm font-semibold text-white/70">V3 Format Guide</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-[12px] text-white/40 leading-relaxed">
            <p>▸ Bold brand names (Nvidia, OpenAI) for instant scanning</p>
            <p>▸ Thin separators (──────) replace cluttered headers</p>
            <p>▸ 👁 Watch icons for forward-looking signals</p>
            <p>▸ 💡 Italic context for "why it matters"</p>
            <p>▸ Confidence badge + source count for credibility signals</p>
            <p>▸ All three modes use the same HTML parse mode — Telegram safe</p>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}

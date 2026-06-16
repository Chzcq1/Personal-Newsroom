// ============================================================
// INSIGHT EXPORT — Sprint 13 Task E
// /insights/export
//
// Generates beautiful shareable insight cards from:
//   - Executive Summary
//   - Intelligence Briefings
//   - Narrative Momentum
//   - Key Insight bullets
//
// Design: minimal, premium, INFOX branded
// Export: user can screenshot/share the card via browser share API
// ============================================================

import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Download, Share2, RefreshCw, Copy, CheckCircle,
  TrendingUp, AlertTriangle, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BriefingData {
  summary: string;
  topicLabel?: string;
  topicLabelTh?: string;
  generatedAt: string;
  articleCount?: number;
  sourceCount?: number;
}

type CardVariant = "executive" | "intelligence" | "morning" | "signal";

const VARIANT_LABELS: Record<CardVariant, string> = {
  executive: "Executive Briefing",
  intelligence: "Intelligence Signal",
  morning: "Morning Digest",
  signal: "Key Signal",
};

const VARIANT_COLORS: Record<CardVariant, { bg: string; accent: string; badge: string }> = {
  executive: { bg: "from-[#0a0a0a] to-[#111827]", accent: "#60a5fa", badge: "EXECUTIVE" },
  intelligence: { bg: "from-[#0a0a0a] to-[#1a1025]", accent: "#a78bfa", badge: "INTELLIGENCE" },
  morning: { bg: "from-[#0a0a0a] to-[#0f2010]", accent: "#34d399", badge: "MORNING" },
  signal: { bg: "from-[#0a0a0a] to-[#1c1200]", accent: "#fbbf24", badge: "SIGNAL" },
};

// ── Extract key bullets from raw briefing text ─────────────────

function extractKeyPoints(text: string, maxPoints = 5): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const points: string[] = [];

  for (const line of lines) {
    // Numbered items
    const numMatch = line.match(/^\d+\.\s+(.+)/);
    if (numMatch) {
      points.push(numMatch[1].slice(0, 120));
      if (points.length >= maxPoints) break;
    }
  }

  // If no numbered items found, take non-header, non-short lines
  if (points.length === 0) {
    const HEADERS = new Set([
      "HEADLINE","MORNING BRIEFING","EVENING RECAP","EXECUTIVE BRIEFING",
      "EXECUTIVE SUMMARY","KEY DEVELOPMENTS","TOP DEVELOPMENTS",
      "IMPACT ANALYSIS","WHAT TO WATCH NEXT","WHAT TO WATCH TODAY",
      "WHO IS AFFECTED","WHAT HAPPENS NEXT","WHY IT MATTERS",
      "OPPORTUNITY","RISK","KEY SIGNALS","WATCH",
    ]);
    for (const line of lines) {
      if (!HEADERS.has(line) && line.length > 40) {
        points.push(line.slice(0, 120));
        if (points.length >= maxPoints) break;
      }
    }
  }

  return points;
}

function extractHeadline(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const headlineIdx = lines.findIndex((l) =>
    l === "HEADLINE" || l === "MORNING BRIEFING" || l === "EXECUTIVE BRIEFING",
  );
  if (headlineIdx >= 0 && headlineIdx + 1 < lines.length) {
    return lines[headlineIdx + 1].slice(0, 200);
  }
  // Fallback: first long non-header line
  const SKIP = new Set(["HEADLINE","MORNING BRIEFING","EXECUTIVE BRIEFING","EXECUTIVE SUMMARY"]);
  return lines.find((l) => !SKIP.has(l) && l.length > 30)?.slice(0, 200) ?? "";
}

// ── Insight Card (export target) ──────────────────────────────

function InsightCard({
  data,
  variant,
  customText,
}: {
  data: BriefingData | null;
  variant: CardVariant;
  customText: string;
}) {
  const colors = VARIANT_COLORS[variant];
  const now = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });

  const rawText = customText.trim() || data?.summary || "";
  const headline = extractHeadline(rawText);
  const keyPoints = extractKeyPoints(rawText, 4);

  return (
    <div
      className={`relative w-[360px] min-h-[480px] rounded-2xl overflow-hidden bg-gradient-to-br ${colors.bg} border border-white/10 p-6 flex flex-col`}
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Brand header */}
      <div className="flex items-center justify-between mb-5">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="INFOX"
          className="h-6 w-auto object-contain opacity-90"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <span
          className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border"
          style={{ color: colors.accent, borderColor: colors.accent + "40", background: colors.accent + "10" }}
        >
          {colors.badge}
        </span>
      </div>

      {/* Headline */}
      {headline ? (
        <h2 className="text-white text-[15px] font-bold leading-snug mb-4 flex-none">
          {headline}
        </h2>
      ) : (
        <div className="text-white/40 text-sm mb-4 italic">
          {data ? "Generating insight card…" : "Select a briefing type or enter text"}
        </div>
      )}

      {/* Key points */}
      {keyPoints.length > 0 && (
        <div className="space-y-2.5 flex-1 mb-4">
          {keyPoints.map((point, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="flex-shrink-0 text-[10px] font-bold mt-0.5" style={{ color: colors.accent }}>
                {i + 1}.
              </span>
              <p className="text-white/70 text-[11px] leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-white/8 flex items-center justify-between">
        <span className="text-[9px] text-white/30">{now}</span>
        <span className="text-[9px] text-white/20">infox.intelligence</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function InsightExportPage() {
  const [variant, setVariant] = useState<CardVariant>("executive");
  const [topicId, setTopicId] = useState("ai");
  const [customText, setCustomText] = useState("");
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data, isFetching, refetch } = useQuery<BriefingData>({
    queryKey: ["insight-preview", topicId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/delivery/preview/morning`);
      if (!res.ok) throw new Error("Failed to fetch preview");
      const d = await res.json() as { summary?: string; topicLabel?: string; topicLabelTh?: string; generatedAt?: string; articleCount?: number; sourceCount?: number };
      return {
        summary: d.summary ?? "",
        topicLabel: d.topicLabel,
        topicLabelTh: d.topicLabelTh,
        generatedAt: d.generatedAt ?? new Date().toISOString(),
        articleCount: d.articleCount,
        sourceCount: d.sourceCount,
      };
    },
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  async function handleShare() {
    const text = customText.trim() || data?.summary || "";
    const headline = extractHeadline(text);
    const points = extractKeyPoints(text, 3);
    const shareText = [
      `INFOX Intelligence — ${VARIANT_LABELS[variant]}`,
      "",
      headline,
      "",
      ...points.map((p, i) => `${i + 1}. ${p}`),
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: "INFOX Insight", text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* dismissed */ }
  }

  async function handleCopyText() {
    const text = customText.trim() || data?.summary || "";
    await navigator.clipboard.writeText(text).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const TOPICS = [
    { id: "ai", label: "AI & Tech" },
    { id: "stocks", label: "Markets" },
    { id: "economy", label: "Economy" },
    { id: "politics", label: "Politics" },
    { id: "technology", label: "Technology" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Insight Export</h1>
            <p className="text-xs text-white/40">Shareable intelligence cards</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">

          {/* Controls */}
          <div className="space-y-5">

            {/* Card variant */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-medium">Card Style</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(VARIANT_LABELS) as CardVariant[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVariant(v)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        variant === v
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                      }`}
                    >
                      {VARIANT_LABELS[v]}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Load from briefing */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-medium">Load from Live Briefing</p>
                <div className="flex gap-2">
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                  >
                    {TOPICS.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#1a1a1a]">{t.label}</option>
                    ))}
                  </select>
                  <Button
                    onClick={() => { void refetch(); }}
                    disabled={isFetching}
                    variant="outline"
                    size="sm"
                    className="border-white/15 text-white hover:bg-white/10 gap-2"
                  >
                    {isFetching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Load
                  </Button>
                </div>
                {data && (
                  <p className="text-[10px] text-white/30">
                    Loaded · {data.articleCount ?? 0} articles · {data.sourceCount ?? 0} sources
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Custom text */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-medium">Custom Text</p>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Paste any briefing text here to generate a card…"
                  className="w-full h-40 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 resize-none leading-relaxed"
                />
                <p className="text-[10px] text-white/25">
                  Custom text takes priority over loaded briefing.
                </p>
              </CardContent>
            </Card>

            {/* Share actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => { void handleShare(); }}
                className="flex-1 bg-white text-black hover:bg-white/90 gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button
                onClick={() => { void handleCopyText(); }}
                variant="outline"
                className="border-white/15 text-white hover:bg-white/10 gap-2"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy text"}
              </Button>
            </div>

            <p className="text-[10px] text-white/25 text-center">
              Tip: Use your browser's screenshot or Share sheet to save as image.
            </p>
          </div>

          {/* Card preview */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-xs text-white/40 self-start">Preview</p>
            <div ref={cardRef} className="flex-shrink-0">
              <InsightCard
                data={data ?? null}
                variant={variant}
                customText={customText}
              />
            </div>

            {/* Quick signals panel */}
            <Card className="w-full bg-white/5 border-white/10">
              <CardContent className="p-4 space-y-2">
                <p className="text-[11px] text-white/40 font-medium">Card types</p>
                <div className="space-y-1.5 text-[10px] text-white/50">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span>Intelligence Signal — accelerating narratives</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-blue-400" />
                    <span>Executive Briefing — 5-point impact summary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Morning Digest — what changed overnight</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="w-3 h-3 text-white/30" />
                    <span>Screenshot to save as image (browser shortcut)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

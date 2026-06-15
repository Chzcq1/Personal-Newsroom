import React, { useState, useEffect } from "react";
import { useGetTopics, useSummarizeNews } from "@workspace/api-client-react";
import type { NewsSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Clock, FileText, ExternalLink, Loader2, RefreshCw, Newspaper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

// ── Section parser ──────────────────────────────────────────
// Parses the structured briefing format returned by promptBuilder.ts.
// Falls back gracefully if the AI deviates from the expected format.

interface BriefingSections {
  headline: string;
  executiveSummary: string;
  keyDevelopments: string[];
  whyItMatters: string;
  watchNext: string;
  raw: string; // kept for fallback rendering
}

function parseBriefing(summary: string): BriefingSections {
  const sections: BriefingSections = {
    headline: "",
    executiveSummary: "",
    keyDevelopments: [],
    whyItMatters: "",
    watchNext: "",
    raw: summary,
  };

  const lines = summary.split("\n");
  type SectionKey = "headline" | "executiveSummary" | "keyDevelopments" | "whyItMatters" | "watchNext" | null;
  let current: SectionKey = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === "HEADLINE") { current = "headline"; continue; }
    if (line === "EXECUTIVE SUMMARY") { current = "executiveSummary"; continue; }
    if (line === "KEY DEVELOPMENTS") { current = "keyDevelopments"; continue; }
    if (line === "WHY IT MATTERS") { current = "whyItMatters"; continue; }
    if (line === "WHAT TO WATCH NEXT") { current = "watchNext"; continue; }

    switch (current) {
      case "headline":
        sections.headline = sections.headline
          ? sections.headline + " " + line
          : line;
        break;
      case "executiveSummary":
        sections.executiveSummary = sections.executiveSummary
          ? sections.executiveSummary + "\n" + line
          : line;
        break;
      case "keyDevelopments": {
        // Strip leading "1. " / "• " / "- " markers
        const text = line.replace(/^\d+\.\s*/, "").replace(/^[•\-]\s*/, "").trim();
        if (text) sections.keyDevelopments.push(text);
        break;
      }
      case "whyItMatters":
        sections.whyItMatters = sections.whyItMatters
          ? sections.whyItMatters + "\n" + line
          : line;
        break;
      case "watchNext":
        sections.watchNext = sections.watchNext
          ? sections.watchNext + "\n" + line
          : line;
        break;
    }
  }

  return sections;
}

// Strip stray markdown artifacts the AI occasionally produces
function clean(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .trim();
}

// ── Sub-components ──────────────────────────────────────────

function BriefingDisplay({ data }: { data: NewsSummary }) {
  const s = parseBriefing(data.summary);
  const hasSections = s.headline || s.executiveSummary || s.keyDevelopments.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Briefing card */}
      <Card className="overflow-hidden border border-border/70 shadow-sm">
        {/* Card header bar */}
        <div className="px-8 py-5 border-b border-border/50 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-lg" aria-hidden="true">{data.topic.icon}</span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Intelligence Briefing
              </p>
              <p className="text-sm font-medium text-foreground">{data.topic.labelTh}</p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {(data.generationTimeMs / 1000).toFixed(1)}s
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              {data.articleCount} articles
            </span>
            <span className="text-muted-foreground/60">
              {format(new Date(data.generatedAt), "HH:mm · d MMM yyyy")}
            </span>
          </div>
        </div>

        <CardContent className="px-8 py-8 space-y-7">
          {hasSections ? (
            <>
              {/* Headline */}
              {s.headline && (
                <h2 className="text-2xl font-bold leading-snug tracking-tight text-foreground">
                  {clean(s.headline)}
                </h2>
              )}

              {/* Executive Summary */}
              {s.executiveSummary && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
                    Executive Summary
                  </p>
                  <div className="space-y-2">
                    {s.executiveSummary.split("\n").map((p, i) => (
                      <p key={i} className="text-base leading-relaxed text-foreground/90">
                        {clean(p)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Developments */}
              {s.keyDevelopments.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
                    Key Developments
                  </p>
                  <ol className="space-y-3">
                    {s.keyDevelopments.map((item, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm leading-relaxed text-foreground/85">
                          {clean(item)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Why it matters + Watch next in a two-column grid on wider screens */}
              {(s.whyItMatters || s.watchNext) && (
                <div className="grid sm:grid-cols-2 gap-5 pt-1">
                  {s.whyItMatters && (
                    <div className="bg-muted/50 rounded-lg p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                        Why It Matters
                      </p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {clean(s.whyItMatters)}
                      </p>
                    </div>
                  )}
                  {s.watchNext && (
                    <div className="bg-muted/50 rounded-lg p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                        What To Watch Next
                      </p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {clean(s.watchNext)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            // Fallback: plain text render if sections couldn't be parsed
            <div className="space-y-3">
              {s.raw.split("\n").map((line, i) =>
                line.trim() ? (
                  <p key={i} className="text-base leading-relaxed text-foreground/90">
                    {clean(line)}
                  </p>
                ) : null,
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="px-8 py-4 border-t border-border/40 bg-muted/20 flex justify-between items-center">
          <span className="text-xs text-muted-foreground/60">
            Powered by {data.provider}
          </span>
          <span className="text-xs text-muted-foreground/60">
            {data.provider === "github" ? "GitHub Models · gpt-4o-mini" : data.provider}
          </span>
        </CardFooter>
      </Card>

      {/* Source articles */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
          Source Articles
        </div>
        <div className="grid gap-2">
          {data.sources.map((article, idx) => (
            <a
              key={idx}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-lg border border-border/40 bg-background hover:bg-accent/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {article.title}
                  </p>
                  {article.source && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {article.source}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
                  {article.pubDate && (
                    <span>
                      {format(new Date(article.pubDate), "d MMM yyyy")}
                    </span>
                  )}
                  <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-80 transition-opacity" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function Home() {
  const { data: topics, isLoading: topicsLoading } = useGetTopics();
  const summarize = useSummarizeNews();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const handleTopicClick = (topicId: string) => {
    setSelectedTopicId(topicId);
    summarize.mutate({ data: { topicId } });
  };

  const loadingMessages = [
    "กำลังรวบรวมข่าวล่าสุด...",
    "วิเคราะห์ประเด็นสำคัญ...",
    "จัดลำดับความสำคัญของข้อมูล...",
    "กำลังจัดทำรายงาน...",
    "เกือบเสร็จแล้ว...",
  ];
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (!summarize.isPending) { setMsgIdx(0); return; }
    const id = setInterval(() => setMsgIdx((p) => (p + 1) % loadingMessages.length), 2800);
    return () => clearInterval(id);
  }, [summarize.isPending]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/95 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-2.5">
          <Newspaper className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Personal AI Newsroom
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12 pb-20 space-y-12">

        {/* Topic selector */}
        <section className="space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Select a Topic
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose a subject. The system will collect live news and produce a structured briefing in Thai.
            </p>
          </div>

          {topicsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {topics?.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleTopicClick(topic.id)}
                  disabled={summarize.isPending}
                  className={[
                    "flex flex-col items-center justify-center gap-2.5 px-3 py-5 rounded-lg border text-center transition-all",
                    "hover:border-primary/40 hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed",
                    selectedTopicId === topic.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border/60 bg-background",
                  ].join(" ")}
                >
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {topic.icon}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground leading-tight">
                      {topic.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {topic.labelTh}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <AnimatePresence mode="wait">
          {/* Loading state */}
          {summarize.isPending && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-6"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <div className="text-center space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  {loadingMessages[msgIdx]}
                </p>
                <p className="text-xs text-muted-foreground">
                  การดำเนินการนี้ใช้เวลาประมาณ 5-15 วินาที
                </p>
              </div>
            </motion.div>
          )}

          {/* Error state */}
          {summarize.isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 text-center space-y-4"
            >
              <p className="text-sm font-medium text-destructive">
                ไม่สามารถสร้างรายงานได้ในขณะนี้
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedTopicId && handleTopicClick(selectedTopicId)}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                ลองใหม่อีกครั้ง
              </Button>
            </motion.div>
          )}

          {/* Result */}
          {summarize.isSuccess && summarize.data && (
            <BriefingDisplay key="result" data={summarize.data} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

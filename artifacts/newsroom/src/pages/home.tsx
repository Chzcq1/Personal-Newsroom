import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useGetTopics, useSummarizeNews } from "@workspace/api-client-react";
import type { NewsSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  FileText,
  ExternalLink,
  Loader2,
  RefreshCw,
  Newspaper,
  Bookmark,
  BookmarkCheck,
  Cpu,
  Laptop,
  BarChart2,
  Globe,
  Landmark,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  saveBriefing,
  isBriefingSaved,
  getSavedCount,
} from "@/lib/briefingStorage";
import { setLastViewedTopic, getLastViewedTopic } from "@/lib/preferences";

// ── Icon mapping ─────────────────────────────────────────────

const TOPIC_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  cpu: Cpu,
  laptop: Laptop,
  "bar-chart-2": BarChart2,
  globe: Globe,
  landmark: Landmark,
};

function TopicIcon({ icon, className = "w-5 h-5" }: { icon: string; className?: string }) {
  const Icon = TOPIC_ICON_MAP[icon];
  if (!Icon) return <Newspaper className={className} />;
  return <Icon className={className} />;
}

// ── Extended API types ───────────────────────────────────────
// debugInfo and failsafeMode are not in the OpenAPI spec;
// we layer them on via type intersection.

interface FeedDiagnostic {
  name: string;
  url: string;
  status: "success" | "failed";
  articleCount: number;
  durationMs: number;
  error?: string;
}

type ExtendedNewsSummary = NewsSummary & {
  debugInfo?: FeedDiagnostic[];
  failsafeMode?: boolean;
  failsafeReason?: string;
};

// ── Health status ────────────────────────────────────────────

interface HealthData {
  status: "healthy" | "degraded" | "offline";
  aiProviderWorking: boolean;
  aiProviderName: string;
  aiProviderDetail: string;
  rssFeedsWorking: boolean;
  rssFeedDetail: string;
}

function HealthBadge({ health }: { health: HealthData | null }) {
  if (!health) return null;
  const colors = {
    healthy: "bg-green-50 text-green-700 border-green-200",
    degraded: "bg-amber-50 text-amber-700 border-amber-200",
    offline: "bg-red-50 text-red-600 border-red-200",
  };
  const dots = {
    healthy: "bg-green-500",
    degraded: "bg-amber-500",
    offline: "bg-red-500",
  };
  const labels = {
    healthy: "System Healthy",
    degraded: "System Degraded",
    offline: "System Offline",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${colors[health.status]}`}
      title={`AI: ${health.aiProviderDetail} | RSS: ${health.rssFeedDetail}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[health.status]}`} />
      {labels[health.status]}
    </span>
  );
}

// ── Section parser ──────────────────────────────────────────

interface BriefingSections {
  headline: string;
  executiveSummary: string;
  keyDevelopments: string[];
  impactAnalysis: string;
  watchNext: string;
  raw: string;
}

function parseBriefing(summary: string): BriefingSections {
  const sections: BriefingSections = {
    headline: "",
    executiveSummary: "",
    keyDevelopments: [],
    impactAnalysis: "",
    watchNext: "",
    raw: summary,
  };

  const lines = summary.split("\n");
  type SectionKey = "headline" | "executiveSummary" | "keyDevelopments" | "impactAnalysis" | "watchNext" | null;
  let current: SectionKey = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === "HEADLINE") { current = "headline"; continue; }
    if (line === "EXECUTIVE SUMMARY") { current = "executiveSummary"; continue; }
    if (line === "KEY DEVELOPMENTS") { current = "keyDevelopments"; continue; }
    if (line === "IMPACT ANALYSIS" || line === "WHY IT MATTERS") { current = "impactAnalysis"; continue; }
    if (line === "WHAT TO WATCH NEXT") { current = "watchNext"; continue; }

    switch (current) {
      case "headline":
        sections.headline = sections.headline ? sections.headline + " " + line : line;
        break;
      case "executiveSummary":
        sections.executiveSummary = sections.executiveSummary
          ? sections.executiveSummary + "\n" + line
          : line;
        break;
      case "keyDevelopments": {
        const text = line.replace(/^\d+\.\s*/, "").replace(/^[•\-]\s*/, "").trim();
        if (text) sections.keyDevelopments.push(text);
        break;
      }
      case "impactAnalysis":
        sections.impactAnalysis = sections.impactAnalysis
          ? sections.impactAnalysis + "\n" + line
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

function clean(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .trim();
}

// ── Failsafe Display ─────────────────────────────────────────
// Shown when AI fails but articles were collected successfully.
// User always sees something — never a blank page.

function FailsafeDisplay({ data }: { data: ExtendedNewsSummary }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-6 py-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800">
              AI Summary Unavailable — Showing Collected Articles
            </p>
            {data.failsafeReason && (
              <p className="text-xs text-amber-700 leading-relaxed">{data.failsafeReason}</p>
            )}
            <p className="text-xs text-amber-600">
              รวบรวมได้ {data.articleCount} บทความ — AI ไม่สามารถประมวลผลได้ในขณะนี้
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <TopicIcon icon={data.topic.icon} className="w-3.5 h-3.5 text-primary" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              {data.topic.label}
            </p>
            <p className="text-sm font-semibold text-foreground">{data.topic.labelTh}</p>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {format(new Date(data.generatedAt), "HH:mm · d MMM yyyy")}
          </span>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-lg border border-border/50 bg-background hover:bg-accent/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </p>
                  {article.source && (
                    <p className="text-xs text-muted-foreground mt-0.5">{article.source}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
                  {article.pubDate && (
                    <span>{format(new Date(article.pubDate), "d MMM yyyy")}</span>
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

// ── Dev Debug Panel ───────────────────────────────────────────

function DebugPanel({ data }: { data: ExtendedNewsSummary }) {
  const [open, setOpen] = useState(false);
  const feeds = data.debugInfo ?? [];
  const failed = feeds.filter((f) => f.status === "failed").length;
  const articleTextLength = data.sources
    .map((s) => `${s.title} ${s.description ?? ""}`)
    .join(" ").length;
  const estimatedTokens = Math.round(articleTextLength / 4);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 text-xs font-mono overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-amber-700 hover:bg-amber-100/50 transition-colors"
      >
        <span className="font-semibold flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          DEV — {feeds.length} feeds · {failed} failed · ~{estimatedTokens} tokens · {data.generationTimeMs}ms
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="border-t border-amber-200">
          {/* Provider info */}
          <div className="px-4 py-3 bg-blue-50/40 border-b border-amber-200 space-y-1">
            <p className="font-semibold text-blue-700">AI Provider</p>
            <p className="text-blue-600">Provider: {data.provider}</p>
            <p className="text-blue-600">Generation time: {data.generationTimeMs}ms</p>
            <p className="text-blue-600">Articles used: {data.articleCount}</p>
            <p className="text-blue-600">Estimated input tokens: ~{estimatedTokens}</p>
            {data.failsafeMode && (
              <p className="text-red-600 font-semibold">⚠ FAILSAFE MODE — {data.failsafeReason}</p>
            )}
          </div>
          {/* Feed diagnostics */}
          <div className="divide-y divide-amber-100">
            {feeds.map((feed, i) => (
              <div
                key={i}
                className={`px-4 py-2.5 flex items-start gap-3 ${
                  feed.status === "failed" ? "bg-red-50/50" : "bg-green-50/30"
                }`}
              >
                {feed.status === "success" ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{feed.name}</span>
                    <span className="text-muted-foreground">{feed.durationMs}ms</span>
                    {feed.status === "success" && (
                      <span className="text-green-700">{feed.articleCount} articles</span>
                    )}
                  </div>
                  <div className="text-muted-foreground truncate">{feed.url}</div>
                  {feed.error && <div className="text-red-600 break-all">{feed.error}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Briefing Display ─────────────────────────────────────────

function BriefingDisplay({ data }: { data: ExtendedNewsSummary }) {
  if (data.failsafeMode) {
    return <FailsafeDisplay data={data} />;
  }

  const s = parseBriefing(data.summary);
  const hasSections = s.headline || s.executiveSummary || s.keyDevelopments.length > 0;
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isBriefingSaved(data.topic.id, data.generatedAt));
  }, [data.topic.id, data.generatedAt]);

  const handleSave = () => {
    saveBriefing({
      topicId: data.topic.id,
      topicLabel: data.topic.label,
      topicLabelTh: data.topic.labelTh,
      topicIcon: data.topic.icon,
      summary: data.summary,
      sources: data.sources,
      generatedAt: data.generatedAt,
      provider: data.provider,
      articleCount: data.articleCount,
    });
    setSaved(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <Card className="overflow-hidden border border-border/70 shadow-sm">
        <div className="px-8 py-5 border-b border-border/50 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <TopicIcon icon={data.topic.icon} className="w-4 h-4 text-primary" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Intelligence Briefing
              </p>
              <p className="text-sm font-medium text-foreground">{data.topic.labelTh}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap justify-end">
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
            <Button
              variant={saved ? "secondary" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleSave}
              disabled={saved}
            >
              {saved ? (
                <><BookmarkCheck className="w-3.5 h-3.5" />Saved</>
              ) : (
                <><Bookmark className="w-3.5 h-3.5" />Save</>
              )}
            </Button>
          </div>
        </div>

        <CardContent className="px-8 py-8 space-y-7">
          {hasSections ? (
            <>
              {s.headline && (
                <h2 className="text-2xl font-bold leading-snug tracking-tight text-foreground">
                  {clean(s.headline)}
                </h2>
              )}
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
              {(s.impactAnalysis || s.watchNext) && (
                <div className="grid sm:grid-cols-2 gap-5 pt-1">
                  {s.impactAnalysis && (
                    <div className="bg-muted/50 rounded-lg p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                        Impact Analysis
                      </p>
                      <div className="space-y-2">
                        {s.impactAnalysis.split("\n").map((p, i) => (
                          <p key={i} className="text-sm leading-relaxed text-foreground/85">
                            {clean(p)}
                          </p>
                        ))}
                      </div>
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
          <span className="text-xs text-muted-foreground/60">Powered by {data.provider}</span>
          <span className="text-xs text-muted-foreground/60">
            {data.provider === "github" ? "GitHub Models · gpt-4o-mini" : data.provider}
          </span>
        </CardFooter>
      </Card>

      {/* Dev debug panel */}
      {import.meta.env.DEV && (
        <DebugPanel data={data} />
      )}

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
                    <p className="text-xs text-muted-foreground mt-0.5">{article.source}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
                  {article.pubDate && (
                    <span>{format(new Date(article.pubDate), "d MMM yyyy")}</span>
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
  const [savedCount, setSavedCount] = useState(getSavedCount);
  const [health, setHealth] = useState<HealthData | null>(null);
  const restoredRef = useRef(false);

  // Load health status in background
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/health`)
      .then((r) => r.json())
      .then((data: HealthData) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  // Restore last viewed topic once topics are loaded
  useEffect(() => {
    if (restoredRef.current || topicsLoading || !topics || topics.length === 0) return;
    restoredRef.current = true;
    const lastTopicId = getLastViewedTopic();
    if (lastTopicId && topics.find((t) => t.id === lastTopicId)) {
      setSelectedTopicId(lastTopicId);
      summarize.mutate({ data: { topicId: lastTopicId } });
    }
  }, [topicsLoading, topics]);

  const handleTopicClick = (topicId: string) => {
    setSelectedTopicId(topicId);
    setLastViewedTopic(topicId);
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

  useEffect(() => {
    if (summarize.isSuccess) setSavedCount(getSavedCount());
  }, [summarize.isSuccess]);

  const extendedError = summarize.error as (Error & { response?: { data?: { error?: string } } }) | null;
  const errorMessage =
    extendedError?.response?.data?.error ||
    "ไม่สามารถสร้างรายงานได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/95 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="INFOX"
              className="h-7 w-auto object-contain"
            />
            {health && <HealthBadge health={health} />}
          </div>
          <div className="flex items-center gap-1">
            <Link to="/my-feed">
              <Button variant="ghost" size="sm" className="gap-2 text-xs">
                <Newspaper className="w-3.5 h-3.5" />
                My Feed
              </Button>
            </Link>
            <Link to="/saved">
              <Button variant="ghost" size="sm" className="gap-2 text-xs">
                <Bookmark className="w-3.5 h-3.5" />
                Saved
                {savedCount > 0 && (
                  <span className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                    {savedCount > 9 ? "9+" : savedCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12 pb-20 space-y-12">
        {/* Topic selector */}
        <section className="space-y-6">
          <div className="space-y-3">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="INFOX"
              className="h-12 w-auto object-contain"
            />
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Select a Topic</h1>
              <p className="text-sm text-muted-foreground">
                Choose a subject. The system collects live news and produces a structured intelligence briefing in Thai.
              </p>
            </div>
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
                  <span className={[
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    selectedTopicId === topic.id ? "bg-primary/15" : "bg-muted/60",
                  ].join(" ")}>
                    <TopicIcon
                      icon={topic.icon}
                      className={[
                        "w-5 h-5",
                        selectedTopicId === topic.id ? "text-primary" : "text-muted-foreground",
                      ].join(" ")}
                    />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground leading-tight">{topic.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{topic.labelTh}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <AnimatePresence mode="wait">
          {/* Loading */}
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
                <p className="text-sm font-medium text-foreground">{loadingMessages[msgIdx]}</p>
                <p className="text-xs text-muted-foreground">การดำเนินการนี้ใช้เวลาประมาณ 5-15 วินาที</p>
              </div>
            </motion.div>
          )}

          {/* Error — shows specific reason */}
          {summarize.isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 space-y-4"
            >
              <p className="text-sm font-semibold text-destructive">ไม่สามารถสร้างรายงานได้</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{errorMessage}</p>
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
            <BriefingDisplay
              key="result"
              data={summarize.data as ExtendedNewsSummary}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

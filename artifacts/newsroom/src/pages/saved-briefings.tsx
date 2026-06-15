import React, { useState, useCallback } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bookmark,
  Trash2,
  ChevronDown,
  ChevronUp,
  Newspaper,
  Cpu,
  Laptop,
  BarChart2,
  Globe,
  Landmark,
  FileText,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  getSavedBriefings,
  deleteSavedBriefing,
  type SavedBriefing,
} from "@/lib/briefingStorage";

// ── Icon mapping ──────────────────────────────────────────────

const TOPIC_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  cpu: Cpu,
  laptop: Laptop,
  "bar-chart-2": BarChart2,
  globe: Globe,
  landmark: Landmark,
};

function TopicIcon({ icon, className = "w-4 h-4" }: { icon: string; className?: string }) {
  const Icon = TOPIC_ICON_MAP[icon];
  if (!Icon) return <Newspaper className={className} />;
  return <Icon className={className} />;
}

// ── Briefing section parser (minimal) ───────────────────────

function extractHeadline(summary: string): string {
  const lines = summary.split("\n");
  let inHeadline = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "HEADLINE") { inHeadline = true; continue; }
    if (inHeadline && trimmed) return trimmed;
    if (inHeadline && !trimmed) continue;
  }
  // Fallback: first non-empty, non-section-header line
  return lines.find((l) => l.trim() && !l.trim().match(/^[A-Z\s]+$/))?.trim() ?? "";
}

function clean(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .trim();
}

// ── Briefing Card ─────────────────────────────────────────────

function BriefingCard({
  briefing,
  onDelete,
}: {
  briefing: SavedBriefing;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const headline = clean(extractHeadline(briefing.summary));

  return (
    <Card className="overflow-hidden border border-border/60">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <TopicIcon icon={briefing.topicIcon} className="w-3.5 h-3.5 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {briefing.topicLabel}
            </p>
            <p className="text-xs font-medium text-foreground">{briefing.topicLabelTh}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span>{briefing.articleCount} articles</span>
          </div>
          <span className="text-xs text-muted-foreground/60">
            {format(new Date(briefing.savedAt), "d MMM yyyy · HH:mm")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(briefing.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Headline always visible */}
      <div
        className="px-6 py-4 cursor-pointer hover:bg-accent/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-semibold text-foreground leading-snug flex-1">
            {headline || "(ไม่มีหัวข้อ)"}
          </p>
          <span className="flex-shrink-0 mt-0.5 text-muted-foreground">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </div>
      </div>

      {/* Expanded full content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <CardContent className="px-6 pb-6 pt-0 space-y-6 border-t border-border/30">
              <div className="mt-4 space-y-4">
                {briefing.summary
                  .split("\n")
                  .filter((l) => l.trim())
                  .map((line, i) => {
                    const trimmed = line.trim();
                    const isSectionHeader = /^[A-Z][A-Z\s]+$/.test(trimmed) && trimmed.length < 30;
                    if (isSectionHeader) {
                      return (
                        <p
                          key={i}
                          className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground pt-2"
                        >
                          {trimmed}
                        </p>
                      );
                    }
                    return (
                      <p key={i} className="text-sm leading-relaxed text-foreground/85">
                        {clean(trimmed)}
                      </p>
                    );
                  })}
              </div>

              {/* Sources */}
              {briefing.sources.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border/30">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5">
                    <ExternalLink className="w-3 h-3" />
                    Source Articles
                  </p>
                  <div className="space-y-1.5">
                    {briefing.sources.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border/30 hover:bg-accent/20 transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {s.title}
                          </p>
                          {s.source && (
                            <p className="text-[11px] text-muted-foreground">{s.source}</p>
                          )}
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function SavedBriefings() {
  const [briefings, setBriefings] = useState<SavedBriefing[]>(getSavedBriefings);

  const handleDelete = useCallback((id: string) => {
    deleteSavedBriefing(id);
    setBriefings(getSavedBriefings());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/95 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-xs -ml-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          </Link>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              My Briefings
            </span>
          </div>
          {briefings.length > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({briefings.length})
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-10 pb-20">
        {briefings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5 text-center">
            <div className="w-14 h-14 rounded-xl bg-muted/60 flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                ยังไม่มีรายงานที่บันทึกไว้
              </p>
              <p className="text-sm text-muted-foreground">
                กดปุ่ม Save ในรายงานที่คุณต้องการเก็บไว้อ่านภายหลัง
              </p>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm" className="mt-2 gap-2">
                <ArrowLeft className="w-3.5 h-3.5" />
                กลับหน้าหลัก
              </Button>
            </Link>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {briefings.map((briefing) => (
              <BriefingCard
                key={briefing.id}
                briefing={briefing}
                onDelete={handleDelete}
              />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}

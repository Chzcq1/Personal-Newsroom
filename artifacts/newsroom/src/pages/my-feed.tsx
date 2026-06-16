// ============================================================
// MY FEED — Sprint 9 Contextual Intelligence Layer
//
// Upgraded from Sprint 8:
//   • Sends tasteSignal to API (taste learning — Task D)
//   • Displays relevance class badges (direct/contextual/weak)
//   • Shows narrative clusters above individual stories (Task C)
//   • Feed quality bar (accuracy%, clustering rate — Task J)
//   • Rich selection reasons (Task I)
//   • Records article opens/skips for adaptive learning (Task D)
//   • Graph-matched entities shown in detail mode (Task A+B)
//   • Context summary from personal context layer (Task H)
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  RefreshCw,
  Newspaper,
  ExternalLink,
  AlertTriangle,
  LayoutList,
  AlignLeft,
  Eye,
  EyeOff,
  Layers,
  GitBranch,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Star,
  X,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInterests } from "@/lib/interestProfile";
import { getSourceBrand } from "@/lib/sourceBranding";
import { useReadingProgress } from "@/lib/readingProgress";
import { recordTasteEvent, deriveTasteSignal } from "@/lib/tasteLearning";
import { format, formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const DENSITY_KEY = "ai-newsroom:feed-density";

// ── Types ─────────────────────────────────────────────────────

interface FeedItem {
  title: string;
  url: string;
  description: string | null;
  pubDate: string | null;
  source: string | null;
  topicId: string;
  relevanceScore: number;
  relevanceClass: "direct" | "contextual" | "weak" | "incidental";
  matchedInterests: string[];
  matchedWatchlist: string[];
  graphMatchedEntities: string[];
  selectionReason: string;
  recencyLabel?: string;
  sourceTier?: string;
  imageUrl?: string | null;
  signalScore: number;
  narrativeClusterId: string | null;
  narrativeClusterHeadline: string | null;
  debug?: {
    directKeywordScore: number;
    graphScore: number;
    entityOverlapScore: number;
    sourceModifier: number;
  };
}

interface NarrativeClusterItem {
  id: string;
  headline: string;
  theme: string;
  dominantEntity: string | null;
  articles: Array<{ url: string; title: string; source: string | null }>;
  sourceCount: number;
  avgCombinedScore: number;
  isMultiSource: boolean;
}

interface FeedResponse {
  items: FeedItem[];
  narrativeClusters: NarrativeClusterItem[];
  totalArticles: number;
  filteredArticles: number;
  topicsSearched: string[];
  interestsApplied: string[];
  watchlistApplied: string[];
  contextSummary: string;
  feedQuality: {
    relevanceAccuracy: number;
    clusteringRate: number;
    directCount: number;
    contextualCount: number;
  };
  generatedAt: string;
}

type Density = "compact" | "detailed";

// ── Helpers ───────────────────────────────────────────────────

const TOPIC_LABELS: Record<string, string> = {
  ai: "AI", technology: "Tech", stocks: "Markets",
  economy: "Economy", politics: "Politics",
};

const CLASS_STYLES: Record<FeedItem["relevanceClass"], { label: string; className: string }> = {
  direct:      { label: "Direct",      className: "text-emerald-400 border-emerald-400/30" },
  contextual:  { label: "Contextual",  className: "text-sky-400 border-sky-400/30" },
  weak:        { label: "Weak",        className: "text-white/30 border-white/15" },
  incidental:  { label: "Incidental",  className: "text-white/20 border-white/10" },
};

function readingTime(text: string | null | undefined): string | null {
  if (!text) return null;
  const words = text.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min`;
}

function formatAge(pubDate: string | null): string {
  if (!pubDate) return "";
  try { return formatDistanceToNow(new Date(pubDate), { addSuffix: true }); }
  catch { return format(new Date(pubDate), "MMM d, HH:mm"); }
}

// ── Sub-components ────────────────────────────────────────────

function SourceAvatar({ source }: { source: string | null }) {
  const brand = getSourceBrand(source);
  return (
    <div
      className="flex-shrink-0 w-7 h-7 rounded-sm flex items-center justify-center text-[9px] font-bold tracking-tight select-none"
      style={{ backgroundColor: brand.bg, color: brand.fg }}
      title={source ?? "Unknown source"}
    >
      {brand.initials}
    </div>
  );
}

function TierBadge({ tier }: { tier?: string }) {
  if (tier !== "A") return null;
  return (
    <span className="text-[9px] font-semibold text-amber-400 border border-amber-400/30 px-1 py-0.5 rounded leading-none">
      Tier A
    </span>
  );
}

function RecencyBadge({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <span className={`text-[9px] font-medium ${label === "Breaking" ? "text-amber-400" : "text-white/50"}`}>
      {label}
    </span>
  );
}

function RelevanceClassBadge({ cls }: { cls: FeedItem["relevanceClass"] }) {
  const s = CLASS_STYLES[cls];
  if (cls === "incidental") return null;
  return (
    <span className={`text-[9px] font-medium border px-1 py-0.5 rounded leading-none ${s.className}`}>
      {s.label}
    </span>
  );
}

function TopicTag({ topicId }: { topicId: string }) {
  const label = TOPIC_LABELS[topicId] ?? topicId;
  return (
    <span className="text-[9px] font-medium text-white/40 border border-white/10 px-1.5 py-0.5 rounded leading-none">
      {label}
    </span>
  );
}

function ArticleThumbnail({ imageUrl, title }: { imageUrl: string | null | undefined; title: string }) {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) return null;
  return (
    <div className="flex-shrink-0 w-20 h-14 rounded overflow-hidden bg-white/5">
      <img src={imageUrl} alt={title} loading="lazy"
        className="w-full h-full object-cover" onError={() => setFailed(true)} />
    </div>
  );
}

// ── Narrative Cluster Card ────────────────────────────────────

function NarrativeClusterCard({ cluster }: { cluster: NarrativeClusterItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3.5">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 mt-0.5">
          <Layers className="w-3.5 h-3.5 text-sky-400/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] font-semibold text-white/80 leading-snug line-clamp-2">
              {cluster.headline}
            </p>
            <span className="flex-shrink-0 text-[9px] text-sky-400/70 border border-sky-400/20 px-1.5 py-0.5 rounded leading-none whitespace-nowrap">
              {cluster.articles.length} stories
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {cluster.dominantEntity && (
              <span className="text-[10px] text-white/40">{cluster.dominantEntity}</span>
            )}
            {cluster.isMultiSource && (
              <span className="flex items-center gap-0.5 text-[9px] text-emerald-400/60">
                <GitBranch className="w-2.5 h-2.5" />
                {cluster.sourceCount} sources
              </span>
            )}
            {cluster.theme && (
              <span className="text-[9px] text-white/25 truncate">{cluster.theme}</span>
            )}
          </div>

          {expanded && (
            <ul className="mt-2.5 space-y-1.5 border-t border-white/5 pt-2.5">
              {cluster.articles.map((a) => (
                <li key={a.url} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-1 h-1 rounded-full bg-white/25 mt-1.5" />
                  <a href={a.url} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-white/55 hover:text-white/80 transition-colors leading-snug line-clamp-1">
                    {a.title}
                    {a.source && <span className="text-white/30 ml-1.5">— {a.source}</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <button onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 text-[10px] text-sky-400/50 hover:text-sky-400/80 transition-colors">
            {expanded ? "Collapse" : `Show ${cluster.articles.length} articles →`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FeedCard ──────────────────────────────────────────────────

function FeedCard({
  item, density, markRead, isRead, interests,
}: {
  item: FeedItem;
  density: Density;
  markRead: (url: string) => void;
  isRead: boolean;
  interests: string[];
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || isRead) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          markRead(item.url);
          observer.disconnect();
          // Taste learning: record implicit read (scrolled into view)
          if (item.matchedInterests[0]) {
            recordTasteEvent({ type: "open", interest: item.matchedInterests[0] ?? null, topicId: item.topicId, url: item.url });
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [item.url, isRead, markRead, item.matchedInterests, item.topicId]);

  const rt = readingTime(item.description);

  if (density === "compact") {
    return (
      <div ref={cardRef}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors cursor-default ${
          isRead ? "border-white/5 hover:border-white/8 bg-white/[0.02]" : "border-white/8 hover:border-white/15 bg-white/[0.03] hover:bg-white/[0.05]"
        }`}>
        <SourceAvatar source={item.source} />
        <div className="flex-1 min-w-0">
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className={`block text-[13px] font-medium leading-snug truncate transition-colors hover:text-white ${
              isRead ? "text-white/50" : "text-white/90"
            }`}>
            {item.title}
          </a>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RecencyBadge label={item.recencyLabel} />
          <RelevanceClassBadge cls={item.relevanceClass} />
          <span className="text-[10px] text-white/30 whitespace-nowrap hidden sm:block">
            {item.pubDate ? formatAge(item.pubDate) : ""}
          </span>
          <TopicTag topicId={item.topicId} />
        </div>
      </div>
    );
  }

  // Detailed mode
  return (
    <div ref={cardRef}
      className={`rounded-lg border p-4 transition-colors group ${
        isRead ? "border-white/5 hover:border-white/10 bg-white/[0.02]" : "border-white/8 hover:border-white/15 bg-white/[0.03] hover:bg-white/[0.05]"
      }`}>
      {/* Meta row */}
      <div className="flex items-center gap-2 mb-2.5">
        <SourceAvatar source={item.source} />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          {item.source && (
            <span className="text-[11px] font-medium text-white/60 truncate">{item.source}</span>
          )}
          {item.pubDate && (
            <>
              <span className="text-white/20 text-[10px]">·</span>
              <span className="text-[10px] text-white/35">{formatAge(item.pubDate)}</span>
            </>
          )}
          {rt && (
            <>
              <span className="text-white/20 text-[10px]">·</span>
              <span className="text-[10px] text-white/30">{rt} read</span>
            </>
          )}
        </div>
        <TierBadge tier={item.sourceTier} />
        <RelevanceClassBadge cls={item.relevanceClass} />
      </div>

      {/* Title + image */}
      <div className="flex items-start gap-3 mb-2">
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className={`flex-1 text-[13px] font-semibold leading-snug transition-colors hover:text-white line-clamp-2 ${
            isRead ? "text-white/55" : "text-white/90"
          }`}>
          {item.title}
        </a>
        <ArticleThumbnail imageUrl={item.imageUrl} title={item.title} />
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-[12px] text-white/50 leading-relaxed line-clamp-2 mb-2.5">
          {item.description}
        </p>
      )}

      {/* Graph entities (if contextual match) */}
      {item.graphMatchedEntities.length > 0 && item.relevanceClass === "contextual" && (
        <div className="flex items-center gap-1.5 mb-2">
          <GitBranch className="w-3 h-3 text-sky-400/50 flex-shrink-0" />
          <span className="text-[10px] text-sky-400/50">
            Via: {item.graphMatchedEntities.slice(0, 3).join(", ")}
          </span>
        </div>
      )}

      {/* Narrative cluster badge */}
      {item.narrativeClusterHeadline && (
        <div className="flex items-center gap-1.5 mb-2">
          <Layers className="w-3 h-3 text-sky-400/40 flex-shrink-0" />
          <span className="text-[10px] text-white/30 truncate max-w-[300px]">
            {item.narrativeClusterHeadline.length > 60
              ? item.narrativeClusterHeadline.slice(0, 60) + "…"
              : item.narrativeClusterHeadline}
          </span>
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TopicTag topicId={item.topicId} />
          <RecencyBadge label={item.recencyLabel} />
          {item.selectionReason && (
            <span className="text-[10px] text-white/30 italic truncate max-w-[280px]">
              {item.selectionReason}
            </span>
          )}
        </div>
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors">
          Read
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Sprint 10 Task F — Relevance feedback */}
      <FeedbackBar item={item} interests={interests} />
    </div>
  );
}

// ── Relevance Feedback Bar (Sprint 10 Task F) ─────────────────

function FeedbackBar({ item, interests }: { item: FeedItem; interests: string[] }) {
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function sendFeedback(type: "more_like_this" | "less_like_this" | "irrelevant" | "high_value") {
    if (sending || sent) return;
    setSending(true);
    try {
      await fetch(`${BASE}/api/adaptive/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleUrl: item.url,
          articleTitle: item.title,
          type,
          entities: item.graphMatchedEntities,
          topicId: item.topicId,
          narrativeId: item.narrativeClusterId,
        }),
      });
      setSent(type);
    } catch { /* silent */ } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-2 text-[10px] text-white/30 italic">
        {sent === "high_value" && "★ Marked high value — boosting similar content"}
        {sent === "more_like_this" && "✓ More like this — noted"}
        {sent === "less_like_this" && "↓ Less like this — reducing similar content"}
        {sent === "irrelevant" && "✗ Marked irrelevant — won't show similar"}
      </div>
    );
  }

  return (
    <div className="mt-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <span className="text-[9px] text-white/20 mr-1">Rate:</span>
      <button
        onClick={() => sendFeedback("high_value")}
        disabled={sending}
        title="High value — show more like this"
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] text-amber-400/60 hover:text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-40"
      >
        <Star className="w-2.5 h-2.5" />
        <span>High value</span>
      </button>
      <button
        onClick={() => sendFeedback("more_like_this")}
        disabled={sending}
        title="More like this"
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-40"
      >
        <ThumbsUp className="w-2.5 h-2.5" />
        <span>More</span>
      </button>
      <button
        onClick={() => sendFeedback("less_like_this")}
        disabled={sending}
        title="Less like this"
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors disabled:opacity-40"
      >
        <ThumbsDown className="w-2.5 h-2.5" />
        <span>Less</span>
      </button>
      <button
        onClick={() => sendFeedback("irrelevant")}
        disabled={sending}
        title="Irrelevant — never show similar"
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
      >
        <X className="w-2.5 h-2.5" />
        <span>Irrelevant</span>
      </button>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonCard({ density }: { density: Density }) {
  if (density === "compact") {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-white/5 bg-white/[0.02] animate-pulse">
        <div className="w-7 h-7 rounded-sm bg-white/10 flex-shrink-0" />
        <div className="flex-1 h-4 bg-white/8 rounded" />
        <div className="w-12 h-3 bg-white/5 rounded" />
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-white/5 p-4 bg-white/[0.02] animate-pulse space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-sm bg-white/10 flex-shrink-0" />
        <div className="flex-1 h-3 bg-white/8 rounded" />
      </div>
      <div className="h-4 bg-white/10 rounded w-3/4" />
      <div className="h-3 bg-white/5 rounded w-full" />
      <div className="h-3 bg-white/5 rounded w-2/3" />
    </div>
  );
}

// ── Feed Quality Bar ──────────────────────────────────────────

function FeedQualityBar({ fq, filtered }: {
  fq: FeedResponse["feedQuality"];
  filtered: number;
}) {
  return (
    <div className="flex items-center gap-3 text-[10px] text-white/25 flex-wrap">
      <span className="flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        <span className={fq.relevanceAccuracy >= 70 ? "text-emerald-400/60" : "text-white/35"}>
          {fq.relevanceAccuracy}% relevant
        </span>
      </span>
      {fq.clusteringRate > 0 && (
        <>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {fq.clusteringRate}% clustered
          </span>
        </>
      )}
      {filtered > 0 && (
        <>
          <span>·</span>
          <span>{filtered} low-quality filtered</span>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function MyFeedPage() {
  const interests = getInterests();

  const [density, setDensity] = useState<Density>(() => {
    try {
      const stored = localStorage.getItem(DENSITY_KEY);
      return stored === "compact" || stored === "detailed" ? stored : "detailed";
    } catch { return "detailed"; }
  });

  const [hideRead, setHideRead] = useState(() => {
    try { return localStorage.getItem("ai-newsroom:hide-read") === "true"; } catch { return false; }
  });

  const handleHideReadToggle = useCallback(() => {
    setHideRead((prev) => {
      const next = !prev;
      try { localStorage.setItem("ai-newsroom:hide-read", String(next)); } catch { /**/ }
      return next;
    });
  }, []);

  const [watchlistInput, setWatchlistInput] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [showClusters, setShowClusters] = useState(true);

  const handleDensityToggle = useCallback((next: Density) => {
    setDensity(next);
    try { localStorage.setItem(DENSITY_KEY, next); } catch { /**/ }
  }, []);

  // Derive taste signal (from localStorage events)
  const tasteSignal = deriveTasteSignal();

  const { data, isLoading, error, refetch, isFetching } = useQuery<FeedResponse>({
    queryKey: ["my-feed", interests, watchlist],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/feed/personal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests, watchlist, tasteSignal }),
      });
      if (!res.ok) throw new Error("Failed to fetch personal feed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const allUrls = data?.items.map((i) => i.url) ?? [];
  const { readCount, markRead, readUrls } = useReadingProgress(allUrls);

  function handleAddWatchlist() {
    const term = watchlistInput.trim();
    if (term && !watchlist.includes(term)) {
      setWatchlist((v) => [...v, term]);
      setWatchlistInput("");
    }
  }

  // Sprint 8 Task F — apply hide-read filter
  const visibleItems = hideRead
    ? (data?.items ?? []).filter((i) => !readUrls.has(i.url))
    : (data?.items ?? []);

  const hiddenReadCount = hideRead
    ? (data?.items.filter((i) => readUrls.has(i.url)).length ?? 0)
    : 0;

  // Sprint 9 — segment by relevance class
  const directItems = visibleItems.filter((i) => i.relevanceClass === "direct");
  const contextualItems = visibleItems.filter((i) => i.relevanceClass === "contextual");
  const weakItems = visibleItems.filter((i) => i.relevanceClass === "weak");
  const incidentalItems = visibleItems.filter((i) => i.relevanceClass === "incidental");

  // Legacy fallback: if no relevanceClass, use score-based split
  const hasClassification = visibleItems.some((i) => i.relevanceClass);
  const matchedItems = hasClassification
    ? [...directItems, ...contextualItems]
    : visibleItems.filter((i) => i.relevanceScore > 0);
  const otherItems = hasClassification
    ? [...weakItems, ...incidentalItems]
    : visibleItems.filter((i) => i.relevanceScore === 0);

  const narrativeClusters = (data?.narrativeClusters ?? []).filter((c) => c.isMultiSource);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/50 hover:text-white gap-1.5 -ml-2 px-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold tracking-tight">My Feed</h1>
            <div className="flex items-center gap-2 text-[10px] text-white/35">
              {interests.length > 0
                ? <span>{interests.length} interest{interests.length !== 1 ? "s" : ""}</span>
                : <span>All topics</span>}
              {data && readCount > 0 && (
                <><span>·</span><span>{readCount} of {allUrls.length} read</span></>
              )}
              {data && (
                <><span>·</span><span>{format(new Date(data.generatedAt), "HH:mm")}</span></>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleHideReadToggle}
              className={`p-1.5 rounded-md border transition-colors ${
                hideRead
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                  : "border-white/10 text-white/40 hover:text-white/60"
              }`}
              title={hideRead ? "Showing unread only" : "Show unread only"}>
              {hideRead ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            <div className="flex rounded-md border border-white/10 overflow-hidden">
              <button onClick={() => handleDensityToggle("compact")}
                className={`p-1.5 transition-colors ${density === "compact" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"}`}
                title="Compact view">
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDensityToggle("detailed")}
                className={`p-1.5 transition-colors ${density === "detailed" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"}`}
                title="Detailed view">
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}
              className="text-white/50 hover:text-white px-2" title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* Interests + watchlist bar */}
        <div className="space-y-3">
          {interests.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {interests.map((i) => (
                <span key={i} className="text-[11px] font-medium px-2 py-0.5 bg-white/8 text-white/60 border border-white/10 rounded-full">
                  {i}
                </span>
              ))}
              <Link href="/settings/interests">
                <span className="text-[11px] px-2 py-0.5 text-white/30 hover:text-white/50 cursor-pointer transition-colors">
                  Edit →
                </span>
              </Link>
            </div>
          )}

          {/* Personal context summary */}
          {data?.contextSummary && (
            <p className="text-[10px] text-white/25 italic">{data.contextSummary}</p>
          )}

          {interests.length === 0 && !isLoading && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-500/8 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80">
                No interests set — showing all topics.{" "}
                <Link href="/settings/interests">
                  <span className="underline cursor-pointer">Set interests →</span>
                </Link>
              </p>
            </div>
          )}

          {/* Watchlist */}
          <div className="flex items-center gap-2">
            <input type="text" value={watchlistInput}
              onChange={(e) => setWatchlistInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddWatchlist()}
              placeholder="Track a keyword or company…"
              className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
            />
            <Button size="sm" onClick={handleAddWatchlist} disabled={!watchlistInput.trim()}
              variant="outline" className="border-white/15 text-white/70 hover:text-white hover:bg-white/8 px-3 text-xs">
              Add
            </Button>
          </div>

          {watchlist.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {watchlist.map((term) => (
                <span key={term}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full">
                  {term}
                  <button onClick={() => setWatchlist((v) => v.filter((t) => t !== term))}
                    className="hover:text-amber-100 ml-0.5 leading-none">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className={density === "compact" ? "space-y-1.5" : "space-y-3"}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} density={density} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 p-4 bg-red-500/8 border border-red-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300 font-medium">Feed unavailable</p>
              <p className="text-xs text-red-400/70 mt-0.5">Check that the API server is running.</p>
            </div>
          </div>
        )}

        {/* Results */}
        {data && !isLoading && (
          <>
            {/* Summary row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] text-white/35">
                {data.totalArticles} articles
                {directItems.length > 0 && (
                  <> · <span className="text-emerald-400/60">{directItems.length} direct</span></>
                )}
                {contextualItems.length > 0 && (
                  <> · <span className="text-sky-400/60">{contextualItems.length} contextual</span></>
                )}
                {data.topicsSearched.length > 0 && <> · {data.topicsSearched.length} topics</>}
                {hideRead && hiddenReadCount > 0 && (
                  <> · <span className="text-amber-400/70">{hiddenReadCount} read hidden</span></>
                )}
              </span>
              {data.feedQuality && (
                <FeedQualityBar fq={data.feedQuality} filtered={data.filteredArticles ?? 0} />
              )}
            </div>

            {/* Narrative Clusters */}
            {narrativeClusters.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[10px] font-semibold text-sky-400/60 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers className="w-3 h-3" />
                    Narrative Clusters
                  </p>
                  <button onClick={() => setShowClusters((v) => !v)}
                    className="text-[10px] text-white/25 hover:text-white/45 transition-colors">
                    {showClusters ? "Hide" : "Show"}
                  </button>
                </div>
                {showClusters && (
                  <div className="space-y-2.5">
                    {narrativeClusters.slice(0, 5).map((c) => (
                      <NarrativeClusterCard key={c.id} cluster={c} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Direct matches */}
            {matchedItems.length > 0 && (
              <section>
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">
                  Matched your interests
                </p>
                <div className={density === "compact" ? "space-y-1.5" : "space-y-3"}>
                  {matchedItems.map((item) => (
                    <FeedCard key={item.url} item={item} density={density}
                      markRead={markRead} isRead={readUrls.has(item.url)} interests={interests} />
                  ))}
                </div>
              </section>
            )}

            {/* Other items */}
            {otherItems.length > 0 && (
              <section>
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">
                  {matchedItems.length > 0 ? "Other stories" : "All stories"}
                </p>
                <div className={density === "compact" ? "space-y-1.5" : "space-y-3"}>
                  {otherItems.map((item) => (
                    <FeedCard key={item.url} item={item} density={density}
                      markRead={markRead} isRead={readUrls.has(item.url)} interests={interests} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {data.totalArticles === 0 && (
              <div className="text-center py-20">
                <Newspaper className="w-8 h-8 mx-auto mb-3 text-white/15" />
                <p className="text-sm text-white/30">No articles found.</p>
                <p className="text-xs text-white/20 mt-1">Try refreshing or adjusting your interests.</p>
              </div>
            )}

            {/* Debug link */}
            <div className="pt-2 border-t border-white/5 flex items-center gap-3">
              <Link href="/debug/relevance">
                <span className="text-[10px] text-white/20 hover:text-white/40 transition-colors cursor-pointer">
                  Relevance Inspector →
                </span>
              </Link>
              <Link href="/admin/feed-quality">
                <span className="text-[10px] text-white/20 hover:text-white/40 transition-colors cursor-pointer">
                  Feed Quality →
                </span>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

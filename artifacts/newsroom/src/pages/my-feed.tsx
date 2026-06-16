// ============================================================
// MY FEED — Sprint 7 redesign
// Bloomberg/FT minimal intelligence aesthetic
// Tasks: B (images), C (card redesign), D (trust indicators),
//        E (compact/detailed), F (reading progress), H (source identity)
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInterests } from "@/lib/interestProfile";
import { getSourceBrand } from "@/lib/sourceBranding";
import { useReadingProgress } from "@/lib/readingProgress";
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
  matchedInterests: string[];
  matchedWatchlist: string[];
  selectionReason: string;
  recencyLabel?: string;
  sourceTier?: string;
  imageUrl?: string | null;
}

interface FeedResponse {
  items: FeedItem[];
  totalArticles: number;
  topicsSearched: string[];
  interestsApplied: string[];
  watchlistApplied: string[];
  generatedAt: string;
}

type Density = "compact" | "detailed";

// ── Helpers ───────────────────────────────────────────────────

const TOPIC_LABELS: Record<string, string> = {
  ai: "AI",
  technology: "Tech",
  stocks: "Markets",
  economy: "Economy",
  politics: "Politics",
};

function readingTime(text: string | null | undefined): string | null {
  if (!text) return null;
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min`;
}

function formatAge(pubDate: string | null): string {
  if (!pubDate) return "";
  try {
    return formatDistanceToNow(new Date(pubDate), { addSuffix: true });
  } catch {
    return format(new Date(pubDate), "MMM d, HH:mm");
  }
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

function TopicTag({ topicId }: { topicId: string }) {
  const label = TOPIC_LABELS[topicId] ?? topicId;
  return (
    <span className="text-[9px] font-medium text-white/40 border border-white/10 px-1.5 py-0.5 rounded leading-none">
      {label}
    </span>
  );
}

// ── Thumbnail (Tasks B, I, J) ─────────────────────────────────

function ArticleThumbnail({ imageUrl, title }: { imageUrl: string | null | undefined; title: string }) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) return null;

  return (
    <div className="flex-shrink-0 w-20 h-14 rounded overflow-hidden bg-white/5">
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// ── FeedCard (Tasks C, D, E, F, H) ───────────────────────────

function FeedCard({
  item,
  density,
  markRead,
  isRead,
}: {
  item: FeedItem;
  density: Density;
  markRead: (url: string) => void;
  isRead: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver — mark as read when 50% visible (Task F)
  useEffect(() => {
    const el = cardRef.current;
    if (!el || isRead) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          markRead(item.url);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [item.url, isRead, markRead]);

  const rt = readingTime(item.description);

  if (density === "compact") {
    return (
      <div
        ref={cardRef}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors cursor-default ${
          isRead
            ? "border-white/5 hover:border-white/8 bg-white/[0.02]"
            : "border-white/8 hover:border-white/15 bg-white/[0.03] hover:bg-white/[0.05]"
        }`}
      >
        <SourceAvatar source={item.source} />
        <div className="flex-1 min-w-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block text-[13px] font-medium leading-snug truncate transition-colors hover:text-white ${
              isRead ? "text-white/50" : "text-white/90"
            }`}
          >
            {item.title}
          </a>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RecencyBadge label={item.recencyLabel} />
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
    <div
      ref={cardRef}
      className={`rounded-lg border p-4 transition-colors group ${
        isRead
          ? "border-white/5 hover:border-white/10 bg-white/[0.02]"
          : "border-white/8 hover:border-white/15 bg-white/[0.03] hover:bg-white/[0.05]"
      }`}
    >
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
      </div>

      {/* Title + image */}
      <div className="flex items-start gap-3 mb-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-1 text-[13px] font-semibold leading-snug transition-colors hover:text-white line-clamp-2 ${
            isRead ? "text-white/55" : "text-white/90"
          }`}
        >
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
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
        >
          Read
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ── Feed section skeleton ─────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────

export default function MyFeedPage() {
  const interests = getInterests();

  const [density, setDensity] = useState<Density>(() => {
    try {
      const stored = localStorage.getItem(DENSITY_KEY);
      return stored === "compact" || stored === "detailed" ? stored : "detailed";
    } catch {
      return "detailed";
    }
  });

  const [watchlistInput, setWatchlistInput] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const handleDensityToggle = useCallback((next: Density) => {
    setDensity(next);
    try { localStorage.setItem(DENSITY_KEY, next); } catch { /* ignore */ }
  }, []);

  const { data, isLoading, error, refetch, isFetching } = useQuery<FeedResponse>({
    queryKey: ["my-feed", interests, watchlist],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/feed/personal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests, watchlist }),
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

  const matchedItems = data?.items.filter((i) => i.relevanceScore > 0) ?? [];
  const otherItems = data?.items.filter((i) => i.relevanceScore === 0) ?? [];

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
                <>
                  <span>·</span>
                  <span>{readCount} of {allUrls.length} read</span>
                </>
              )}
              {data && (
                <>
                  <span>·</span>
                  <span>{format(new Date(data.generatedAt), "HH:mm")}</span>
                </>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            {/* Density toggle */}
            <div className="flex rounded-md border border-white/10 overflow-hidden">
              <button
                onClick={() => handleDensityToggle("compact")}
                className={`p-1.5 transition-colors ${density === "compact" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"}`}
                title="Compact view"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDensityToggle("detailed")}
                className={`p-1.5 transition-colors ${density === "detailed" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"}`}
                title="Detailed view"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-white/50 hover:text-white px-2"
              title="Refresh"
            >
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
            <input
              type="text"
              value={watchlistInput}
              onChange={(e) => setWatchlistInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddWatchlist()}
              placeholder="Track a keyword or company…"
              className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
            />
            <Button
              size="sm"
              onClick={handleAddWatchlist}
              disabled={!watchlistInput.trim()}
              variant="outline"
              className="border-white/15 text-white/70 hover:text-white hover:bg-white/8 px-3 text-xs"
            >
              Add
            </Button>
          </div>

          {watchlist.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {watchlist.map((term) => (
                <span
                  key={term}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full"
                >
                  {term}
                  <button
                    onClick={() => setWatchlist((v) => v.filter((t) => t !== term))}
                    className="hover:text-amber-100 ml-0.5 leading-none"
                  >
                    ×
                  </button>
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
            <div className="flex items-center justify-between text-[11px] text-white/35">
              <span>
                {data.totalArticles} articles
                {matchedItems.length > 0 && (
                  <> · <span className="text-white/55">{matchedItems.length} matched</span></>
                )}
                {data.topicsSearched.length > 0 && (
                  <> · {data.topicsSearched.length} topics</>
                )}
              </span>
            </div>

            {/* Matched items */}
            {matchedItems.length > 0 && (
              <section>
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">
                  Matched your interests
                </p>
                <div className={density === "compact" ? "space-y-1.5" : "space-y-3"}>
                  {matchedItems.map((item) => (
                    <FeedCard
                      key={item.url}
                      item={item}
                      density={density}
                      markRead={markRead}
                      isRead={readUrls.has(item.url)}
                    />
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
                    <FeedCard
                      key={item.url}
                      item={item}
                      density={density}
                      markRead={markRead}
                      isRead={readUrls.has(item.url)}
                    />
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
          </>
        )}
      </main>
    </div>
  );
}

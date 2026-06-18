// ============================================================
// MY FEED — Sprint 30: Trend-First Feed Revolution
//
// INFOX is NOT an article feed.
// INFOX IS a personalized trend intelligence feed.
//
// Cards show TRENDS as primary objects.
// Articles are supporting evidence inside each trend card.
//
// Layout: TikTok-style — focused, mobile-first, momentum-driven.
// ============================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Settings,
  TrendingUp,
  Plus,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import {
  getInterests,
  addInterest,
  removeInterest,
  hasInterest,
  PRESET_INTERESTS,
} from "@/lib/interestProfile";
import { formatDistanceToNow } from "date-fns";
import { BottomNav } from "@/components/BottomNav";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const SAVED_KEY = "ai-newsroom:saved-articles";

// ── Types ─────────────────────────────────────────────────────

type MomentumLabel = "exploding" | "rising" | "stable" | "fading";

interface TrendMomentum {
  label: MomentumLabel;
  score: number;
  platforms: string[];
  regions: string[];
  discussionCount: number;
  whyTrending: string;
}

interface SupportingArticle {
  title: string;
  url: string;
  source: string | null;
  pubDate: string | null;
  description: string | null;
  imageUrl: string | null;
  sourceTier: string;
}

interface TrendFeedCard {
  id: string;
  type: "trend" | "discovery" | "article";
  trendTitle: string;
  trendHook: string;
  trendKeyword: string;
  momentum: TrendMomentum;
  topicId: string;
  personalScore: number;
  articles: SupportingArticle[];
  articleCount: number;
  discoveryEntity?: string;
  discoveryReason?: string;
  adjacentTo?: string[];
}

interface FeedResponse {
  cards: TrendFeedCard[];
  stats: {
    totalArticles: number;
    activeTrends: number;
    trendCards: number;
    articleCards: number;
    discoveryCards: number;
    totalCards: number;
    processingTimeMs: number;
  };
  generatedAt: string;
}

// ── Momentum display config ───────────────────────────────────

const MOMENTUM_CONFIG: Record<MomentumLabel, {
  emoji: string;
  label: string;
  barColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  exploding: {
    emoji: "🔥",
    label: "Exploding",
    barColor: "from-orange-500 via-red-500 to-rose-500",
    textColor: "text-orange-400",
    bgColor: "bg-orange-500/8",
    borderColor: "border-orange-500/20",
  },
  rising: {
    emoji: "📈",
    label: "Rising",
    barColor: "from-emerald-500 to-teal-400",
    textColor: "text-emerald-400",
    bgColor: "bg-emerald-500/8",
    borderColor: "border-emerald-500/20",
  },
  stable: {
    emoji: "➡️",
    label: "Stable",
    barColor: "from-white/25 to-white/15",
    textColor: "text-white/40",
    bgColor: "bg-white/[0.03]",
    borderColor: "border-white/8",
  },
  fading: {
    emoji: "📉",
    label: "Fading",
    barColor: "from-white/15 to-white/5",
    textColor: "text-white/25",
    bgColor: "bg-white/[0.02]",
    borderColor: "border-white/5",
  },
};

const PLATFORM_LABELS: Record<string, string> = {
  reddit: "Reddit",
  googlenews: "Google News",
  "google-trends": "Google Trends",
  youtube: "YouTube",
  twitter: "Twitter/X",
  tiktok: "TikTok",
  github: "GitHub",
};

// ── Saved state helpers ────────────────────────────────────────

function getSavedUrls(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]")); }
  catch { return new Set(); }
}

function toggleSaved(url: string): boolean {
  const saved = getSavedUrls();
  if (saved.has(url)) { saved.delete(url); } else { saved.add(url); }
  try { localStorage.setItem(SAVED_KEY, JSON.stringify([...saved])); } catch { /**/ }
  return saved.has(url);
}

function formatAge(pub: string | null): string {
  if (!pub) return "";
  try { return formatDistanceToNow(new Date(pub), { addSuffix: true }); }
  catch { return ""; }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

// ── Skeleton card ─────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-2 w-14 rounded-full bg-white/10" />
        <div className="h-2 w-24 rounded-full bg-white/15" />
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full w-3/5 rounded-full bg-white/15" />
      </div>
      <div className="h-6 w-4/5 rounded-lg bg-white/12" />
      <div className="h-4 w-3/5 rounded-lg bg-white/8" />
      <div className="h-px bg-white/5 my-2" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-white/8" />
        <div className="h-3 w-4/5 rounded bg-white/6" />
      </div>
    </div>
  );
}

// ── Supporting articles list ──────────────────────────────────

function ArticleList({ articles, defaultExpanded = false }: {
  articles: SupportingArticle[];
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const preview = articles.slice(0, expanded ? articles.length : 3);

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/60 transition-colors mb-2"
      >
        <span>Supporting evidence ({articles.length})</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <div className="space-y-1.5">
        {preview.map((a) => (
          <a
            key={a.url}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 group"
          >
            <span className="flex-shrink-0 mt-1 w-1 h-1 rounded-full bg-white/20 group-hover:bg-white/50 transition-colors" />
            <div className="min-w-0">
              <p className="text-[12px] text-white/60 group-hover:text-white/85 transition-colors leading-snug line-clamp-2">
                {a.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {a.source && (
                  <span className="text-[10px] text-white/30">{a.source}</span>
                )}
                {a.sourceTier === "A" && (
                  <span className="text-[9px] text-amber-400/70 border border-amber-400/25 px-1 py-0.5 rounded leading-none">A</span>
                )}
                {a.pubDate && (
                  <span className="text-[10px] text-white/20">{formatAge(a.pubDate)}</span>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Action bar ────────────────────────────────────────────────

function ActionBar({ card, topUrl }: { card: TrendFeedCard; topUrl: string }) {
  const [liked, setLiked] = useState<"like" | "dislike" | null>(null);
  const [saved, setSaved] = useState(() => getSavedUrls().has(topUrl));
  const [busy, setBusy] = useState(false);

  async function sendFeedback(type: "more_like_this" | "less_like_this") {
    if (busy || liked !== null) return;
    setBusy(true);
    setLiked(type === "more_like_this" ? "like" : "dislike");
    try {
      await fetch(`${BASE}/api/adaptive/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleUrl: topUrl,
          articleTitle: card.trendTitle,
          type,
          topicId: card.topicId,
        }),
      });
    } catch { /**/ } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center border-t border-white/[0.06] mt-4 pt-3 gap-1">
      <button
        onClick={() => sendFeedback("more_like_this")}
        disabled={busy || liked !== null}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
          liked === "like"
            ? "bg-emerald-500/20 text-emerald-400"
            : "text-white/35 hover:text-emerald-400 hover:bg-emerald-400/10"
        }`}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        Like
      </button>

      <button
        onClick={() => sendFeedback("less_like_this")}
        disabled={busy || liked !== null}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
          liked === "dislike"
            ? "bg-rose-500/20 text-rose-400"
            : "text-white/35 hover:text-rose-400 hover:bg-rose-400/10"
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        Pass
      </button>

      <button
        onClick={() => setSaved(toggleSaved(topUrl))}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
          saved
            ? "bg-sky-500/20 text-sky-400"
            : "text-white/35 hover:text-sky-400 hover:bg-sky-400/10"
        }`}
      >
        <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
        {saved ? "Saved" : "Save"}
      </button>

      <a
        href={topUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-medium text-white/35 hover:text-white/70 hover:bg-white/5 transition-all"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Open
      </a>
    </div>
  );
}

// ── Trend card ────────────────────────────────────────────────

function TrendCard({ card }: { card: TrendFeedCard }) {
  const cfg = MOMENTUM_CONFIG[card.momentum.label];
  const barWidth = Math.max(4, card.momentum.score);
  const topUrl = card.articles[0]?.url ?? "#";

  const platforms = card.momentum.platforms
    .map((p) => PLATFORM_LABELS[p] ?? p)
    .slice(0, 3)
    .join(" · ");

  const discussionStr = card.momentum.discussionCount > 0
    ? `${formatCount(card.momentum.discussionCount)} discussing`
    : null;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${cfg.borderColor} ${cfg.bgColor}`}>
      <div className="p-5">

        {/* Momentum bar + label */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${cfg.barColor} transition-all duration-700`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <span className={`text-[11px] font-bold tracking-wide flex-shrink-0 ${cfg.textColor}`}>
            {cfg.emoji} {cfg.label}
          </span>
        </div>

        {/* Trend title — the primary object */}
        <h2 className="text-[22px] font-bold leading-tight text-white/95 mb-2">
          {card.trendTitle}
        </h2>

        {/* Thai hook phrase */}
        {card.trendHook && (
          <p className="text-[13px] text-white/50 italic leading-snug mb-3">
            {card.trendHook}
          </p>
        )}

        {/* Platform spread + discussion count */}
        {(platforms || discussionStr) && (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {platforms && (
              <span className="text-[11px] text-white/35 font-medium">{platforms}</span>
            )}
            {platforms && discussionStr && (
              <span className="text-white/15">·</span>
            )}
            {discussionStr && (
              <span className="text-[11px] text-white/25">{discussionStr}</span>
            )}
          </div>
        )}

        {/* Why trending */}
        {card.momentum.whyTrending && (
          <p className="text-[11px] text-white/30 mb-4">{card.momentum.whyTrending}</p>
        )}

        {/* Supporting articles */}
        {card.articles.length > 0 && (
          <ArticleList articles={card.articles} />
        )}

        {/* Actions */}
        <ActionBar card={card} topUrl={topUrl} />
      </div>
    </div>
  );
}

// ── Discovery card ────────────────────────────────────────────

function DiscoveryCard({ card }: { card: TrendFeedCard }) {
  const platforms = card.momentum.platforms
    .map((p) => PLATFORM_LABELS[p] ?? p)
    .slice(0, 2)
    .join(" · ");

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-violet-500/6 overflow-hidden">
      <div className="p-5">
        {/* Discovery header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-violet-400/70" />
          <span className="text-[11px] font-semibold text-violet-400/80 tracking-wide uppercase">
            For You — Discovery
          </span>
        </div>

        {/* Adjacent-to context */}
        {card.adjacentTo && card.adjacentTo.length > 0 && (
          <p className="text-[11px] text-white/40 italic mb-2">
            Related to {card.adjacentTo.join(", ")} you follow
          </p>
        )}

        {/* Entity name — large */}
        <h2 className="text-[26px] font-black leading-tight text-white/90 mb-2">
          {card.trendTitle}
        </h2>

        {/* Discovery reason */}
        {card.discoveryReason && (
          <p className="text-[12px] text-violet-300/60 mb-3">{card.discoveryReason}</p>
        )}

        {/* Platform signal */}
        {platforms && (
          <div className="flex items-center gap-1.5 mb-4">
            <TrendingUp className="w-3 h-3 text-violet-400/50" />
            <span className="text-[11px] text-white/30">{platforms}</span>
          </div>
        )}

        {/* Supporting trend items */}
        {card.articles.length > 0 && (
          <div className="space-y-1.5">
            {card.articles.slice(0, 3).map((a) => (
              a.url ? (
                <a
                  key={a.url}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 group"
                >
                  <span className="flex-shrink-0 mt-1 w-1 h-1 rounded-full bg-violet-400/30 group-hover:bg-violet-400/60 transition-colors" />
                  <p className="text-[12px] text-white/50 group-hover:text-white/75 transition-colors line-clamp-2 leading-snug">
                    {a.title}
                    {a.source && <span className="text-white/25 ml-1">— {a.source}</span>}
                  </p>
                </a>
              ) : null
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Article card (fallback) ───────────────────────────────────

function ArticleCard({ card }: { card: TrendFeedCard }) {
  const cfg = MOMENTUM_CONFIG[card.momentum.label];
  const article = card.articles[0];
  if (!article) return null;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-semibold ${cfg.textColor}`}>
            {cfg.emoji} {cfg.label}
          </span>
          {article.source && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-[10px] text-white/35">{article.source}</span>
            </>
          )}
          {article.pubDate && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-[10px] text-white/25">{formatAge(article.pubDate)}</span>
            </>
          )}
        </div>
        <h3 className="text-[16px] font-semibold text-white/85 leading-snug mb-2">
          {article.title}
        </h3>
        {article.description && (
          <p className="text-[12px] text-white/40 line-clamp-2 leading-relaxed mb-4">
            {article.description}
          </p>
        )}
        <ActionBar card={card} topUrl={article.url} />
      </div>
    </div>
  );
}

// ── Watchlist bar ─────────────────────────────────────────────

function WatchlistBar({
  value,
  onChange,
  onAdd,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex gap-2 px-4 pt-3 pb-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
        placeholder="Track a keyword or company..."
        className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-[13px] text-white/80 placeholder-white/25 outline-none focus:border-white/25 transition-colors"
      />
      <button
        onClick={onAdd}
        className="px-4 py-2.5 bg-white/8 border border-white/10 rounded-xl text-[13px] font-medium text-white/60 hover:bg-white/12 hover:text-white/80 transition-all"
      >
        Add
      </button>
    </div>
  );
}

// ── Feed stats bar ────────────────────────────────────────────

function FeedStatsBar({ stats }: { stats: FeedResponse["stats"] | undefined }) {
  if (!stats) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2 text-[11px] text-white/25">
      {stats.trendCards > 0 && (
        <span>🔥 {stats.trendCards} trends</span>
      )}
      {stats.activeTrends > 0 && (
        <span>{stats.activeTrends} live signals</span>
      )}
      {stats.discoveryCards > 0 && (
        <span>✦ {stats.discoveryCards} discovery</span>
      )}
    </div>
  );
}

// ── Inline Interest Filter ────────────────────────────────────

function InterestFilterBar({
  activeInterests,
  onToggle,
  onClearAll,
}: {
  activeInterests: string[];
  onToggle: (interest: string) => void;
  onClearAll: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? PRESET_INTERESTS : PRESET_INTERESTS;

  return (
    <div className="border-b border-white/[0.06] bg-black/60 backdrop-blur-sm">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-white/40" />
          <span className="text-[11px] font-semibold text-white/40 tracking-wide uppercase">
            สิ่งที่สนใจ
          </span>
          {activeInterests.length > 0 && (
            <button
              onClick={onClearAll}
              className="ml-auto text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              ล้างทั้งหมด
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_INTERESTS.map((interest) => {
            const active = activeInterests.includes(interest);
            return (
              <button
                key={interest}
                onClick={() => onToggle(interest)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  active
                    ? "bg-purple-500/25 text-purple-300 border border-purple-500/40"
                    : "bg-white/5 text-white/45 border border-white/10 hover:bg-white/10 hover:text-white/70"
                }`}
              >
                {active && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                {interest}
              </button>
            );
          })}
        </div>
        {activeInterests.length === 0 && (
          <p className="text-[10px] text-white/20 mt-2">
            เลือกหัวข้อเพื่อให้ฟีดแสดงข่าวที่ตรงกับความสนใจ
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function MyFeedPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [interests, setInterests] = useState<string[]>(() => getInterests());
  const [watchlistInput, setWatchlistInput] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [showInterestFilter, setShowInterestFilter] = useState(false);

  // ── Sync interests from localStorage when page gains focus
  // or when another tab/page changes localStorage (settings page)
  useEffect(() => {
    function syncInterests() {
      const fresh = getInterests();
      setInterests((prev) => {
        const same =
          prev.length === fresh.length &&
          prev.every((x, i) => x === fresh[i]);
        return same ? prev : fresh;
      });
    }

    // Re-sync when user navigates back (page visibility change)
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncInterests();
    };
    // Re-sync when localStorage changes from another tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ai-newsroom:interest-profile") syncInterests();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    // Also sync on mount in case navigating back in SPA
    syncInterests();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // ── Invalidate query when interests change so feed refreshes
  const prevInterestsRef = useRef<string[]>(interests);
  useEffect(() => {
    const prev = prevInterestsRef.current;
    const changed =
      prev.length !== interests.length ||
      prev.some((x, i) => x !== interests[i]);
    if (changed) {
      prevInterestsRef.current = interests;
      queryClient.invalidateQueries({ queryKey: ["trend-feed"] });
    }
  }, [interests, queryClient]);

  // ── Toggle interest directly from feed page ──────────────────
  const toggleInterest = useCallback((interest: string) => {
    if (hasInterest(interest)) {
      removeInterest(interest);
      setInterests((prev) => prev.filter((i) => i !== interest));
    } else {
      addInterest(interest);
      setInterests((prev) => [...prev, interest]);
    }
  }, []);

  const clearAllInterests = useCallback(() => {
    for (const i of getInterests()) removeInterest(i);
    setInterests([]);
  }, []);

  const addWatchlistItem = useCallback(() => {
    const trimmed = watchlistInput.trim();
    if (!trimmed || watchlist.includes(trimmed)) {
      setWatchlistInput("");
      return;
    }
    setWatchlist((prev) => [...prev, trimmed]);
    setWatchlistInput("");
  }, [watchlistInput, watchlist]);

  // ── Feed query ──────────────────────────────────────────────

  const {
    data,
    isFetching,
    isError,
    refetch,
    dataUpdatedAt,
  } = useQuery<FeedResponse>({
    queryKey: ["trend-feed", interests, watchlist],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/feed/trend-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests, watchlist }),
      });
      if (!res.ok) throw new Error(`Feed error ${res.status}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  const cards = data?.cards ?? [];

  // ── Countdown to next refresh ───────────────────────────────
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      if (!dataUpdatedAt || isFetching) { setCountdown(""); return; }
      const nextMs = dataUpdatedAt + 15 * 60 * 1000;
      const diffMs = nextMs - Date.now();
      if (diffMs <= 0) { setCountdown(""); return; }
      const mins = Math.floor(diffMs / 60_000);
      const secs = Math.floor((diffMs % 60_000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt, isFetching]);

  // ── Topics label ─────────────────────────────────────────────
  const topicsLabel = useMemo(() => {
    if (interests.length === 0) return "All topics";
    if (interests.length <= 3) return interests.join(", ");
    return `${interests.slice(0, 2).join(", ")} +${interests.length - 2}`;
  }, [interests]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-black tracking-tight text-white/90">
              INFOX
            </span>
            <span className="text-[11px] text-white/35 mt-0.5">
              {topicsLabel}
            </span>
            {isFetching && (
              <span className="text-[11px] text-white/25 animate-pulse">· Refreshing...</span>
            )}
            {!isFetching && countdown && (
              <span className="text-[10px] text-white/20">· {countdown}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInterestFilter((v) => !v)}
              className={`p-2 rounded-xl transition-all ${
                showInterestFilter
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
              aria-label="Toggle interest filter"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {interests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-500" />
              )}
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-all disabled:opacity-40"
              aria-label="Refresh feed"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <Link href="/settings">
              <button className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                <Settings className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* ── Interest filter bar (collapsible) ── */}
        {showInterestFilter && (
          <InterestFilterBar
            activeInterests={interests}
            onToggle={toggleInterest}
            onClearAll={clearAllInterests}
          />
        )}
      </header>

      {/* ── Watchlist bar ──────────────────────────────────────── */}
      <WatchlistBar
        value={watchlistInput}
        onChange={setWatchlistInput}
        onAdd={addWatchlistItem}
      />

      {/* ── Watchlist chips ────────────────────────────────────── */}
      {watchlist.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-2 pb-1">
          {watchlist.map((term) => (
            <button
              key={term}
              onClick={() => setWatchlist((prev) => prev.filter((t) => t !== term))}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 border border-sky-500/25 rounded-full text-[11px] text-sky-400 hover:bg-rose-500/10 hover:border-rose-500/25 hover:text-rose-400 transition-all"
            >
              {term}
              <span className="text-[10px]">×</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Feed stats ─────────────────────────────────────────── */}
      <FeedStatsBar stats={data?.stats} />

      {/* ── Feed cards ─────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto px-4 pb-28 space-y-3">
        {isFetching && cards.length === 0 && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {isError && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
            <p className="text-[13px] text-rose-400 mb-3">ไม่สามารถโหลดฟีดได้</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[12px] text-rose-400 hover:bg-rose-500/20 transition-all"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {!isError && !isFetching && cards.length === 0 && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center">
            <p className="text-[14px] text-white/40 mb-2">ไม่พบเนื้อหา</p>
            <p className="text-[12px] text-white/25">
              เลือกสิ่งที่สนใจด้านบนหรือเพิ่ม keyword ใน Watchlist
            </p>
          </div>
        )}

        {cards.map((card) => {
          if (card.type === "discovery") return <DiscoveryCard key={card.id} card={card} />;
          if (card.type === "article") return <ArticleCard key={card.id} card={card} />;
          return <TrendCard key={card.id} card={card} />;
        })}
      </main>

      <BottomNav />
    </div>
  );
}

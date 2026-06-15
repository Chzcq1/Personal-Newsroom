import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  RefreshCw,
  Newspaper,
  ExternalLink,
  Clock,
  Sparkles,
  Tag,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getInterests } from "@/lib/interestProfile";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
}

interface FeedResponse {
  items: FeedItem[];
  totalArticles: number;
  topicsSearched: string[];
  interestsApplied: string[];
  watchlistApplied: string[];
  generatedAt: string;
}

const TOPIC_LABELS: Record<string, string> = {
  ai: "AI",
  technology: "Tech",
  stocks: "Markets",
  economy: "Economy",
  politics: "Politics",
};

const TOPIC_COLORS: Record<string, string> = {
  ai: "bg-violet-100 text-violet-700",
  technology: "bg-blue-100 text-blue-700",
  stocks: "bg-green-100 text-green-700",
  economy: "bg-amber-100 text-amber-700",
  politics: "bg-red-100 text-red-700",
};

function RelevanceBadge({ score }: { score: number }) {
  if (score === 0) return null;
  const label = score >= 60 ? "High match" : score >= 30 ? "Match" : "Weak match";
  const cls =
    score >= 60
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : score >= 30
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>
      <Sparkles className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const topicLabel = TOPIC_LABELS[item.topicId] ?? item.topicId;
  const topicColor = TOPIC_COLORS[item.topicId] ?? "bg-slate-100 text-slate-600";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${topicColor}`}>
                {topicLabel}
              </span>
              <RelevanceBadge score={item.relevanceScore} />
              {item.matchedInterests.map((interest) => (
                <span
                  key={interest}
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {interest}
                </span>
              ))}
              {item.matchedWatchlist.map((term) => (
                <span
                  key={term}
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700"
                >
                  <BookOpen className="w-2.5 h-2.5" />
                  {term}
                </span>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-slate-800 leading-snug mb-1">
              {item.title}
            </h3>

            {item.description && (
              <div className="text-xs text-slate-500 leading-relaxed">
                {expanded
                  ? item.description
                  : item.description.length > 140
                  ? item.description.slice(0, 140) + "…"
                  : item.description}
                {item.description.length > 140 && (
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="ml-1 text-blue-500 hover:text-blue-600 font-medium"
                  >
                    {expanded ? "Less" : "More"}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                {item.source && <span className="font-medium text-slate-500">{item.source}</span>}
                {item.pubDate && (
                  <>
                    <span>·</span>
                    <Clock className="w-3 h-3" />
                    <span>{format(new Date(item.pubDate), "MMM d, HH:mm")}</span>
                  </>
                )}
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 font-medium"
              >
                Read
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {item.selectionReason && (
              <p className="mt-1.5 text-[10px] text-slate-400 italic">{item.selectionReason}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyFeedPage() {
  const interests = getInterests();
  const [watchlistInput, setWatchlistInput] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);

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

  const handleAddWatchlist = () => {
    const term = watchlistInput.trim();
    if (term && !watchlist.includes(term)) {
      setWatchlist((v) => [...v, term]);
      setWatchlistInput("");
    }
  };

  const matchedItems = data?.items.filter((i) => i.relevanceScore > 0) ?? [];
  const otherItems = data?.items.filter((i) => i.relevanceScore === 0) ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-slate-800">My Feed</h1>
              <p className="text-xs text-slate-400">
                {interests.length > 0
                  ? `${interests.length} interest${interests.length !== 1 ? "s" : ""} active`
                  : "All topics · Set interests in Settings"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* Interests summary */}
        {interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {interests.map((i) => (
              <span
                key={i}
                className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-700 rounded-full"
              >
                {i}
              </span>
            ))}
            <Link href="/settings/interests">
              <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded-full cursor-pointer hover:bg-slate-200">
                Edit interests →
              </span>
            </Link>
          </div>
        )}

        {interests.length === 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">No interests set</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Showing all topics. Set interests in{" "}
                <Link href="/settings/interests">
                  <span className="underline cursor-pointer">Settings → Interests</span>
                </Link>{" "}
                to personalise this feed.
              </p>
            </div>
          </div>
        )}

        {/* Watchlist input */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs font-semibold text-slate-600 mb-2">Watchlist — track any keyword or company</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={watchlistInput}
              onChange={(e) => setWatchlistInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddWatchlist()}
              placeholder="e.g. Apple, Fed, climate"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button size="sm" onClick={handleAddWatchlist} disabled={!watchlistInput.trim()}>
              Add
            </Button>
          </div>
          {watchlist.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {watchlist.map((term) => (
                <span
                  key={term}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full"
                >
                  {term}
                  <button
                    onClick={() => setWatchlist((v) => v.filter((t) => t !== term))}
                    className="ml-0.5 hover:text-orange-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16 text-slate-400 text-sm">Loading your feed...</div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Failed to load feed. Is the API server running?
          </div>
        )}

        {/* Results */}
        {data && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {data.totalArticles} articles from {data.topicsSearched.length} topic
                {data.topicsSearched.length !== 1 ? "s" : ""}
                {matchedItems.length > 0 && (
                  <> · <span className="text-purple-600 font-medium">{matchedItems.length} matched your interests</span></>
                )}
              </p>
              <p className="text-xs text-slate-400">
                {format(new Date(data.generatedAt), "HH:mm")}
              </p>
            </div>

            {/* Matched items */}
            {matchedItems.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Matched your interests
                </h2>
                <div className="space-y-3">
                  {matchedItems.map((item) => (
                    <FeedCard key={item.url} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Other items */}
            {otherItems.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  {matchedItems.length > 0 ? "Other stories" : "All stories"}
                </h2>
                <div className="space-y-3">
                  {otherItems.map((item) => (
                    <FeedCard key={item.url} item={item} />
                  ))}
                </div>
              </section>
            )}

            {data.totalArticles === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Newspaper className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No articles found. Try refreshing in a moment.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

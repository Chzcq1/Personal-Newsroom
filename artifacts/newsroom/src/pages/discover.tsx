import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Compass, TrendingUp, Plus, Check, Cpu, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { getOrCreateProfile } from "@/lib/userIdentity";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

interface DiscoverItem {
  id: string;
  label: string;
  type: string;
  tags: string[];
  trend?: string;
}

const TYPE_COLORS: Record<string, string> = {
  topic: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  company: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  crypto: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  person: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const FILTER_TYPES = ["all", "topic", "company", "crypto", "person"];

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [results, setResults] = useState<DiscoverItem[]>([]);
  const [trending, setTrending] = useState<DiscoverItem[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const profileId = getOrCreateProfile().profileId;

  // Load trending on mount + load existing interests
  useEffect(() => {
    fetch(`${BASE}/api/discover/trending`)
      .then((r) => r.json())
      .then((d) => setTrending(d.trending ?? []))
      .catch(() => {});

    fetch(`${BASE}/api/interests/${profileId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.interests) {
          setFollowed(new Set(d.interests.map((i: { interestLabel: string }) => i.interestLabel)));
        }
      })
      .catch(() => {});
  }, [profileId]);

  const search = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ q: query, type: filterType });
    fetch(`${BASE}/api/discover/search?${params}`)
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [query, filterType]);

  useEffect(() => {
    search();
  }, [filterType]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    search();
  }

  async function toggleFollow(item: DiscoverItem) {
    const isFollowing = followed.has(item.label);
    const action = isFollowing ? "unfollow" : "follow";

    try {
      await fetch(`${BASE}/api/interests/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, topicLabel: item.label, action }),
      });
      setFollowed((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.delete(item.label);
        else next.add(item.label);
        return next;
      });
    } catch {
      // silently ignore
    }
  }

  const displayItems = query || filterType !== "all" ? results : [];
  const showTrending = !query && filterType === "all";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/95 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Compass className="w-5 h-5 text-primary shrink-0" />
          <h1 className="text-base font-semibold text-foreground">Discover</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-5">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics, companies, crypto…"
              className="pl-9 bg-muted/30 border-border/60"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button type="submit" size="sm" disabled={loading}>Search</Button>
        </form>

        {/* Type filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors",
                filterType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Trending */}
        <AnimatePresence mode="wait">
          {showTrending && trending.length > 0 && (
            <motion.section
              key="trending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-foreground">Trending Now</h2>
              </div>
              <div className="space-y-2">
                {trending.map((item) => (
                  <DiscoverCard
                    key={item.id}
                    item={item}
                    following={followed.has(item.label)}
                    onToggle={() => toggleFollow(item)}
                  />
                ))}
              </div>
            </motion.section>
          )}

          {/* Search results */}
          {!showTrending && (
            <motion.section
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <p className="text-xs text-muted-foreground">
                {loading ? "Searching…" : `${displayItems.length} results`}
              </p>
              <div className="space-y-2">
                {displayItems.map((item) => (
                  <DiscoverCard
                    key={item.id}
                    item={item}
                    following={followed.has(item.label)}
                    onToggle={() => toggleFollow(item)}
                  />
                ))}
                {!loading && displayItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No results for "{query}"
                  </p>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}

function DiscoverCard({
  item,
  following,
  onToggle,
}: {
  item: DiscoverItem;
  following: boolean;
  onToggle: () => void;
}) {
  const colorClass = TYPE_COLORS[item.type] ?? "bg-muted/30 text-muted-foreground border-border/30";

  return (
    <motion.div
      layout
      className="flex items-center justify-between px-4 py-3 rounded-xl border border-border/60 bg-card/50 hover:border-border/90 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
          <Cpu className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 border ${colorClass}`}
            >
              {item.type}
            </Badge>
            {item.trend && (
              <span className="text-[10px] text-amber-400">{item.trend}</span>
            )}
          </div>
        </div>
      </div>

      <Button
        variant={following ? "secondary" : "outline"}
        size="sm"
        onClick={onToggle}
        className={`h-8 text-xs gap-1.5 shrink-0 ml-3 ${following ? "text-primary" : ""}`}
      >
        {following ? (
          <><Check className="w-3 h-3" />Following</>
        ) : (
          <><Plus className="w-3 h-3" />Follow</>
        )}
      </Button>
    </motion.div>
  );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Plus,
  Trash2,
  TrendingUp,
  Bitcoin,
  Building2,
  User,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { getOrCreateProfile } from "@/lib/userIdentity";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

interface WatchlistItem {
  id: number;
  entityId: string;
  entityLabel: string;
  entityType: string;
  addedAt: string;
}

const QUICK_ADD = [
  { id: "crypto-btc", label: "Bitcoin (BTC)", type: "crypto" },
  { id: "crypto-eth", label: "Ethereum (ETH)", type: "crypto" },
  { id: "company-nvidia", label: "NVIDIA (NVDA)", type: "company" },
  { id: "company-tesla", label: "Tesla (TSLA)", type: "company" },
  { id: "company-apple", label: "Apple (AAPL)", type: "company" },
  { id: "ai", label: "AI & LLMs", type: "topic" },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  crypto: Bitcoin,
  company: Building2,
  person: User,
  topic: Hash,
  stock: TrendingUp,
};

function TypeIcon({ type, className = "w-4 h-4" }: { type: string; className?: string }) {
  const Icon = TYPE_ICONS[type] ?? Hash;
  return <Icon className={className} />;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState("general");
  const [adding, setAdding] = useState(false);
  const profileId = getOrCreateProfile().profileId;

  useEffect(() => {
    fetch(`${BASE}/api/watchlist/${profileId}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [profileId]);

  async function addItem(entityId: string, entityLabel: string, entityType: string) {
    try {
      const res = await fetch(`${BASE}/api/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, entityId, entityLabel, entityType }),
      });
      const data = await res.json();
      if (data.item) {
        setItems((prev) => {
          if (prev.find((i) => i.entityId === data.item.entityId)) return prev;
          return [data.item, ...prev];
        });
      }
    } catch {
      // silently ignore
    }
  }

  async function removeItem(item: WatchlistItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await fetch(`${BASE}/api/watchlist/${item.id}`, { method: "DELETE" }).catch(() => {});
  }

  async function handleCustomAdd() {
    if (!customLabel.trim()) return;
    setAdding(true);
    const id = customLabel.trim().toLowerCase().replace(/\s+/g, "-");
    await addItem(id, customLabel.trim(), customType);
    setCustomLabel("");
    setAdding(false);
  }

  const quickAddIds = new Set(items.map((i) => i.entityId));

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/95 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-400 shrink-0" />
          <h1 className="text-base font-semibold text-foreground">Watchlist</h1>
          {items.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{items.length} items</span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-6">
        {/* Quick add */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Add
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ADD.map((item) => {
              const added = quickAddIds.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => !added && addItem(item.id, item.label, item.type)}
                  disabled={added}
                  className={[
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors",
                    added
                      ? "border-primary/40 bg-primary/5 text-primary cursor-default"
                      : "border-border/60 hover:border-border bg-card/30 text-foreground",
                  ].join(" ")}
                >
                  <TypeIcon type={item.type} className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs font-medium">{item.label}</span>
                  {added && <span className="ml-auto text-[10px] text-primary">✓</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Custom add */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add Custom
          </h2>
          <div className="flex gap-2">
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. ARM Holdings, XRP, Grok…"
              className="flex-1 bg-muted/30 border-border/60"
              onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
            />
            <select
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              className="h-10 rounded-md border border-border/60 bg-muted/30 px-2 text-sm text-foreground"
            >
              <option value="general">General</option>
              <option value="company">Company</option>
              <option value="crypto">Crypto</option>
              <option value="person">Person</option>
              <option value="topic">Topic</option>
            </select>
            <Button
              onClick={handleCustomAdd}
              disabled={!customLabel.trim() || adding}
              size="icon"
              className="shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* Watchlist items */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your Watchlist
          </h2>

          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <Star className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Your watchlist is empty</p>
              <p className="text-xs text-muted-foreground/60">
                Add stocks, crypto, companies, or topics to track
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-border/60 bg-card/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <TypeIcon type={item.entityType} className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.entityLabel}</p>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 mt-0.5 border-border/40 text-muted-foreground"
                    >
                      {item.entityType}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item)}
                  className="ml-3 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 transition-colors shrink-0"
                  aria-label="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

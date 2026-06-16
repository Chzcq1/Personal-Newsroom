// ============================================================
// SIGNAL CARD — Sprint 18 Task D
//
// Visual intelligence hierarchy cards.
// Breaking signal, urgency glow, momentum indicators,
// confidence ribbons, "why this matters" preview blocks.
//
// Inspired by Bloomberg Terminal / FT / Reuters Eikon aesthetics.
// ============================================================

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Zap, TrendingUp, AlertTriangle, Shield,
  Clock, ExternalLink, ChevronRight, Eye,
  Activity, BarChart2, Flame, Target,
} from "lucide-react";

// ── Signal tier types ──────────────────────────────────────────

export type SignalTier = "breaking" | "critical" | "high" | "medium" | "context";
export type ConfidenceClass = "established" | "confirmed" | "developing" | "early_signal" | "experimental";
export type MomentumDirection = "accelerating" | "stable" | "fading";

export interface SignalCardProps {
  tier: SignalTier;
  headline: string;
  summary?: string;
  source?: string;
  sourceTier?: "A" | "B" | "C";
  publishedAt?: string;
  url?: string;
  confidence?: ConfidenceClass;
  confidenceScore?: number;
  momentum?: MomentumDirection;
  whyItMatters?: string;
  signalScore?: number;
  entities?: string[];
  isBreaking?: boolean;
  className?: string;
  onClick?: () => void;
}

// ── Tier styling system ────────────────────────────────────────

const TIER_CONFIG: Record<SignalTier, {
  glow: string;
  border: string;
  badge: string;
  badgeText: string;
  icon: React.ComponentType<{ className?: string }>;
  sizeMultiplier: number;
}> = {
  breaking: {
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]",
    border: "border-red-500/40",
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    badgeText: "BREAKING",
    icon: Zap,
    sizeMultiplier: 1.2,
  },
  critical: {
    glow: "shadow-[0_0_12px_rgba(251,146,60,0.25)] hover:shadow-[0_0_20px_rgba(251,146,60,0.4)]",
    border: "border-orange-500/30",
    badge: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
    badgeText: "CRITICAL",
    icon: AlertTriangle,
    sizeMultiplier: 1.1,
  },
  high: {
    glow: "shadow-[0_0_8px_rgba(234,179,8,0.15)] hover:shadow-[0_0_14px_rgba(234,179,8,0.3)]",
    border: "border-yellow-500/20",
    badge: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    badgeText: "HIGH",
    icon: TrendingUp,
    sizeMultiplier: 1.0,
  },
  medium: {
    glow: "hover:shadow-[0_0_8px_rgba(255,255,255,0.05)]",
    border: "border-white/8",
    badge: "bg-white/5 text-white/50 border border-white/10",
    badgeText: "MEDIUM",
    icon: Activity,
    sizeMultiplier: 0.95,
  },
  context: {
    glow: "",
    border: "border-white/5",
    badge: "bg-white/3 text-white/30 border border-white/8",
    badgeText: "CONTEXT",
    icon: Shield,
    sizeMultiplier: 0.9,
  },
};

// ── Confidence ribbon ──────────────────────────────────────────

const CONFIDENCE_CONFIG: Record<ConfidenceClass, { color: string; label: string }> = {
  established: { color: "bg-emerald-500", label: "Established" },
  confirmed: { color: "bg-blue-500", label: "Confirmed" },
  developing: { color: "bg-yellow-500", label: "Developing" },
  early_signal: { color: "bg-orange-500", label: "Early Signal" },
  experimental: { color: "bg-white/30", label: "Experimental" },
};

// ── Momentum indicator ─────────────────────────────────────────

function MomentumBadge({ momentum }: { momentum: MomentumDirection }) {
  if (momentum === "accelerating") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-orange-400/80 bg-orange-400/10 px-1.5 py-0.5 rounded">
        <Flame className="w-3 h-3" />
        accelerating
      </span>
    );
  }
  if (momentum === "fading") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
        <Activity className="w-3 h-3" />
        fading
      </span>
    );
  }
  return null;
}

// ── Source tier dot ────────────────────────────────────────────

function SourceTierDot({ tier }: { tier: "A" | "B" | "C" }) {
  const colors = { A: "bg-emerald-400", B: "bg-blue-400", C: "bg-white/30" };
  const titles = { A: "Tier A — Premium source", B: "Tier B — Quality source", C: "Tier C — General source" };
  return (
    <span
      className={cn("inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5", colors[tier])}
      title={titles[tier]}
    />
  );
}

// ── Signal score bar ───────────────────────────────────────────

function SignalScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 80 ? "bg-red-400" :
    pct >= 60 ? "bg-orange-400" :
    pct >= 40 ? "bg-yellow-400" :
    "bg-white/20";

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-white/30 font-mono">{score}</span>
    </div>
  );
}

// ── Main SignalCard component ─────────────────────────────────

export function SignalCard({
  tier,
  headline,
  summary,
  source,
  sourceTier = "C",
  publishedAt,
  url,
  confidence,
  confidenceScore,
  momentum,
  whyItMatters,
  signalScore,
  entities = [],
  isBreaking = false,
  className,
  onClick,
}: SignalCardProps) {
  const config = TIER_CONFIG[tier];
  const TierIcon = config.icon;
  const isHighPriority = tier === "breaking" || tier === "critical";

  const timeAgo = publishedAt
    ? (() => {
        const diff = (Date.now() - new Date(publishedAt).getTime()) / 1000 / 60;
        if (diff < 60) return `${Math.round(diff)}m`;
        if (diff < 1440) return `${Math.round(diff / 60)}h`;
        return `${Math.round(diff / 1440)}d`;
      })()
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative rounded-xl border bg-[#0f0f0f] overflow-hidden",
        "transition-all duration-200 cursor-pointer",
        config.glow,
        config.border,
        isBreaking && "animate-pulse-slow",
        className
      )}
      onClick={() => {
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        onClick?.();
      }}
    >
      {/* Confidence ribbon — left edge */}
      {confidence && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl",
            CONFIDENCE_CONFIG[confidence].color
          )}
        />
      )}

      {/* Breaking pulse overlay */}
      {isBreaking && (
        <div className="absolute inset-0 bg-red-500/3 pointer-events-none" />
      )}

      <div className="p-4 pl-5">
        {/* Top row: tier badge + meta */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", config.badge)}>
              <TierIcon className="w-2.5 h-2.5" />
              {config.badgeText}
            </span>

            {momentum && <MomentumBadge momentum={momentum} />}

            {confidence && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded",
                "bg-white/5 text-white/40 border border-white/8"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", CONFIDENCE_CONFIG[confidence].color)} />
                {CONFIDENCE_CONFIG[confidence].label}
              </span>
            )}
          </div>

          {timeAgo && (
            <span className="text-[10px] text-white/25 flex items-center gap-1 flex-shrink-0 mt-0.5">
              <Clock className="w-2.5 h-2.5" />
              {timeAgo}
            </span>
          )}
        </div>

        {/* Headline */}
        <h3 className={cn(
          "text-white font-semibold leading-snug mb-2 group-hover:text-white/90 transition-colors",
          isHighPriority ? "text-[15px]" : "text-[13px]"
        )}>
          {headline}
        </h3>

        {/* "Why this matters" preview */}
        {whyItMatters && isHighPriority && (
          <div className="flex items-start gap-1.5 mb-2.5 p-2 rounded-lg bg-white/3 border border-white/5">
            <Target className="w-3 h-3 text-white/40 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-white/50 leading-relaxed line-clamp-2">{whyItMatters}</p>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <p className="text-[12px] text-white/45 leading-relaxed mb-3 line-clamp-2">
            {summary}
          </p>
        )}

        {/* Entity chips */}
        {entities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {entities.slice(0, 4).map((entity) => (
              <span key={entity} className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded border border-white/8">
                {entity}
              </span>
            ))}
          </div>
        )}

        {/* Bottom row: source + score */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {sourceTier && <SourceTierDot tier={sourceTier} />}
            {source && (
              <span className="text-[11px] text-white/30 truncate">{source}</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {signalScore !== undefined && <SignalScoreBar score={signalScore} />}
            {url && (
              <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Breaking Signal Banner ─────────────────────────────────────

export interface BreakingSignalBannerProps {
  headline: string;
  detail?: string;
  onDismiss?: () => void;
}

export function BreakingSignalBanner({ headline, detail, onDismiss }: BreakingSignalBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="w-full bg-red-950/80 border border-red-500/30 rounded-xl px-4 py-3 flex items-start gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
    >
      <Zap className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Breaking</span>
        </div>
        <p className="text-[13px] text-white/90 font-medium leading-snug">{headline}</p>
        {detail && <p className="text-[12px] text-white/50 mt-0.5">{detail}</p>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
        >
          ×
        </button>
      )}
    </motion.div>
  );
}

// ── Signal Feed Container ──────────────────────────────────────

export interface SignalFeedProps {
  cards: SignalCardProps[];
  loading?: boolean;
  emptyMessage?: string;
}

export function SignalFeed({ cards, loading, emptyMessage }: SignalFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Eye className="w-8 h-8 text-white/20 mb-3" />
        <p className="text-white/40 text-sm">{emptyMessage ?? "No signals available"}</p>
      </div>
    );
  }

  // Group by tier for hierarchy display
  const breaking = cards.filter((c) => c.tier === "breaking");
  const critical = cards.filter((c) => c.tier === "critical");
  const rest = cards.filter((c) => c.tier !== "breaking" && c.tier !== "critical");

  return (
    <div className="space-y-2">
      {breaking.length > 0 && (
        <div className="space-y-2">
          {breaking.map((card, i) => (
            <SignalCard key={i} {...card} />
          ))}
        </div>
      )}
      {critical.length > 0 && (
        <div className="space-y-2">
          {critical.map((card, i) => (
            <SignalCard key={i} {...card} />
          ))}
        </div>
      )}
      {rest.length > 0 && (
        <div className="space-y-1.5">
          {rest.map((card, i) => (
            <SignalCard key={i} {...card} />
          ))}
        </div>
      )}
    </div>
  );
}

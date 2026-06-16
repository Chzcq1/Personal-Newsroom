# VISUAL_HIERARCHY.md — Sprint 18 Task D

## Overview

Sprint 18 introduces a visual intelligence hierarchy system so users instantly identify what matters most, inspired by Bloomberg Terminal, Financial Times, and Reuters Eikon.

## Component: SignalCard

Located at `artifacts/newsroom/src/components/ui/signal-card.tsx`

### Signal Tiers

| Tier | Visual Treatment | Use Case |
|------|-----------------|----------|
| `breaking` | Red glow `shadow-[0_0_20px_rgba(239,68,68,0.3)]`, animated pulse overlay | Active breaking news |
| `critical` | Orange glow, orange border | Critical market/political events |
| `high` | Yellow glow, yellow badge | High-signal stories |
| `medium` | No glow, white/8 border | Standard articles |
| `context` | Minimal styling | Background context |

### Urgency Glow System

Glow intensity scales with tier priority:
- `breaking`: `shadow-[0_0_20px_...]` hover `shadow-[0_0_30px_...]`
- `critical`: `shadow-[0_0_12px_...]` hover `shadow-[0_0_20px_...]`
- `high`: `shadow-[0_0_8px_...]` hover `shadow-[0_0_14px_...]`

### Confidence Ribbon

Left-edge 2px bar color indicates evidence quality:
- 🟢 `bg-emerald-500` — Established (multi-source, long-running)
- 🔵 `bg-blue-500` — Confirmed (cross-verified)
- 🟡 `bg-yellow-500` — Developing (single source, recent)
- 🟠 `bg-orange-500` — Early Signal (unconfirmed)
- ⚪ `bg-white/30` — Experimental

### Momentum Indicator

`MomentumBadge` shows `accelerating` (🔥 orange badge) or `fading` (grey) status:
- `accelerating`: trend velocity score > threshold
- `fading`: story declining in coverage
- No badge: stable/neutral

### "Why This Matters" Preview Block

For `breaking` and `critical` tier cards only:
- Shows `whyItMatters` text in a subtle container
- Uses `Target` icon from Lucide
- Limited to 2 lines (line-clamp-2)

### Entity Chips

Up to 4 named entities shown as small tags below the summary. Provides quick scanability of "who is involved".

### Signal Score Bar

16px wide bar with color coding:
- Red: score ≥ 80
- Orange: score ≥ 60
- Yellow: score ≥ 40
- White/20: score < 40

### Source Tier Dot

Colored 1.5px dot before source name:
- 🟢 Tier A (premium: FT, Bloomberg)
- 🔵 Tier B (quality: TechCrunch, Wired)
- ⚪ Tier C (general)

### Hierarchy-Based Sizing

- `breaking`: headline text-[15px], larger padding
- `critical`: headline text-[15px]
- `medium`/`context`: headline text-[13px]

## Component: BreakingSignalBanner

Full-width banner for truly breaking news. Features:
- Red border + red glow `shadow-[0_0_20px_rgba(239,68,68,0.2)]`
- Animated pulse Zap icon
- Dismissable via ×

## Component: SignalFeed

Container that auto-groups cards by tier:
1. Breaking signals first (grouped)
2. Critical signals second (grouped)
3. High/Medium/Context below

## Usage in Home Page

The existing `home.tsx` can use `<SignalCard>` by mapping articles to `SignalCardProps`:
```tsx
import { SignalCard } from "@/components/ui/signal-card";

<SignalCard
  tier={article.signalScore > 80 ? "breaking" : article.signalScore > 60 ? "high" : "medium"}
  headline={article.title}
  summary={article.summary}
  source={article.source}
  signalScore={article.signalScore}
  publishedAt={article.publishedAt}
  url={article.url}
/>
```

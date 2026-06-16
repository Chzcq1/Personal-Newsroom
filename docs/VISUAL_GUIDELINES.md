# VISUAL_GUIDELINES.md — INFOX Visual Language Standard

**Version:** Sprint 7 — 2026-06-16
**Design direction:** Bloomberg · Financial Times · Reuters — Minimal Intelligence Aesthetic

---

## Philosophy

INFOX is a personal intelligence tool, not a news aggregator. The visual language must communicate **authority, clarity, and trust** at every level.

**What we are:**
- Dense information displayed with editorial discipline
- Professional typographic hierarchy
- Trust signals that inform, not decorate
- Subtle motion that orients, not entertains

**What we are not:**
- A social media feed (no likes, shares, follower counts)
- A gamified reading app (no XP, levels, achievement badges)
- A content aggregator (no listicles, no emoji overload)

---

## Color System

### Background palette
```
Primary surface:   #0a0a0a   — page backgrounds
Secondary surface: #111111   — card backgrounds (bg-white/5 ≈ #111)
Elevated:          #1a1a1a   — hover, active, modals
Border:            rgba(255,255,255,0.08) — default card edge
Border-active:     rgba(255,255,255,0.15) — focused, hovered edges
```

### Text hierarchy
```
Primary text:      rgba(255,255,255,1.0)  — headlines, critical values
Secondary text:    rgba(255,255,255,0.7)  — body, labels
Tertiary text:     rgba(255,255,255,0.4)  — metadata, timestamps, hints
Disabled:          rgba(255,255,255,0.2)  — inactive controls
```

### Semantic colors (use sparingly)
```
Success:   #10b981  (emerald-500) — confirmed, delivered, verified
Warning:   #f59e0b  (amber-500)   — advisory, pending, partial
Error:     #ef4444  (red-500)     — failures, missing config
Info:      #2AABEE               — Telegram brand, links
Tier A:    #f59e0b  (amber-500)   — premium source indicator
```

---

## Typography

### Hierarchy rules
1. **Headline** — font-semibold, text-sm (14px) to text-base (16px), text-white, leading-snug
2. **Body** — font-normal, text-xs (12px) to text-sm (14px), text-white/70, leading-relaxed
3. **Meta** — font-normal, text-[10px] to text-xs, text-white/40, tracking-tight
4. **Code/mono** — font-mono, text-xs, text-white/60

### Article cards
- Title: text-sm font-semibold leading-snug, max 2 lines
- Description: text-xs leading-relaxed text-white/60, max 2 lines in detailed mode
- Source + timestamp: text-[10px] text-white/40, single line

### Do not use
- Decorative fonts
- font-bold on body text (semibold is the maximum weight for body content)
- Italics except for Telegram message rendering

---

## Spacing

### Grid units (multiples of 4px)
```
Micro:    4px   — gap-1, p-1
Small:    8px   — gap-2, p-2
Base:     12px  — gap-3
Medium:   16px  — gap-4, p-4
Large:    24px  — gap-6, p-6
Section:  40px  — py-10 between page sections
```

### Card anatomy
```
Padding:        p-4 (16px all sides)
Card gap:       space-y-3 (12px between cards)
Inner elements: gap-2–gap-3
Section header: mb-3 (12px below label before cards)
```

### Page layout
```
Max width (primary):   max-w-2xl (672px)  — settings, delivery
Max width (feed):      max-w-4xl (896px)  — my-feed, admin
Side padding:          px-4–px-6
Top padding:           py-8–py-10
```

---

## Source Identity System

### Source avatar
- Shape: rounded-sm (2px radius square) — editorial, not social
- Size: 28×28px (w-7 h-7) in card context
- Text: 9–10px, font-bold, tracking-tight
- Colors: defined in `lib/sourceBranding.ts`

### Tier badge (Tier A only)
- Text: "Tier A" or "★" in text-[9px] font-semibold
- Color: text-amber-400, border border-amber-400/30
- Never show for Tier B or C — absence signals less, not bad

### Source tier color intent
```
Tier A: amber/gold tones  — premium (FT, Bloomberg, Reuters)
Tier B: brand colors      — quality (TechCrunch, CNBC, BBC)
Tier C: neutral slate     — other sources
```

---

## Card Density Modes

### Compact (scan mode)
- Single visual row per article
- Source avatar + title (1 line, truncated) + timestamp + topic tag
- No description, no image, no "why selected"
- Card padding: p-3
- Card gap: space-y-1.5
- Purpose: fast scanning of 40+ headlines

### Detailed (read mode)
- Full information hierarchy
- Source avatar + meta row (source name, timestamp, reading time, tier badge)
- Title (2 lines max)
- Description excerpt (2 lines max)
- Trust row (topic tag, recency badge)
- "Why selected" explanation in tertiary text
- Optional thumbnail image (right-aligned, 80×50px)
- Card padding: p-4
- Card gap: space-y-3

---

## Image System

### Usage rules
- Images support context, never replace it
- Never use images that are wider than 120px in list views
- 16:9 aspect ratio preferred; 4:3 acceptable
- Always include `loading="lazy"` attribute
- Always include `onError` handler to hide broken images

### Rejection criteria (Task I — Content Safety)
Reject image URLs that:
- Start with `data:` (data URI)
- Match tracking pixel patterns (`pixel`, `tracking`, `beacon`, `1x1`, `spacer`)
- Fail URL validation
- Return network errors (handled by onError)

### Graceful fallback
When image unavailable: hide the image area entirely — never show a broken icon or grey placeholder box. Layout must not break.

---

## Trust Indicators

### Source quality badge
- Show: only for Tier A sources in detailed mode
- Format: `Tier A` in amber/border style
- Position: inline after source name

### Briefing metadata
- Format: "Generated from N sources" — below briefing title
- Never omit when source count is available

### Recency badge
- "Breaking" — articles ≤ 2 hours old — amber text, no border
- "Recent" — articles ≤ 6 hours old — muted text
- Nothing for older articles — silence is informative

### "Why selected" explanation
- Italic, tertiary text (text-white/40)
- Format: "Matched: OpenAI · Watchlist: NVDA · Breaking · Reuters ★"
- Visible in detailed mode only

---

## Reading Progress

### What to track
- Articles scrolled into view (≥ 50% visible threshold)
- Stored in `localStorage` key `ai-newsroom:read-articles`
- Session count displayed as "X of Y read"

### What NOT to do
- No progress bars filling up with celebration animation
- No "streak" counters or "on fire" states
- No XP, levels, or achievement unlocks
- No "Great job!" copy

### Display
- Single line, tertiary text: "12 of 48 read"
- Position: below page subtitle, above feed content
- No visual emphasis (same weight as metadata)

---

## Motion Rules

### Permitted
- `transition-colors` on hover states (150ms)
- `transition-shadow` on card hover (150ms)
- `animate-spin` on loading indicators (Loader2 icon)
- Fade-in for content appearing after API response (optional, 200ms)

### Forbidden
- Bounce, elastic, spring animations on content cards
- Progress bar animations with celebration pulses
- Confetti, particle effects
- Scroll-triggered entrance animations

---

## Delivery Preview (Telegram Simulation)

### Phone frame spec
- Outer frame: rounded-[40px] — simulates modern phone shape
- Screen area: rounded-[32px] overflow-hidden
- Background: #17212b — Telegram dark theme
- Width: fixed at 320px, centered
- Chat header: bot avatar (32px circle) + name + "online" status

### Message bubbles
- Background: #1e2b3b — incoming message color
- Radius: rounded-2xl rounded-tl-sm (Telegram style)
- Font: system-ui, 11px, line-height: 1.6
- Timestamp: 9px, right-aligned, text-white/30
- Parse mode: HTML (render `<b>`, `<i>` from Telegram formatter)

### Authenticity rules
- The preview must be pixel-faithful to actual Telegram output
- Padding, font size, and bubble shape must match Telegram Dark theme
- Do not add features that Telegram doesn't render (e.g. embedded images in text messages)

---

## Iconography

All icons use Lucide React. Sizing convention:
```
nav/header icons:    w-5 h-5 (20px)
button icons:        w-4 h-4 (16px)
inline/meta icons:   w-3 h-3 (12px)
micro badge icons:   w-2.5 h-2.5 (10px)
```

Never use emoji as UI icons. Emoji are acceptable only in:
- Telegram message content (as part of briefing text)
- Diagnosis messages from the Telegram diagnostics endpoint

---

## Accessibility

- All interactive elements must have visible focus ring (`:focus-visible`)
- Color-only communication is forbidden — always pair color with text or icon
- Minimum touch target: 36×36px
- Never disable tabIndex on interactive elements

---
name: Thai UI & Theme System
description: Full Thai translation approach and dark/light theme toggle implementation
---

## Thai UI
All user-facing pages translated to Thai. Key decision: `TOPIC_PRESETS` in onboarding.tsx uses two fields:
- `label` (English) — stored in localStorage and DB as interest labels; entityResolver maps these English strings to RSS feeds
- `labelTh` (Thai) — display only in onboarding UI

**Why:** Never change the English topic labels — entityResolver.ts and feed engine pattern-match on specific English strings like "Technology", "Stock Market" etc. Breaking these breaks feed personalization.

## Theme System

**Implementation:** `ThemeContext.tsx` in `src/contexts/` — toggles `dark` class on `document.documentElement`.

**CSS:** `@custom-variant dark (&:is(.dark *))` — dark variant applies to children of `.dark`. Applying to `html` makes everything dark.

**Light mode overrides:** `src/index.css` contains global CSS overrides targeting Tailwind-generated class names (e.g., `html:not(.dark) .bg-\[\#0a0a0a\]`, `html:not(.dark) .text-white\/60`) to invert dark-hardcoded colors. Covers: bg-[#0a0a0a], bg-black, bg-[#111], text-white with all opacity variants, bg-white/N, border-white/N.

**Toggle:** Sun/Moon icon in `settings/index.tsx` header (top right). Stored in `localStorage['ai-newsroom:theme']`. Default: dark.

**Flash prevention:** `index.html` has inline script in `<head>` that reads localStorage and applies `dark` class before React renders.

## Pricing
- Pro: 99 THB/month (was 299)
- Elite: 249 THB/month (was 699)
- Defined in `artifacts/api-server/src/routes/billing.ts` → PLANS array

## Payment Automation
Current system is semi-manual — admin confirms via `POST /billing/payment/:id/confirm`. For fully automatic Thai PromptPay, need **Omise** (Thai gateway) with `OMISE_PUBLIC_KEY` + `OMISE_SECRET_KEY` env vars. Not yet implemented.

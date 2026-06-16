---
name: Sprint 15 Intelligence Architecture
description: Precision filter + signal priority engine wired into news pipeline; signalStats in API response; dark mode HealthBadge; alpha gating
---

## Precision Filter (precisionFilter.ts)
Pure function `applyPrecisionFilter(articles, topicId)` — runs BEFORE signal ranking. Key constants: `SUPPRESSION_THRESHOLD=12`, `CRYPTO_CONFIRMATION_THRESHOLD=20`. Always keeps ≥4 articles.

## Signal Priority Engine (signalPriorityEngine.ts)
`rankBySignalPriority(articles, topicId)` — 7 factors, max 150 pts. Labels: critical≥100, high≥70, medium≥40, low<40. Recency is tiebreaker only (15 pts). Critical/high always surface before medium/low.

## Pipeline order in newsCollectorService.ts
RSS fetch → URL dedup → `applyPrecisionFilter` → `rankBySignalPriority` → near-dup suppression → source diversity → AI (top 10).
CollectionResult now includes `suppressedCount` and `cryptoDowngradedCount`.

## API response /api/news/summarize
Now returns `signalStats: { suppressedCount, cryptoDowngradedCount, totalCollected, signalRatio }`.

## TypeScript gotcha — api-client-react project reference
The newsroom tsconfig has a project reference to `lib/api-client-react` which requires `dist/` declarations.
Fix: run `npx tsc -b lib/api-client-react/tsconfig.json` to generate declarations.
**Why:** The package has `composite: true` and `emitDeclarationOnly: true` but no `build` npm script — must use `tsc -b` directly.

## TypeScript gotcha — Article vs SavedArticle
`Article` (from generated API client) has optional nullable fields (`description?: string | null`).
`SavedArticle` (briefingStorage.ts) has non-optional nullable fields (`description: string | null`).
Assigning `Article[]` to `SavedArticle[]` requires explicit `.map()` with `?? null` coercion.

## HealthBadge dark mode
Old: hardcoded light-mode classes (`bg-green-50 text-green-700 border-green-200`).
New: opacity-based theme-compatible classes (`bg-green-500/10 text-green-400 border-green-500/25`).
**Why:** Dark backgrounds (bg-background ~zinc-950 in dark mode) made light-mode bg-green-50 invisible or jarring.

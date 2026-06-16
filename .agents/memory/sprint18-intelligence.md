---
name: Sprint 18 Multi-Source Intelligence
description: Key type shapes, gotchas, and architectural decisions from Sprint 18 services
---

## RssArticle field naming
`RssArticle.description` (not `.summary`) — matches the rssService.ts field assignment (`item.contentSnippet || item.summary`).

## tokenGovernor state shape
`getTokenGovernorState()` returns `{ pressureLevel, budgetFraction, budgetExhausted, ... }`.
- NOT `governor.pressure` — use `governor.pressureLevel`
- NOT `governor.remainingBudgetPct` — compute as `Math.round((1 - governor.budgetFraction) * 100)`

## Platform adapters
`platformAdapters.ts` extends the ISourceAdapter interface from `sourceAdapter.ts`.
- YouTube RSS adapter: active, no auth required
- Reddit Expanded: active, 15 new subreddits
- TikTok/Facebook/Instagram: stubs, return [] when API key absent

## Source trust — stability class `toxic`
Sources with trust score < 30 get `stabilityClass = "toxic"` and are excluded from AI processing entirely in `sourcePriorityOrchestrator.ts`.

## Token survival — memoization is non-crypto hash
`simpleHash()` in tokenSurvivalEngine is a fast 32-bit hash (not SHA/MD5). Not for security — only for content dedup.

## BYOK — architecture only in Sprint 18
`byokPreparation.ts` stores only intent and metadata. No actual API keys are stored (Sprint 19 will add encrypted DB storage + live validation).

## deploymentHardening — union type const access
`ENV_SPEC` is a `const` array with mixed optional `default` fields. Access with `"default" in spec ? spec.default : undefined` to avoid TS union error.

## compressionEngine — Sprint 18 persona modes
New `PersonaDensityMode`: executive/investor/operator/analyst/delta_only.
`compressForPersona(text, mode)` is persona-aware.
`extractDeltaOnly(text)` strips recap sentences, keeps new-development sentences.

**Why:** Different user personas have different reading priors — executives need 3-bullet decisions, investors need financial metrics, operators need execution detail.

## Signal card CSS — animate-pulse-slow
`animate-pulse-slow` is defined in `index.css` (not from Tailwind). Opacity 1 → 0.7 → 1 over 3s. Used by breaking signal cards.

## Sprint 18 admin routes
All mounted at `/api/admin/...` via `sprint18AdminRouter`.
`GET /api/admin/sprint18` returns full system summary — useful for health dashboards.

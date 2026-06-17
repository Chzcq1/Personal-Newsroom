---
name: Sprint 25 Product Convergence
description: Key decisions from Sprint 25 — feed unification, entity resolver, billing foundation
---

## Feed is now the homepage
`App.tsx` route "/" redirects to "/my-feed". MyFeedPage IS the product. No back button in header.
**Why:** Sprint 25 mandate — For You Feed is the primary product surface.

## Entity-Source Resolver
`artifacts/api-server/src/services/news/entityResolver.ts`
Maps interest names (Bitcoin, Nvidia, OpenAI…) and watchlist terms (btc, nvda, chatgpt…) to specific RSS feeds.
Use `getSourcesForEntities(interests, watchlist)` to get supplemental sources.
**How to apply:** Call from feed pipeline when building entity-specific article collection.

## Billing Architecture (NO fake payments)
- DB tables: `plans`, `subscriptions`, `payments` — pushed to Postgres
- API: `GET /api/billing/plans`, `GET /api/billing/status` (routes/billing.ts)
- UI: `/settings/billing` — plan shell only, upgrade buttons disabled
- Plans: Free (฿0), Pro (฿299/mo), Elite (฿699/mo)
- PromptPay integration deferred to Sprint 26+
**Why:** Arch-first approach; no fake success flows per sprint mandate.

## Auto-refresh pattern in my-feed.tsx
`refetchInterval: 90_000, refetchIntervalInBackground: false` + countdown useEffect synced to data changes.
Display: "↻ {countdown}s" in header subtext; "Refreshing…" in emerald when isFetching.

## Settings admin separation
Admin routes (Token Economics, Efficiency Admin) removed from /settings — accessible only via /admin/*.
Tiny "Admin" footer link in settings → /admin/command-center (discoverable but not prominent).

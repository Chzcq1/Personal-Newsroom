---
name: Sprint 22 Personalization
description: Personalized feed foundation — interest profile, feed ranking, feedback loop, discover, watchlist, profile pages
---

# Sprint 22 — Personalized Feed Foundation

## New DB Columns (userInterests)
`weight integer default 50`, `engagementScore real default 0`, `lastInteraction timestamp nullable` were added to the existing `user_interests` table via `db push`. The push handled `ALTER TABLE ADD COLUMN` automatically.

## New Backend Services
- `services/feedRankingService.ts` — pure ranking logic, no DB calls. Formula: interestMatch×40% + sourceTrust×20% + signalPriority×20% + recency×20%. Import `type UserInterest` from `@workspace/db` is safe (type-only, erased at runtime).
- `repositories/interestRepository.ts` — interest CRUD with weight tracking. `applyFeedback(profileId, label, delta)` auto-creates interest if delta > 0.
- `repositories/watchlistRepository.ts` — watchlist CRUD.

## Route Ordering Rule (re-enforced)
In `interestRoutes.ts`, `POST /interests/feedback` MUST be declared before `GET /interests/:profileId` to avoid Express matching "feedback" as a profile ID. Specific routes before wildcards always.

## Frontend Pattern
New pages (discover, watchlist, profile) use direct `fetch()` calls to `/api/*` rather than generated hooks from `@workspace/api-client-react`. This is intentional — adding to the OpenAPI spec + codegen takes a full sprint; for user-facing CRUD pages, direct fetch is faster and acceptable.

## BottomNav
`components/BottomNav.tsx` — fixed to `bottom-0`, uses wouter `useLocation()` for active state. The active check for `/` is exact (`location === "/"`) to avoid all routes matching.

## Feedback Deltas
- like: +10, dislike: -15, follow: +20, unfollow: -20
- Clamped to [0, 100] range.

## Route Budget Achieved
24 routes → 20 routes (Sprint 22):
- Added: /discover, /watchlist, /profile
- Retired to redirects: /my-feed, /narratives, /insights/export, /admin/system, /admin/health, /admin/users, /waitlist, /settings/interests

## Navigation
Header now shows only: Logo + HealthBadge | Saved | Settings gear. Bottom nav has: Feed, Discover, Watchlist, Profile. Admin tools never appear in user nav.

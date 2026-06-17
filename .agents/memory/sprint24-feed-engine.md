---
name: Sprint 24 Feed Engine
description: For You feed restoration, TikTok card design, DB watchlist load, real trending, Google OAuth URL fixes.
---

## Google OAuth URL resolution
Both `authService.ts` and `routes/auth.ts` now use helper functions that resolve
`API_BASE_URL` / `FRONTEND_URL` with `REPLIT_DEV_DOMAIN` as fallback.
Pattern:
```ts
function getApiBaseUrl(): string {
  if (process.env["API_BASE_URL"]) return process.env["API_BASE_URL"].replace(/\/$/, "");
  if (process.env["REPLIT_DEV_DOMAIN"]) return `https://${process.env["REPLIT_DEV_DOMAIN"]}`;
  return "";
}
```
`buildGoogleAuthUrl()` throws hard if the resulting redirect_uri is not absolute — fail-fast > silent broken OAuth.

**Why:** Without `API_BASE_URL` set, the redirect_uri becomes a relative path ("/api/auth/google/callback"), which Google rejects.

## BottomNav primary route
"For You" nav item points to `/my-feed`, not `/`.
Active detection uses `location === href || location.startsWith(href + "/")` — no special-case for root.

**Why:** `/` (briefings generator) and `/my-feed` (personalized stream) are two different surfaces; nav should lead to the stream.

## FeedCard TikTok design pattern
`ActionBar` replaces `FeedbackBar`. Five equal-flex buttons:
- Like/Pass → `POST /api/adaptive/feedback`
- Save → `ai-newsroom:saved-articles` localStorage set
- Follow → `POST /api/interests/feedback` with `{ topicLabel, action: "follow" }`
- Open → `<a target="_blank">`

Cards use `rounded-xl overflow-hidden` with body padding in a nested div; ActionBar lives OUTSIDE the padding div so it touches the card edge edge-to-edge.

## DB watchlist loading in my-feed
`useAuth()` → `profileId` → `GET /api/watchlist/:profileId` via `useQuery`.
`combinedWatchlist = useMemo(() => [...new Set([...dbLabels, ...localWatchlist])], ...)`.
Both the query key and POST body use `combinedWatchlist`.

## Real trending in discoverRoutes
`getAllTrackedEntities()` from `entityMemory.ts` returns `EntityMemoryEntry[]` with `mentionCount`.
Sort descending, take top 8. Falls back to CURATED_TRENDING when array is empty.
Response shape: `{ trending, source: "live" | "curated", entityCount? }`.

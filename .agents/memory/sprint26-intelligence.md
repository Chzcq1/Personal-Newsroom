---
name: Sprint 26 Real-Time Intelligence
description: Trend ingestion architecture, PromptPay QR payment flow, entityResolver feed wire-up, route budget enforcement
---

## Trend Ingestion Architecture

- **Service**: `artifacts/api-server/src/services/trendIngestion/index.ts`
- **Worker**: `artifacts/api-server/src/workers/trendIngestionWorker.ts` — 15min interval, registered in workerRegistry
- **Routes**: `artifacts/api-server/src/routes/trends.ts` (GET /trends/recent, /trends/feed, /trends/status, POST /trends/ingest)
- **DB table**: `trend_items` — 24h TTL via expiresAt, expires cleaned on each ingest cycle
- **In-memory cache**: `cachedItems[]` in trendIngestion/index.ts — fast access between DB writes
- **Real providers** (enabled): Reddit RSS, YouTube RSS, Google News RSS
- **Mock providers** (disabled): Twitter/X (needs API v2 paid), Social (TikTok/IG/FB)

## PromptPay QR Payment Flow

- **Activation**: Requires `PROMPTPAY_PHONE_NUMBER` env var — if absent, returns 503 with `code: "PROMPTPAY_NOT_CONFIGURED"`
- **QR generation**: Server returns raw data (phone + amount). Frontend generates EMV QR using `promptpay-qr` npm package + renders via `qrcode` npm package
- **Polling**: Frontend polls GET /api/billing/payment/:id/status every 4 seconds
- **Admin confirm**: POST /api/billing/payment/:id/confirm → updates payments table + creates subscriptions row
- **Admin list**: GET /api/billing/admin/payments — shown in command-center.tsx Payments section

## Feed Pipeline (entityResolver wire-up)

- `getSourcesForEntities(interests, watchlist)` called after topic-based collection in `/feed/personal`
- Returns `RssSourceConfig[]` — each has `{ url, name, category, entity }`
- Entity articles merged into rawArticles pool before dedup + ranking
- If watchlist is empty and no interests, no extra sources fetched (no overhead)

**Why:** Entity-specific RSS (CoinDesk for BTC, Reuters/Yahoo Finance for NVDA, etc.) gives users exactly what they follow — not just generic topic feeds.

## Route Budget Enforcement

- Budget: ≤20 primary routes
- Sprint 26 retired: `/settings/preferences` → redirect `/settings`, `/admin/narratives` → redirect `/intelligence-center`
- Exec mode toggle moved inline to settings/index.tsx (useState + setExecutiveMode)
- `Home` page import removed from App.tsx (dead — "/" redirects to /my-feed)

## Environment Variables Required (not yet set)

- `PROMPTPAY_PHONE_NUMBER` — Thai mobile number for PromptPay (10 digits)
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — Google OAuth (redirect URI: `https://<REPLIT_DEV_DOMAIN>/api/auth/google/callback`)

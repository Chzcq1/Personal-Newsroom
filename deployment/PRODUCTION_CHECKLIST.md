# PRODUCTION CHECKLIST — INFOX

**Sprint 30 — Production Readiness**

Run through this checklist before any production deployment.

---

## Pre-Deploy Verification

### Environment Variables (Required)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Required | PostgreSQL connection string |
| `JWT_SECRET` | ✅ Required | ≥ 32-char secret for JWT signing |
| `NODE_ENV` | ✅ Required | Set to `production` |
| `GITHUB_TOKEN` | Recommended | GitHub Models API (AI summarization) |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram delivery (set to activate) |
| `TELEGRAM_CHAT_ID` | Optional | Telegram delivery target |
| `PROMPTPAY_PHONE_NUMBER` | Optional | PromptPay QR payment activation |
| `ADMIN_EMAILS` | Optional | Comma-separated admin email list |
| `YOUTUBE_API_KEY` | Optional | YouTube trend adapter (ARCHITECTURE-READY) |
| `TWITTER_BEARER_TOKEN` | Optional | Twitter trend adapter (ARCHITECTURE-READY) |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth login |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth login |

### Database

- [ ] PostgreSQL 15+ running and accessible via `DATABASE_URL`
- [ ] Run `pnpm --filter @workspace/db run push` to apply schema
- [ ] Verify 13 tables exist: users, profiles, interests, briefings, delivery_queue, trend_items, saved_articles, narratives, analytics, plans, subscriptions, payments, user_feedback
- [ ] Confirm DB latency < 200ms: `curl $API_URL/api/health`

### Build

```bash
# Full typecheck + build
pnpm run build

# Or API server only
pnpm --filter @workspace/api-server run build
```

- [ ] Build passes with zero TypeScript errors
- [ ] Bundle size < 5MB (current: ~3.5MB)

---

## Deployment Targets

### Docker (recommended for Railway / Fly.io / VPS)

```bash
# Build image
docker build -t infox-api -f deployment/Dockerfile .

# Run locally to verify
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret-here" \
  -e NODE_ENV=production \
  infox-api

# Verify health
curl http://localhost:8080/api/health
```

### Railway

```bash
# Using deployment/railway.toml (already configured)
railway login
railway link
railway up
```

Required Railway env vars: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`

### Fly.io

```bash
# Using deployment/fly.toml (already configured)
flyctl auth login
flyctl launch --no-deploy
flyctl secrets set DATABASE_URL="..." JWT_SECRET="..."
flyctl deploy
```

### Render

```bash
# Using deployment/render.yaml (already configured)
# Push to connected GitHub repo — Render auto-deploys
```

---

## Post-Deploy Health Checks

Run these after every deployment:

```bash
export API="https://your-domain.com"

# 1. Health
curl $API/api/health | jq .status

# 2. Trends active
curl $API/api/trends/status | jq .totalItems

# 3. Feed returns data
curl -X POST $API/api/feed/trend-cards \
  -H "Content-Type: application/json" \
  -d '{"interests":["ai","technology"],"watchlist":[]}' \
  | jq '{cards: (.cards | length), trends: .stats.activeTrends}'

# 4. Auth endpoint
curl $API/api/auth/me | jq .

# Expected: cards > 0, trends > 0
```

---

## Production Behavior

### Graceful Degradation

| Condition | Behavior |
|---|---|
| `DATABASE_URL` absent | In-memory adapters, full API surface |
| Trend cache empty | Feed returns article-type cards |
| RSS feeds fail | Falls back to available sources |
| AI provider unreachable | Briefing pipeline returns error, feed unaffected |

### Workers (background, auto-start)

| Worker | Interval | Purpose |
|---|---|---|
| `trend-ingestion-worker` | 15 min | Fetches Reddit/YouTube/Google News trends |
| `narrative-update-worker` | 30 min | Updates narrative clusters |
| `analytics-aggregation-worker` | 15 min | Aggregates feed quality metrics |
| `retry-worker` | 1 min | Retries failed Telegram deliveries |

### Ports

| Service | Port | Notes |
|---|---|---|
| API Server | 8080 | Configurable via `PORT` env var |
| Frontend | 5000 (dev) | Served by Vite in dev, static build in prod |

---

## Security Checklist

- [ ] `JWT_SECRET` is ≥ 32 characters and randomly generated
- [ ] `NODE_ENV=production` is set (disables dev-only endpoints)
- [ ] Admin emails configured in `ADMIN_EMAILS` env var
- [ ] CORS origin restricted to production domain (if exposing API)
- [ ] Database connection uses SSL in production (`?sslmode=require`)
- [ ] No `.env` file committed to git

---

## Rollback Plan

```bash
# Railway
railway rollback

# Fly.io
flyctl releases list
flyctl deploy --image registry.fly.io/infox-api:v<N>

# Docker VPS
docker pull infox-api:previous-tag
docker stop infox-api && docker run -d infox-api:previous-tag
```

---

## Known Issues

1. **Port conflict on Replit**: If `web` or `API Server` workflow fails with "EADDRINUSE", kill stale processes:
   ```bash
   fuser -k 5000/tcp 2>/dev/null
   fuser -k 8080/tcp 2>/dev/null
   ```

2. **Trend data cold start**: First 15 minutes after deploy, trend cache is empty. Feed returns article-type cards. Normal after first worker tick.

3. **Reuters/AP feeds blocked**: `feeds.reuters.com` and `feeds.apnews.com` may be geoblocked in some regions. This is expected — fallback sources cover the gap.

---

*Last updated: Sprint 30 — 2026-06-18*

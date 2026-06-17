# DEPLOYMENT READINESS — INFOX Sprint 12 Task G

## Purpose

This document prepares the migration architecture from Replit's always-on (paid tier) or session-based deployment to persistent cloud infrastructure.

**Status: Architecture preparation only. No migration has occurred.**

---

## Target Platforms

| Platform | Type | Recommended For |
|---|---|---|
| Railway | Container PaaS | Easiest migration — deploy from GitHub |
| Render | Container PaaS | Free tier available, sleep-on-idle for dev |
| Fly.io | Edge containers | Best for global latency |
| VPS (DigitalOcean/Linode) | Raw server | Full control, requires more ops |
| Docker self-hosted | Container | Any infrastructure that runs Docker |

---

## Environment Variables Required

All environment variables are stored in Replit Secrets (current) or platform-equivalent secret storage.

### Required

| Variable | Description | Used By |
|---|---|---|
| `GITHUB_TOKEN` | GitHub Models API token | AI provider (default) |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | Scheduled delivery |
| `TELEGRAM_CHAT_ID` | Target chat/channel ID | Scheduled delivery |

### Optional — AI Provider Switching

| Variable | Description |
|---|---|
| `AI_PROVIDER` | `github` (default) \| `openai` \| `gemini` |
| `OPENAI_API_KEY` | Required if AI_PROVIDER=openai |
| `GEMINI_API_KEY` | Required if AI_PROVIDER=gemini |

### Optional — Performance

| Variable | Description | Default |
|---|---|---|
| `PORT` | API server port | `8080` |
| `NODE_ENV` | `production` \| `development` | `development` |
| `LOG_LEVEL` | `info` \| `debug` \| `warn` | `info` |

### Future — Persistence Phase

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection for queues and caching |

---

## Persistent Services

The following services currently run as in-memory state and must be persisted in production:

| Service | Current State | Migration Target |
|---|---|---|
| Delivery schedule (cron) | Node.js setInterval | Platform cron / Bull queue |
| Digest memory | In-memory ring buffer | PostgreSQL `digests` table |
| Entity memory | In-memory Map | PostgreSQL `entity_memory` table |
| Interest graph | Hardcoded TypeScript | PostgreSQL + optional hot cache |
| Trend memory | In-memory ring buffer | PostgreSQL |
| Delivery recovery queue | In-memory | Redis BullMQ queues |
| Alert history | In-memory | PostgreSQL |
| Cost analytics | In-memory | PostgreSQL |
| Source reliability scores | In-memory Map | PostgreSQL |

---

## Scheduler Migration

### Current (Replit)

```typescript
// artifacts/api-server/src/services/delivery/scheduler.ts
setInterval(() => checkAndDeliver(), 60_000); // checks every minute
```

Limitation: scheduler dies when Replit session ends.

### Target (Production)

**Option A: Platform Cron (Railway/Render)**
```
# cron.yaml (Railway)
jobs:
  - name: morning-briefing
    schedule: "0 0 * * *"   # 00:00 UTC = 07:00 ICT
    command: "node scripts/trigger-morning.mjs"
  - name: evening-briefing
    schedule: "0 11 * * *"  # 11:00 UTC = 18:00 ICT
    command: "node scripts/trigger-evening.mjs"
```

**Option B: BullMQ (Redis-backed)**
```typescript
// Future: services/delivery/scheduler.ts
import { Queue, Worker } from "bullmq";
const deliveryQueue = new Queue("deliveries", { connection: redisConnection });
await deliveryQueue.add("morning", {}, { repeat: { cron: "0 0 * * *" } });
```

**Option C: External trigger**
Use Uptime Robot / Better Stack to ping `/api/delivery/morning` via webhook at scheduled times.

---

## Cron Architecture

```
Trigger → POST /api/delivery/morning
        → generateBriefing("morning")
        → collectArticles → compressV2 → tokenEconomy → AI → format
        → persistDigest() ← delivery recovery
        → channel.send() → markDelivered() OR markFailed() → enqueueRetry()
```

---

## Queue Strategy

| Queue | Purpose | Tool |
|---|---|---|
| `delivery` | Scheduled briefing triggers | BullMQ or platform cron |
| `retry` | Failed delivery retries | BullMQ (already modelled in deliveryRecovery.ts) |
| `article-fetch` | Parallel RSS fetching | Promise.allSettled (current, sufficient) |

---

## Docker Deployment

### Dockerfile (api-server)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/api-server ./artifacts/api-server
COPY lib ./lib
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server build
EXPOSE 8080
CMD ["node", "artifacts/api-server/dist/index.js"]
```

### Dockerfile (newsroom frontend)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/newsroom build

FROM nginx:alpine
COPY --from=build /app/artifacts/newsroom/dist /usr/share/nginx/html
```

---

## Future Redis Usage

Redis is not currently required. It becomes necessary when:

1. **Retry queues** need to survive server restarts → BullMQ
2. **Caching** article fetches across multiple instances → Redis cache
3. **Rate limiting** AI calls across workers → Redis sliding window
4. **Session storage** when auth is added → Redis sessions

Connection: `REDIS_URL=redis://localhost:6379` (or managed Redis on Railway/Fly)

---

## Known Limitations Before Migration

1. Scheduler dies when Replit session ends (Replit free tier sleeps after inactivity)
2. All in-memory state (entity memory, delivery history, trend memory) resets on restart
3. No authentication — no user isolation, delivery credentials in localStorage
4. Single-process — no horizontal scaling yet

## Recommended Migration Order

1. Deploy to Railway (30 min) — gets always-on scheduler
2. Add PostgreSQL (2h) — persists delivery history + entity memory
3. Add auth (Clerk) (4h) — enables multi-user isolation
4. Add Redis (1h) — enables BullMQ retry queues
5. Add pgvector (2h) — enables semantic memory search

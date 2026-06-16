# Persistent Infrastructure — Sprint 14

## Overview

Sprint 14 transforms INFOX from a Replit-session-dependent prototype into a
persistent, deployable intelligence platform. All user data, delivery history,
and intelligence memory now survives restarts, redeployments, and server
migrations.

---

## Database Architecture

**ORM:** Drizzle ORM (already configured)  
**Backend:** PostgreSQL (Replit-provisioned, also works on Railway/Render/Fly.io)  
**Schema location:** `lib/db/src/schema/`

### Tables Created

| Table | Purpose |
|-------|---------|
| `user_profiles` | Anonymous device identity, founding member status, onboarding state |
| `user_preferences` | Topic favorites, personality, executive mode, feed density |
| `user_interests` | Active user interest labels (per profile) |
| `user_watchlists` | Entity watchlists (per profile) |
| `saved_briefings` | Briefings saved by users (persistent backup of localStorage) |
| `delivery_logs` | Every delivery attempt — status, tokens used, errors |
| `delivery_queue` | DB-backed delivery queue with retry state |
| `delivery_schedules` | User-configured delivery schedules |
| `feedback_actions` | Every open/save/skip/thumbs_up/thumbs_down event |
| `narrative_memory` | Persistent narrative threads with 14-day TTL |
| `entity_memory` | Tracked entities with 7-day TTL |

---

## Storage Abstraction Layer

**Location:** `artifacts/api-server/src/services/storage/`

### Files
- `IRepository.ts` — Generic repository interface (`findById`, `findAll`, `save`, `update`, `delete`)
- `memoryAdapter.ts` — `MemoryAdapter<T>` backed by `Map<K, T>` (used for caches, ring buffers)
- `pgAdapter.ts` — PostgreSQL helper utilities for Drizzle repositories

### Repository Pattern
All DB access goes through typed repositories in `artifacts/api-server/src/repositories/`:
- `userProfileRepository.ts`
- `savedBriefingRepository.ts`
- `deliveryLogRepository.ts`
- `deliveryQueueRepository.ts`
- `feedbackRepository.ts`

---

## Delivery Queue Architecture

**File:** `artifacts/api-server/src/services/delivery/deliveryQueue.ts`

### Design
- **Primary:** DB-backed queue (`delivery_queue` table)
- **Fallback:** In-memory ring buffer (when DB unavailable)
- **States:** `pending → sent` or `pending → failed → pending` (with retry)
- **Retry delays:** 1m → 5m → 15m (3 max attempts)

### Functions
```typescript
enqueueForDelivery(opts)    → string (queue ID)
getDueDeliveries()          → MemQueueItem[]
markQueueItemSent(id)       → void
markQueueItemFailed(id, err)→ void (schedules retry if attempts remain)
getQueueStatus()            → { pending, sent, failed, recent }
```

---

## Startup Recovery

**File:** `artifacts/api-server/src/services/infra/startupRecovery.ts`

Runs on every server start:
1. Verifies DB connection (measures latency)
2. Checks for pending delivery queue items from previous run
3. Activates **degraded mode** if DB is unavailable
4. Returns a `StartupReport` accessible via `getStartupReport()`

In degraded mode, all repository operations are no-ops (graceful fallback to in-memory).

---

## Background Workers

**Location:** `artifacts/api-server/src/workers/`

| Worker | Interval | Responsibility |
|--------|----------|---------------|
| `RetryWorker` | 60s | Processes due delivery queue items, retries via Telegram |
| `NarrativeWorker` | 30m | Prunes expired narrative threads from DB |
| `AnalyticsWorker` | 15m | Aggregates delivery stats and user counts |

All workers extend `BaseWorker` which provides:
- Automatic start/stop lifecycle
- Health tracking (runCount, errorCount, lastError, status)
- Error isolation (one worker crash doesn't affect others)

---

## Data Ownership Model

Each data type has an explicit ownership boundary:

| Data | Owner | Storage | Lifetime |
|------|-------|---------|---------|
| Anonymous profile ID | Device | localStorage + DB | Permanent |
| Preferences | Profile | localStorage + DB sync | Until reset |
| Saved briefings | Profile | localStorage + DB backup | Until deleted |
| Feedback actions | Profile | DB | Permanent |
| Delivery history | System | DB | Permanent |
| Narrative threads | System | Memory + DB | 14 days |
| Entity memory | System | Memory + DB | 7 days |
| Telegram credentials | User | localStorage only | Until cleared |

---

## Closed Alpha Preparation

### Onboarding Flow
**Route:** `/onboarding`  
**File:** `artifacts/newsroom/src/pages/onboarding.tsx`

4-step guided setup:
1. Welcome & value proposition
2. Topic preset selection
3. Delivery introduction (Telegram setup)
4. Founding Member designation

### Founding Member Concept
- First users are marked `founding_member: true` in `user_profiles`
- Founding Member badge shown in onboarding completion
- Future: exclusive features, early access to new intelligence systems

---

## Platform Economics

**Route:** `/admin/economics`  
**API:** `/api/economics/summary`, `/api/economics/delivery`, `/api/economics/users`, `/api/economics/infrastructure`

Tracks:
- Total AI token cost (per 1K input/output tokens)
- Delivery success rate
- Cost per user and per delivery
- 7-day delivery breakdown by type
- Monthly infrastructure cost estimates by platform

---

## Deployment Preparation

**Location:** `deployment/`

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage production image (Node 24 Alpine) |
| `docker-compose.yml` | Local production stack (API + PostgreSQL) |
| `.env.example` | Environment variable reference |
| `railway.toml` | Railway platform config |
| `render.yaml` | Render platform config |
| `fly.toml` | Fly.io platform config (Singapore region) |

### Supported Platforms
- **Replit** (current, development)
- **Railway** (`railway up`)
- **Render** (connect GitHub repo)
- **Fly.io** (`fly deploy`)
- **VPS** (`docker-compose up -d`)

---

## Known Limitations

1. **In-memory intelligence still primary** — Narrative/entity memory writes to DB for TTL management but business logic still reads from in-memory store. Full DB read path is next sprint.
2. **No cross-device sync yet** — Identity is per-device. Account login required for multi-device.
3. **Worker threads still single-process** — Workers run in the same Node.js process. Extract to separate processes for Railway multi-dyno.
4. **No Redis** — Queue uses DB as backing store. Redis would improve retry latency at scale.

---

## Next Sprint Recommendations

1. Activate full DB read path for narrative/entity memory (replace in-memory Maps)
2. Add account login (Replit Auth or Clerk) linked to anonymous profile migration
3. Add Redis for high-throughput queue and caching
4. Build topic-level cost analytics (burn rate per topic)
5. Launch closed alpha with founding member invite codes

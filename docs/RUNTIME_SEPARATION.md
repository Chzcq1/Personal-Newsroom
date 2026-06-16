# Runtime Separation & Migration Plan

Sprint 17 documents which INFOX services are safe when Replit sleeps and which are not. This is the foundation for moving high-value services to always-on infrastructure.

## Why This Matters

Replit free-tier projects sleep after ~30 minutes of inactivity. INFOX has a 7:00am/6:00pm delivery scheduler and 14-day narrative memory — both break silently on sleep.

The Runtime Separation module (`runtimeSeparation.ts`) classifies every service and provides a prioritized migration plan.

## Classification Matrix

| Service | Persistence | Sleep Safety | Priority |
|---------|------------|--------------|----------|
| Delivery Scheduler | In-memory | ❌ Breaks | P0 |
| Narrative Memory | In-memory | ❌ Breaks | P0 |
| Token Governor | In-memory | ⚠️ Degrades | P1 |
| Intelligence Cache | In-memory | ⚠️ Degrades | P2 |
| Delivery Queue | DB-backed | ✅ Safe | P2 |
| User Profiles | DB-backed | ✅ Safe | P2 |
| RSS Collector | Stateless | ✅ Safe | P2 |
| AI Provider | External | ✅ Safe | P2 |

## Migration Plan

### Phase 1 — Critical (P0, immediate)

**Delivery Scheduler → Upstash QStash**
- Current: `setInterval()` in Node.js process — dies on sleep
- Migration: QStash HTTP cron → POST `/api/delivery/trigger`
- No code change to delivery logic, only trigger source changes

**Narrative Memory → PostgreSQL Checkpoints**
- Current: in-memory ring buffer in `narrativeStore`
- Migration: 30-minute checkpoint worker flushes to `narrative_threads` table
- Reads from DB on startup to restore state

### Phase 2 — Important (P1, Sprint 18–19)

**Token Governor → PostgreSQL Persistence**
- Current: daily counter resets on restart
- Migration: write usage snapshot every 15 minutes to `token_usage_log` table
- Read on startup to restore counter

### Phase 3 — Optional (P2, Post-launch)

**Intelligence Cache → Redis (Upstash)**
- Current: in-memory LRU — acceptable cache miss on restart
- Migration: Upstash Redis with same TTL semantics
- Cache miss on cold start is a cost issue, not a correctness issue

## Sleep Detection

The module tracks runtime sleep events:

```typescript
import { recordRuntimePing, getRuntimeStats } from
  "@/services/runtime/runtimeSeparation";

// Call on every API request
recordRuntimePing();

// Returns: uptimeSince, sleepCount, p0ServicesAtRisk
const stats = getRuntimeStats();
```

## API Endpoint

`GET /api/admin/runtime` — Returns runtime stats and full migration plan.

## File

`artifacts/api-server/src/services/runtime/runtimeSeparation.ts`

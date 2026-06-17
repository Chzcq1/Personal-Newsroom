# DELIVERY INFRASTRUCTURE — INFOX Sprint 12 Task F/L

## Overview

The delivery infrastructure manages the end-to-end pipeline from article collection to Telegram message send, with resilience features added in Sprint 12.

---

## Pipeline Architecture

```
Scheduler (07:00 / 18:00 ICT)
  │
  ▼
deliveryEngine.ts
  ├── collectCrossTopicArticles()
  │     └── newsCollectorService → RSS feeds
  │         └── recordFeedFetchResult() → sourceReliability.ts
  ├── applySourceReliabilityPenalties()
  ├── rankBySignal()
  ├── deduplicateNarratives()       ← tokenEconomy.ts
  ├── compressArticleBatch()        ← articleCompressionV2.ts
  ├── allocatePriorityBudget()      ← tokenEconomy.ts
  ├── summarizeDelivery()           ← summaryService → AI provider
  │     └── recordTokenUsage()      ← tokenEconomy.ts
  ├── formatMorningBriefingForTelegram()  ← briefingFormatter.ts
  ├── persistDigestBeforeSend()     ← deliveryRecovery.ts
  ├── channel.send()
  │     ├── markDigestDelivered()   ← deliveryRecovery.ts
  │     └── markDigestFailed()
  │           └── enqueueRetry()   ← deliveryRecovery.ts
  └── recordDelivery()             ← deliveryMetrics.ts
```

---

## Delivery Recovery Module

**File:** `services/delivery/deliveryRecovery.ts`

### Heartbeat

- Records server liveness every delivery cycle
- `getHeartbeat()` returns uptime, start time, total heartbeats

### Digest Persistence

- Every digest is persisted in memory BEFORE sending
- Status transitions: `pending` → `delivered` | `failed`
- Ring buffer: max 48 digests (~24h at 2/day)
- Future: swap backing store to PostgreSQL `digests` table

### Retry Queue

- Failed deliveries are enqueued automatically
- Retry delays: 1 min → 5 min → 15 min (3 attempts max)
- `getDueRetries()` returns retries ready to execute
- Future: implement retry worker that calls `channel.send()` automatically

### Missed Window Detection

- Detects delivery windows (07:00 and 18:00 ICT) that were missed
- A missed window is any scheduled delivery not found in history within ±1 hour
- `checkForMissedWindows()` records and returns new missed windows

### Recovery Snapshot

Available at `GET /api/delivery/recovery`:
```json
{
  "heartbeat": { "serverStartedAt", "uptimeSeconds", "totalHeartbeats" },
  "pendingDigests": 0,
  "failedDigests": 0,
  "retryQueueLength": 0,
  "dueRetries": 0,
  "recentMissedWindows": [],
  "overallHealthy": true
}
```

---

## Briefing Types

| Type | Trigger | Format | Articles | Budget |
|---|---|---|---|---|
| `morning` | 07:00 ICT | Full briefing | 4–12 | DEFAULT (18k chars) |
| `evening` | 18:00 ICT | Recap | 4–12 | DEFAULT (18k chars) |
| `executive` | On-demand | 5-bullet | 3–6 | EXECUTIVE (8k chars) |
| `intelligence` | On-demand | Deep-dive | 5–8 | INTELLIGENCE (22k chars) |

---

## Delivery Preview (Task A)

Users can send any briefing type as a real Telegram message via:

```
POST /api/delivery/preview/send
{
  "botToken": "...",
  "chatId": "...",
  "briefingType": "morning" | "evening" | "executive" | "intelligence",
  "topicId": "ai"  // for intelligence type only
}
```

Available from `/settings/delivery/debug` in the UI.

---

## Analytics

Delivery analytics are available at:

- `GET /api/admin/analytics` — Full snapshot (Sprint 8 original)
- `GET /api/admin/delivery` — V2 expanded dashboard (Sprint 12)
- `GET /api/delivery/recovery` — Recovery + heartbeat status (Sprint 12)

The V2 dashboard adds:
- Token cost estimates
- Compression statistics
- Signal efficiency scores
- Retry rate tracking
- Recovery status integration

---

## Source Reliability Engine (Task E)

**File:** `services/news/sourceReliability.ts`

Tracks per-source quality signals:

| Signal | Description | Weight |
|---|---|---|
| `parseSuccessRate` | Fetch + parse success rate | 50% |
| `duplicateRate` | How often articles are duplicates | 25% |
| `qualityRate` | Articles with ≥200 char descriptions | 25% |

**Reliability tiers:**
- `reliable` (score ≥70): no penalty
- `unstable` (45–69): −8 signal score penalty
- `poor` (<45): −20 signal score penalty

Sources automatically recover as new successful fetches are recorded.

---

## Limitations

- Retry worker is **not yet active** — retries are queued but not automatically executed
- Missed window detection is in-memory — resets on restart
- All recovery state is lost on server restart (pre-PostgreSQL)

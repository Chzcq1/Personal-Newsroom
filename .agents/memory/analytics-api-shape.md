---
name: Analytics API Shape
description: Actual shape of /api/admin/analytics response — differs from what the frontend originally assumed
---

The `/api/admin/analytics` route returns:
```json
{
  "ok": true,
  "snapshot": {
    "users": { "total": N, "dau": N, "wau": N, "mau": N },
    "deliveries": { "total": N, "delivered": N, "failed": N, "successRate": N, "queuePending": N, "queueFailed": N },
    "events": { "last24h": { "total": N, "byType": {} }, "last7d": { "total": N, "byType": {} } },
    "generatedAt": "ISO string"
  }
}
```

**Why:** The frontend's `DeliverySection` in `intelligence-center.tsx` was written expecting `data.stats.totalDeliveries` etc., but the real API returns `data.snapshot.deliveries.total`. This caused a crash (`s.totalDeliveries is undefined`).

**How to apply:** Any frontend code reading from this endpoint must use `data.snapshot.deliveries.*`, not `data.stats.*`. Alert stats are a separate endpoint: `/api/admin/analytics/alerts` returns `{ alerts: Array<{ severity, message, metric }> }`.

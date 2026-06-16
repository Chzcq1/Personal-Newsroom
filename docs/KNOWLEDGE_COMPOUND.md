# Knowledge Compound System — Sprint 15 Task F

## Philosophy

"Users should feel better informed, not addicted."

The Knowledge Compound System measures the **compound value INFOX delivers** — time saved, noise filtered, signal accuracy — rather than streaks, points, or engagement metrics.

## Service

**File**: `artifacts/api-server/src/services/intelligence/knowledgeCompound.ts`

### What is tracked

Each session recorded via `recordCompoundSession()`:

| Field | Type | Description |
|-------|------|-------------|
| articlesDelivered | number | Articles included in briefing |
| articlesFiltered | number | Noise suppressed by precision filter |
| briefingType | string | morning/evening/executive/intelligence |
| signalRatio | 0–1 | Fraction of high-signal articles |
| wasSaved | boolean | User saved this briefing |
| alertsDelivered | number | Priority alerts sent |
| narrativesTracked | number | Ongoing stories followed |

### Time savings model

```
minutesSaved =
  articlesFiltered × 4 min (value of skipping noise)
  + sessions × 6.5 min (reading briefing vs. raw feeds)
```

Assumptions:
- Average time to read one article: 8 minutes
- Average time to read one INFOX briefing: 1.5 minutes
- Value of not reading irrelevant noise: ~4 minutes per article

### Compound insight (Thai)

Auto-generated one-line summary in Thai:
- "สัปดาห์นี้ INFOX ช่วยประหยัดเวลาของคุณได้ X ชั่วโมง"
- "กรองข่าวที่ไม่จำเป็นออก X% เหลือเฉพาะสัญญาณที่สำคัญ"

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/intelligence/compound` | GET | Weekly summary + rate |
| `/api/intelligence/compound/weekly` | GET | Daily breakdown for past 7 days |
| `/api/intelligence/compound/session` | POST | Record a new session |

Query params: `?days=7` (7, 14, or 30)

## Frontend

**URL**: `/settings/intelligence-score`

Displays:
- Hero metric: estimated hours saved this week
- Signal accuracy rate badge
- Noise filtered count + percentage
- High-value reads (saved briefings)
- Narratives followed
- Daily bar chart (amber = time saved, cyan = noise filtered)
- Period selector: 7 / 14 / 30 days

Linked from Settings page under Tools section.

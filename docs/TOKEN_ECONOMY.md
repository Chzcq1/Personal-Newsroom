# TOKEN ECONOMY — INFOX Sprint 12 Task H/L

## Overview

The token economy layer controls how AI context budget is allocated across articles in each briefing. High-value stories consume more resources; low-value stories consume less or are excluded entirely.

---

## Architecture

```
Raw articles (ranked by signal score)
  │
  ▼
deduplicateNarratives()    ← removes same-story duplicates before AI
  │
  ▼
compressArticleBatch()     ← Article Compression V2 (sentence-level)
  │
  ▼
allocatePriorityBudget()   ← signal-tier-based char budgets per article
  │
  ▼
AI call                    ← operates on compressed, budgeted content
  │
  ▼
recordTokenUsage()         ← tracks for analytics
```

---

## Article Compression V2

**File:** `services/news/articleCompressionV2.ts`

### Strategy

V2 replaces simple truncation with sentence-level extraction:

1. Clean boilerplate (HTML, navigation, legal text, tracking pixels)
2. Split description into sentences
3. Score each sentence for information density:

| Signal | Score Bonus | Examples |
|---|---|---|
| Numbers/percentages | +30 | "revenue fell 23%", "$4.5 billion" |
| Quotes/statements | +25 | `"said"`, `"announced"`, `"warned"` |
| Action verbs | +20 | launch, acquire, invest, ban, regulate |
| Consequence language | +15 | "as a result", "due to", "therefore" |
| Named entities | +10 | "Apple Corp", "Federal Reserve" |

4. Select highest-scoring sentences up to per-article budget
5. Reconstruct in original order (preserves narrative coherence)

### Results

Typical compression: **40–60% token reduction** vs V1.
V1 reduced 60–80% overall (by truncation). V2 reduces 40–60% but keeps **higher-density content**.

---

## Signal Tiers and Budgets

| Tier | Char Budget | Included By Default |
|---|---|---|
| `critical` | 800 chars | Always |
| `high` | 600 chars | Always |
| `medium` | 350 chars | Always |
| `low` | 150 chars | Only if below minimum article count |

---

## Budget Configurations

| Config | Max Chars | Max Articles | Use Case |
|---|---|---|---|
| `DEFAULT_BUDGET` | 18,000 | 12 | Morning/Evening briefings |
| `EXECUTIVE_BUDGET` | 8,000 | 6 | Executive 5-bullet briefings |
| `INTELLIGENCE_BUDGET` | 22,000 | 15 | Deep-dive intelligence briefings |

---

## Narrative Deduplication

Before the AI call, `deduplicateNarratives()` removes duplicate articles:

- Uses 4-word title key after stopword removal
- Keeps the article with the **longest description** (most informative version)
- Typically removes 15–30% of articles in high-overlap news cycles

Example:
```
"Fed raises interest rates by 25bps"    → kept (longest description)
"Federal Reserve hikes rates 25 basis" → removed (duplicate narrative)
```

---

## Token Usage Tracking

Every AI call records:
- Input characters (compressed)
- Output characters (briefing text)
- Estimated token counts (chars ÷ 4)
- Estimated cost (OpenAI GPT-4o-mini pricing as reference)
- Compression percentage

Available at `GET /api/admin/delivery` → `tokenStats`.

---

## Cost Model

Token costs are estimated using OpenAI GPT-4o-mini pricing as a reference benchmark:

| Type | Rate |
|---|---|
| Input tokens | $0.00015 / 1k |
| Output tokens | $0.0006 / 1k |

**Note:** INFOX currently uses GitHub Models (free tier). These estimates are for future planning when migrating to paid providers.

---

## Optimization Results (Sprint 12)

Compared to Sprint 8 baseline:

| Metric | Sprint 8 | Sprint 12 |
|---|---|---|
| Max chars to AI | 24,000 | 18,000 (default) |
| Deduplication | Title-key (5 words) | Title-key (4 words) + entity overlap |
| Per-article budget | Flat truncation | Signal-tier-proportional |
| Low-signal filtering | After collection | Before AI, at budget stage |

Estimated token savings vs Sprint 8: **~25–40%** while maintaining or improving briefing quality.

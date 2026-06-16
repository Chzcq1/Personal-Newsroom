# Precision Intelligence Layer — Sprint 15

## Overview

Sprint 15 adds two new services that transform the article collection pipeline from a simple RSS reader into a signal-first intelligence system.

## Architecture

```
RSS Feeds
    │
    ▼
newsCollectorService.ts
    │  (URL deduplication)
    ▼
precisionFilter.ts          ← NEW: Sprint 15 Task A
    │  Removes noise, crypto downgrade, weak matches
    ▼
signalPriorityEngine.ts     ← NEW: Sprint 15 Task B
    │  7-factor ranking
    ▼
Near-duplicate suppression + source diversity
    │
    ▼
AI Summarization (top 10 articles)
```

## precisionFilter.ts

**File**: `artifacts/api-server/src/services/intelligence/precisionFilter.ts`

### What it does

Scores each article on 4 dimensions:
1. **Entity importance** — entities weighted by importance tier (CEO=3.0x, product=2.5x, company=2.0x)
2. **Topic purity** — what fraction of the article is actually *about* the topic (vs. incidental mention)
3. **Source trust** — Tier A=1.0, Tier B=0.70, Tier C=0.35
4. **Cross-source bonus** — +20 points if a Tier A/B source confirms the same story

### Crypto downgrade logic

Articles matching crypto keywords from a crypto-native source (CoinDesk, CoinTelegraph, etc.) are **suppressed unless** a non-crypto, non-Tier-C source also covers the same story.

This eliminates the noise of speculative crypto content from low-trust sources appearing in feeds.

### Output

```typescript
interface PrecisionScore {
  totalScore: number;          // 0–100
  entityImportanceScore: number;
  topicPurityScore: number;
  sourceTrustScore: number;
  crossSourceBonus: number;
  decayMultiplier: number;
  hitEntities: string[];
  isSuppressed: boolean;
  suppressionReason?: string;
  isCryptoDowngraded: boolean;
}
```

### Suppression thresholds

- `SUPPRESSION_THRESHOLD = 12` — articles scoring below this with no entity hits are removed
- `CRYPTO_CONFIRMATION_THRESHOLD = 20` — crypto articles need this score minimum without confirmation

## signalPriorityEngine.ts

**File**: `artifacts/api-server/src/services/intelligence/signalPriorityEngine.ts`

### What it does

Replaces the simple `recency + quality + diversity` sort with a 7-factor priority model. The key principle: **"Important things surface automatically."**

### 7 Priority Factors

| Factor | Max Score | Description |
|--------|-----------|-------------|
| Impact | 30 | Market/geopolitical significance (critical/high/medium terms) |
| Acceleration | 20 | Story gaining velocity (multi-source confirmation within 3h) |
| EntityImportance | 20 | High-importance named entities in article |
| NarrativePersistence | 15 | Story references ongoing narrative (continuation markers) |
| SourceTrust | 30 | Tier A=30, Tier B=18, Tier C=5 |
| RelevanceConfidence | 20 | Derived from precisionFilter score (0–100 → 0–20) |
| Recency | 15 | Tie-breaker only — NOT the primary factor |

**Total maximum: 150 points**

### Priority labels

- `critical` ≥ 100
- `high` ≥ 70
- `medium` ≥ 40
- `low` < 40

### Sort order

Critical/high articles always come before medium/low regardless of recency. Within the same label tier, sorted by total score descending.

## Integration

### newsCollectorService.ts changes

The pipeline now runs:
1. RSS fetch + URL deduplication (unchanged)
2. `applyPrecisionFilter()` — noise removal, at least 4 articles kept
3. `rankBySignalPriority()` — 7-factor sort
4. Near-duplicate suppression + source diversity (unchanged)
5. `MAX_ARTICLES_FOR_AI = 10` cap

The `CollectionResult` interface now includes:
- `suppressedCount` — number of articles removed by precision filter
- `cryptoDowngradedCount` — crypto articles that were downgraded

### API response

`POST /api/news/summarize` now returns a `signalStats` field:
```json
{
  "signalStats": {
    "suppressedCount": 8,
    "cryptoDowngradedCount": 3,
    "totalCollected": 45,
    "signalRatio": 0.82
  }
}
```

### Frontend

The home.tsx briefing card header shows a small "X filtered" badge when `suppressedCount > 0`, letting users see the noise that was removed on their behalf.

# SOURCE_TRUST_SYSTEM.md — Sprint 18 Task B

## Overview

INFOX now tracks per-source trust scores that gate AI attention allocation. Not all sources receive equal treatment — the trust engine learns which sources deliver high-signal content vs. clickbait and noise.

## Architecture

### sourceTrustEngine.ts

Located at `artifacts/api-server/src/services/intelligence/sourceTrustEngine.ts`

### Trust Score (0–100)

Composite of 6 weighted sub-scores:

| Factor | Weight | Description |
|--------|--------|-------------|
| Factual Consistency | 25% | Cross-source confirmation rate |
| Signal Quality | 25% | High-impact signal frequency |
| Noise Ratio (inverted) | 15% | Proportion of low-signal articles |
| Clickbait Likelihood (inverted) | 15% | Clickbait pattern detection rate |
| Delivery Usefulness | 10% | Articles actually used in briefings |
| User Engagement Quality | 10% | Articles opened/saved by user |

### Stability Classes

| Class | Score Range | Behavior |
|-------|------------|---------|
| `tier_one` | 85–100 | Maximum AI attention |
| `reliable` | 70–84 | High priority ranking |
| `mixed` | 50–69 | Standard treatment |
| `unreliable` | 30–49 | Reduced AI attention |
| `toxic` | < 30 | Excluded from AI processing |

## Clickbait Detection

Pattern library of 14+ regex patterns including: "won't believe", "shocking", "JUST IN", "goes viral", etc.

Heavy clickbait sources (5+ detections in last 20 articles) get `isClickbaitHeavy = true` flag.

## Crypto Noise Detection

Sources with heavy crypto promotion language (moon, hodl, pump, dump, rugpull, etc.) get `isCryptoHeavy = true` flag and noise ratio penalization.

## Temporal Decay

Sources that haven't published recent articles decay at 2%/day until they're observed again. Floor: trust score cannot decay below 30. This prevents stale sources from holding high trust indefinitely.

## Integration Points

- **sourcePriorityOrchestrator.ts** — trust score is the highest-weight factor (30%) in source ranking
- **signalPriorityEngine.ts** — trust tier (A/B/C) already used for SourceTrust factor
- **newsCollectorService.ts** — future: filter toxic sources at collection time

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/source-trust` | GET | Full trust snapshot + all profiles |
| `/api/admin/source-trust/decay` | POST | Manually trigger decay calculation |

## Admin Page

`/admin/source-trust` — visual dashboard showing trust scores, stability distribution, sub-score bars, and misinfo flags.

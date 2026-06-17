# AI Pipeline — Multi-Layer Intelligence Processing

Sprint 17 introduces a **3-layer AI pipeline** that routes intelligence work to the cheapest capable processing tier, reserving expensive LLM calls for genuinely high-value signals.

## The Problem

Without a pipeline:
- Every article triggers an expensive LLM call
- Low-value signals consume the same budget as critical narratives
- Token costs scale linearly with article volume

With the pipeline:
- 60–80% of articles are handled by cheap rule-based processing (Layer 1)
- 15–25% receive mid-tier AI summaries (Layer 2)
- Only 5–15% of articles — the highest-signal ones — get premium LLM processing (Layer 3)

## The Three Layers

### Layer 1 — Cheap Processing (no LLM)
- Deduplication (normalised title key)
- Entity extraction (keyword pattern matching)
- Topic classification (regex classifiers)
- Signal score calculation (heuristics)
- Noise pattern rejection (crypto spam filters)

**Cost: zero** — pure TypeScript, no API calls.

### Layer 2 — Mid Intelligence (small/fast models)
- Narrative labeling
- Topic grouping
- Relevance explanations
- Contextual summaries (brief)

**Cost: low** — cheap/fast models only, capped at 300 tokens per article.

### Layer 3 — Premium Intelligence (large models, gated)
- Strategic insights
- Executive briefings
- Action intelligence
- Full narrative analysis

**Cost: high** — only for articles where `signalScore >= premiumThreshold`.

## Escalation Gates

Before promoting an article to Layer 3, the pipeline checks:

1. **Degradation level** — Level 3/4 blocks all premium calls
2. **Token budget** — If `budgetFraction >= 0.85`, premium calls are blocked
3. **Signal score** — Must exceed the mode-specific threshold:
   - Safe mode: 75
   - Balanced mode: 60
   - Raw mode: 45
4. **Session budget** — Per-request cap prevents runaway spending

## Implementation

**Service**: `artifacts/api-server/src/services/intelligence/aiPipeline.ts`

```typescript
const results = processBatchThroughPipeline(articles);
const premiumOnly = filterForPremiumProcessing(results);
const estimatedCost = estimateBatchTokenCost(results);
```

## Integration Points

| System | Integration |
|--------|-------------|
| Token Governor | Reads `pressureLevel` to gate premium calls |
| Degradation Engine | Reads `degradationLevel` for hard blocks |
| Signal Mode Engine | Reads `signalMode` for threshold adjustment |
| Compression Engine | Reads pipeline decisions to shape briefing depth |

## API Endpoint

`GET /api/admin/pipeline` — Returns current pipeline stats including degradation level, token pressure, and premium threshold.

# Token Governor V2

Sprint 17 introduces the **Token Governor** — a hard-limit budget enforcement layer that sits above the existing `tokenEconomy.ts` usage tracker.

## Problem

The existing `tokenEconomy.ts` (Sprint 12) tracks token usage and reports costs. But it has no enforcement:

- No hard limits — usage can exceed budget silently
- No automatic degradation trigger
- No per-feature tracking
- No session cap

The Token Governor closes these gaps.

## Budget Tiers

| Tier | Daily Tokens | Session Cap | Premium Fraction |
|------|-------------|-------------|-----------------|
| `free` | 50,000 | 4,000 | 40% |
| `standard` | 200,000 | 8,000 | 50% |
| `unlimited` | 2,000,000 | 20,000 | 70% |

The **Premium Fraction** limits what fraction of the daily budget can be spent on Layer 3 (premium LLM) calls.

## Pressure Levels

| Level | Budget Fraction | Effect |
|-------|----------------|--------|
| `normal` | < 70% | Full premium pipeline |
| `moderate` | 70–85% | Standard briefings (no action insights) |
| `high` | 85–95% | Compact delivery, no strategic context |
| `critical` | 95–98% | Minimal delivery only |
| `exhausted` | ≥ 100% | Emergency mode — layer 1 only |

## Automatic Degradation

When budget pressure rises, the Token Governor automatically triggers degradation:

```
75% used → Degradation Level 1 (reduced depth)
85% used → Degradation Level 2 (economy mode)
95% used → Degradation Level 3 (delivery only)
98% used → Degradation Level 4 (emergency)
```

This happens automatically via `recordGovernorUsage()` — no manual intervention required.

## Usage

```typescript
import { canSpend, recordGovernorUsage, getTokenGovernorState } from
  "@/services/intelligence/tokenGovernor";

// Before any AI call:
if (!canSpend(estimatedTokens, "layer3")) {
  // Downgrade to layer2 or skip
  return;
}

// After the AI call completes:
recordGovernorUsage({
  tokens: actualTokensUsed,
  feature: "strategic_context",
  narrativeId: "narrative-123",
  signalMode: "balanced",
  tier: "layer3",
});
```

## API

`GET /api/admin/token-governor` — Returns full budget snapshot including pressure level, feature breakdown, and top narrative consumers.

## Files

- Governor: `artifacts/api-server/src/services/intelligence/tokenGovernor.ts`
- Integration: called by `aiPipeline.ts` and `summaryService.ts`

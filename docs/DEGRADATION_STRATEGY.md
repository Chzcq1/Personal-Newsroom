# Degradation Strategy V2

Sprint 17 introduces the **Degradation Engine** — a 5-level intelligent quality-reduction system that keeps INFOX operational when AI costs spike, external APIs degrade, or token budgets run low.

## Why Degradation Exists

AI-powered news briefings have a cost floor: if OpenAI or GitHub Models becomes unavailable or too expensive, the system must not silently fail. Users should receive something useful at every degradation level.

## The 5 Levels

| Level | Label | Max Articles | Summary Chars | Strategic Context | Action Insights |
|-------|-------|-------------|---------------|-------------------|----------------|
| 0 | Normal | 10 | 4,000 | ✅ | ✅ |
| 1 | Reduced | 8 | 2,500 | ✅ | ❌ |
| 2 | Economy | 5 | 1,500 | ❌ | ❌ |
| 3 | Delivery Only | 3 | 800 | ❌ | ❌ |
| 4 | Emergency | 2 | 400 | ❌ | ❌ |

At Level 4, INFOX uses headline-only summaries — no LLM calls at all.

## Automatic Evaluation

The system auto-evaluates every 15 minutes using:

1. **Token budget** (from Token Governor): `> 98% used → Level 4`, `> 95% → Level 3`, etc.
2. **AI provider health**: If the provider returns errors repeatedly → escalate level
3. **Source reliability**: If most RSS sources are timing out → Level 2+

Auto-evaluation only escalates. Reduction must be done manually or by clearing the override.

## Manual Override

Admin operators can override the degradation level via API:

```http
POST /api/admin/degradation
{ "level": 2, "reason": "Planned cost reduction during off-peak" }
```

Manual overrides persist until explicitly cleared:

```http
DELETE /api/admin/degradation
```

## Degradation History

The engine tracks the last 100 level changes with timestamps and reasons:

```http
GET /api/admin/degradation
```

## Integration Points

| System | How Degradation Affects It |
|--------|---------------------------|
| AI Pipeline | Blocks premium layer calls at level 3+ |
| Compression Engine | Selects `minimal` or `emergency` profile |
| Token Governor | Triggers level changes via `recordGovernorUsage()` |
| Delivery Scheduler | At level 4, uses cached headlines only |

## Files

- Engine: `artifacts/api-server/src/services/intelligence/degradationEngine.ts`
- Admin route: `GET/POST/DELETE /api/admin/degradation`

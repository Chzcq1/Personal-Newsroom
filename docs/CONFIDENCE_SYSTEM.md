# Confidence Scoring System

Sprint 16 introduced a five-tier confidence scoring system that assigns every article and cluster a numeric score (0–100) along with a named **signal class**.

## Signal Classes

| Class | Score Range | Meaning |
|-------|-------------|---------|
| `experimental` | 0–19 | Unverified — single source, no confirmation |
| `early_signal` | 20–39 | Emerging — limited confirmation, watch closely |
| `developing` | 40–59 | Story developing — multi-source, not yet confirmed |
| `confirmed` | 60–79 | Confirmed signal — broad source agreement |
| `established` | 80–100 | High-confidence, fully established story |

## Scoring Algorithm

The `scoreConfidence()` function evaluates six independent signals and aggregates them into a single score:

1. **Source diversity** — how many independent outlets cover the story
2. **Source tier** — whether sources are Tier A (premium wire), B (regional), or C (aggregators)
3. **Temporal freshness** — how recent the latest article is
4. **Entity confirmation** — whether named entities are cross-confirmed across sources
5. **Narrative coherence** — whether the story fits a known narrative thread
6. **Signal class baseline** — minimum score floor set by the declared signal class

Each signal contributes weighted points. The final score is capped at 100.

## Cluster Confidence

When scoring an article cluster (multiple articles on the same story), `scoreClusterConfidence()` aggregates individual article scores with diversity bonuses for:
- Multiple Tier A sources
- Articles from different geographies
- Consistent entity mentions across the cluster

## Usage

```typescript
import { scoreConfidence, scoreClusterConfidence, SIGNAL_CLASS_CONFIGS } from
  "@/services/intelligence/confidenceScoring";

const result = scoreConfidence(article, signalClass);
// → { score: 72, signalClass: "confirmed", signals: [...], breakdown: {...} }

const clusterResult = scoreClusterConfidence(articles);
// → { score: 85, signalClass: "established", ... }
```

## Frontend Display

The confidence score and signal class badge appear on every briefing card in the feed. Badge colours are defined in `SIGNAL_CLASS_CONFIGS`:

- `experimental` → zinc/grey
- `early_signal` → yellow
- `developing` → blue
- `confirmed` → emerald
- `established` → violet

## Integration with Signal Mode

Signal Mode interacts with confidence scoring at the feed-ranking stage. In **Safe** mode, only `confirmed` and `established` articles pass the ranking filter. In **Balanced** mode, `developing` and above are accepted. In **Raw Signal** mode, all classes including `experimental` are shown.

## Files

- Engine: `artifacts/api-server/src/services/intelligence/confidenceScoring.ts`
- Priority integration: `artifacts/api-server/src/services/intelligence/priorityHierarchy.ts`
- Signal mode gate: `artifacts/api-server/src/services/intelligence/signalModeEngine.ts`

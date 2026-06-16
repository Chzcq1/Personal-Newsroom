# Compression Engine V2

Sprint 17 introduces the **Compression Engine** — an adaptive delivery system that reduces token consumption by shaping briefings to match current system pressure.

## Problem

When token budgets are tight or the AI pipeline is degraded, INFOX should deliver a shorter, focused briefing — not fail silently.

Previously: no structured compression — either full briefing or nothing.
Now: 5 compression tiers with smooth transitions.

## Compression Tiers

| Tier | Articles | Summaries | Strategic Context | Action Insights | Read Time |
|------|---------|-----------|-------------------|----------------|-----------|
| `full` | 10 | 4,000 chars | ✅ | ✅ | ~5 min |
| `standard` | 8 | 2,800 chars | ✅ | ❌ | ~4 min |
| `compact` | 5 | 1,600 chars | ❌ | ❌ | ~2 min |
| `minimal` | 3 | 800 chars | ❌ | ❌ | ~1 min |
| `emergency` | 2 | 400 chars | ❌ | ❌ | ~30 sec |

## Profile Selection

The compression profile is selected automatically based on priority order:

1. **Degradation level** (highest priority)
   - Level 4 → `emergency`
   - Level 3 → `minimal`
   - Level 2 → `compact`
   - Level 1 → `standard`

2. **Token pressure**
   - `exhausted` → `emergency`
   - `critical` → `minimal`
   - `high` → `compact`
   - `moderate` → `standard`

3. **Signal mode**
   - `safe` → `full` (6 articles, deeper analysis)
   - `raw` → `standard` (12 articles, shallower per article)
   - `balanced` → `full` (default)

4. **Default** → `full`

## Content Compression Algorithm

When a summary must be compressed to fit within the char limit, the engine uses information-density scoring:

1. Split text into sentences
2. Score each sentence: numbers (+10), action verbs (+8), financial quantities (+7), length (+3)
3. Greedily add highest-scoring sentences until char limit is reached
4. Result: preserves most informative sentences, drops fluff

```typescript
const compressed = compressToProfile(originalSummary, profile.maxSummaryChars);
```

## Signal Density Analytics

After compression, you can measure what was retained:

```typescript
const analysis = analyzeCompression(original, compressed);
// analysis.raw: original density score
// analysis.compressed: post-compression density score
// analysis.retainedRatio: fraction of original length kept
```

## Usage

```typescript
import { selectCompressionProfile } from "@/services/delivery/compressionEngine";

// Call once per delivery request
const profile = selectCompressionProfile();

// Use profile.maxArticles to slice article list
const articles = allArticles.slice(0, profile.maxArticles);

// Use profile.maxSummaryChars to trim each summary
for (const article of articles) {
  article.summary = compressToProfile(article.summary, profile.maxSummaryChars);
}
```

## File

`artifacts/api-server/src/services/delivery/compressionEngine.ts`

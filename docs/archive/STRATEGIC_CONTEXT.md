# Strategic Context Layer

Sprint 16 introduces **Strategic Context** — a personalised explanation of _why_ a story matters to _this specific user_, not just what happened.

## The Problem

Standard news summaries answer "what happened." Strategic context answers:

- **Why does this matter to me?**
- **What is the second-order effect?**
- **What has changed since yesterday?**

Without strategic context, users must do this analysis themselves — defeating the purpose of an AI newsroom.

## How It Works

The `generateStrategicContext()` function in `strategicContext.ts` performs a five-step analysis:

### Step 1 — Interest Alignment
Maps the article's entities and topic category against the user's interest profile (`getInterests()`) and the adaptive interest graph. Calculates a personalisation score indicating how directly relevant the story is.

### Step 2 — Narrative Positioning
Queries `narrativeMemory` to check if the story belongs to a known narrative thread. If it does, it generates:
- The thread's current maturity stage (emerging / developing / peaking)
- How this article moves the narrative forward
- Whether it confirms, extends, or contradicts the established storyline

### Step 3 — Entity Impact Assessment
Using the entity memory, assesses the current momentum of key entities in the article:
- Entities with rising momentum → "accelerating development"
- Entities with stable momentum → "ongoing situation"
- Entities with declining momentum → "potential resolution"

### Step 4 — Second-Order Implication
Derives the downstream effect based on the topic category and entity type:
- Financial entities → portfolio/market implications
- Tech entities → competitive/supply-chain implications
- Geopolitical entities → trade/currency/regulatory implications

### Step 5 — Personalised "Why This Matters" Statement
Synthesises steps 1–4 into a concise, first-person explanation (2–4 sentences) delivered in Thai.

## The Strategic Context Contract

```typescript
interface StrategicContext {
  relevanceScore: number;          // 0–100: personalisation fit
  whyItMatters: string;            // Thai — personalised explanation
  narrativePosition: string | null;// e.g. "developing narrative — Day 3"
  secondOrderEffect: string | null;// Thai — downstream implication
  changeFromYesterday: string | null; // what is new vs previous briefings
  personalisation: {
    alignedInterests: string[];    // user interests that match
    directlyAffectsWatchlist: boolean;
  };
}
```

## Integration

Strategic context is the **second section** in Briefing Formatter V3:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ WHY THIS MATTERS TO YOU
━━━━━━━━━━━━━━━━━━━━━━━━━━
[personalised strategic context here]
```

In the Telegram formatter, it appears after the headline signal block and before the key signals list.

## Personalisation Engine

The strategic context leverages the adaptive interest engine (`adaptiveInterestEngine.ts`) to weight explanations toward the user's demonstrated engagement patterns. Topics and entities the user has opened, saved, or rated positively receive higher relevance scores and more detailed second-order analysis.

## Files

- Engine: `artifacts/api-server/src/services/intelligence/strategicContext.ts`
- Prompt builder: integrated into `buildIntelligenceBriefingPrompt()` in `promptBuilder.ts`
- Formatter: `artifacts/api-server/src/services/delivery/briefingFormatterV3.ts`

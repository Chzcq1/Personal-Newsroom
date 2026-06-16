# TOKEN_SURVIVAL.md — Sprint 18 Task F

## Overview

INFOX must sustain 1000+ users without catastrophic AI cost. The Token Survival Engine implements five complementary strategies that reduce AI spend while preserving intelligence quality.

## Architecture

### tokenSurvivalEngine.ts

Located at `artifacts/api-server/src/services/intelligence/tokenSurvivalEngine.ts`

## Survival Modes

| Mode | Max Prompts/hr | Max Tokens/Prompt | Escalation Min Score | Activated When |
|------|---------------|-------------------|---------------------|----------------|
| `normal` | 200 | 6000 | 0 (all) | Healthy budget |
| `efficient` | 150 | 4500 | 20 | Moderate pressure |
| `frugal` | 80 | 3000 | 40 | Elevated pressure |
| `survival` | 30 | 2000 | 60 | High pressure |
| `emergency` | 5 | 1500 | 80 | Critical / degradation 4 |

Mode is evaluated automatically from `tokenGovernor` + `degradationEngine` state.

## Strategy 1: Memoization

`checkMemo(promptContent)` / `storeMemo(promptContent, output)`

- Hash-based content deduplication (no crypto — fast string hash)
- TTL: 30 minutes in normal mode, 2 hours in survival/emergency
- Store size cap: 300 entries (LRU eviction)
- Saves ~1500 tokens per cache hit

## Strategy 2: Duplicate Suppression

`isDuplicatePrompt(topicId, promptContent)`

- 15-minute window per topic
- Identical prompts within window are blocked
- Each suppressed duplicate saves ~1500 tokens

## Strategy 3: Signal Escalation Gate

`shouldEscalateToAI(signalScore)`

- Only articles above `escalationMinScore` get full AI treatment
- In survival mode: only score 60+ articles get AI
- In emergency mode: only score 80+ articles get AI

## Strategy 4: Prompt Shrinking

`shrinkPrompt(prompt, maxChars)`

- Progressive trimming of non-critical sections
- Preserves: HEADLINE, EXECUTIVE, CRITICAL, Thai instructions
- Removes least-important lines until under budget

## Strategy 5: Waste Event Tracking

Tracks and records:
- `duplicate_generation` — same prompt within 15 min
- `low_signal_ai_call` — article below escalation threshold
- `unnecessary_regen` — cached result ignored
- `expensive_entity_cluster` — entity-heavy prompts
- `repeated_prompt_pattern` — same prompt pattern recurring

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/token-survival` | GET | Survival stats + memo stats |

## Integration with Sprint 17

Builds on top of:
- `tokenGovernor.ts` — budget tracking + pressure levels
- `degradationEngine.ts` — degradation level (0–4)
- `aiPipeline.ts` — 3-layer AI routing (cheap → mid → premium)

## Future Improvements (Sprint 19)

- Per-user token budget tracking
- Narrative reuse (use cached summaries for related articles)
- Semantic dedup (cosine similarity on embeddings, not just hash)

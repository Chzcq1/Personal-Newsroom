# THAI_LOCALIZATION.md — Sprint 18 Task A

## Overview

INFOX delivers Thai-language briefings but historically allowed significant English leakage in AI-generated outputs. Sprint 18 introduces a dedicated Thai Localization Engine that enforces native Thai quality standards.

## Architecture

### thaiLocalizationEngine.ts

Located at `artifacts/api-server/src/services/intelligence/thaiLocalizationEngine.ts`

**Core functions:**

| Function | Purpose |
|----------|---------|
| `analyzeLocalization(text)` | Measure Thai ratio, detect leakage, score readability |
| `repairLocalization(text)` | Fix verbose starters, clean up leakage |
| `postProcessBriefing(text)` | Full post-processing pipeline |
| `buildLocalizationInstruction()` | Inject enforcement into AI prompts |
| `refineThaiHeadline(headline)` | Normalize headline format |
| `recordLocalizationResult()` | Track stats for admin visibility |

### LocalizationConfidence levels

| Level | Thai Ratio | Description |
|-------|-----------|-------------|
| `native` | ≥ 90% | Production-grade Thai output |
| `acceptable` | 75–90% | Minor English present, still readable |
| `degraded` | 50–75% | Noticeable English leakage |
| `poor` | 30–50% | Significant English sections |
| `failed` | < 30% | Essentially English output |

## Preserved Brand Names

The following terms are NEVER translated — they remain in English in all Thai briefings:

**AI/Tech:** OpenAI, Anthropic, Nvidia, NVIDIA, Google, Meta, Microsoft, Apple, Amazon, Tesla, SpaceX, GPT-4, GPT-5, ChatGPT, Claude, Gemini, Llama, Grok, Copilot, Midjourney

**Finance:** BlackRock, Vanguard, JPMorgan, Goldman Sachs, S&P, Nasdaq, NYSE, Fed, ECB

**Crypto:** Bitcoin, BTC, Ethereum, ETH, Solana, SOL, Binance, Coinbase

**Media:** Reuters, Bloomberg, FT, WSJ, NYT, CNN, BBC

## Prompt Integration

`buildLocalizationInstruction()` generates a Thai-language instruction block injected at the start of every AI prompt. It explicitly:

1. Requires Thai-only output
2. Lists preserved English brand names
3. Forbids translating well-known brand/product names
4. Requires natural Thai prose (not word-for-word translation)

## Repair Logic

When `repairPriority` is `medium` or higher, `repairLocalization()` applies:

1. **Verbose starter removal** — removes phrases like "ในปัจจุบัน", "โดยรวมแล้ว", "กล่าวโดยสรุป"
2. **Headline normalization** — converts "Breaking:" / "EXCLUSIVE:" to Thai equivalents
3. **Whitespace cleanup** — removes double spaces from removal artifacts

## Admin Endpoint

`GET /api/admin/localization` returns cumulative stats:
- Total briefings processed
- Count by confidence level (native/acceptable/degraded/poor/failed)
- Average Thai ratio
- Average English leak score
- Repair count

## Known Limitations

- Repair is text-based only — no actual re-translation
- Complex English paragraphs embedded mid-text require LLM re-generation to fix properly
- Thai ratio calculation counts Unicode characters in range U+0E00–U+0E7F

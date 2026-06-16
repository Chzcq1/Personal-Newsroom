# Telegram Formatting — Sprint 15 V2

## Overview

Sprint 15 (Task C) rewrites the Telegram briefing formatter to a **layered intelligence** structure that is scannable on mobile within 15 seconds.

## V1 vs V2

| Aspect | V1 (briefingFormatter.ts) | V2 (briefingFormatterV2.ts) |
|--------|--------------------------|---------------------------|
| Structure | Dense paragraph blocks | Layered: headline → 3 scan bullets |
| Section detection | 20+ header patterns | Auto-extracts 4 layers |
| Scan speed | ~90 seconds | ~15 seconds |
| Entity bolding | ✓ (same) | ✓ (same) |
| Number bolding | ✓ (same) | ✓ (same) |
| Format | Telegram HTML | Telegram HTML |
| Preview page | /delivery-preview | /settings/delivery/preview-live |

## V2 Format Structure

```
[ICON] [TOPIC TITLE]
[date / time subtitle]
[N sources · via FT, Bloomberg]

──────────────────────

[BOLD HEADLINE — first meaningful sentence]

◽ Executive summary / what happened
◽ Key implication / what changed
◽ Why this matters / broader significance

──────────────────────

[Extended content, max 8 lines]

──────────────────────
[📌 Link]  INFOX · HH:MM ICT
```

## Layer Extraction

The V2 formatter uses `extractLayers()` to parse the AI briefing into 4 layers:

1. **Headline** — first non-empty sentence, or line matching a section header
2. **Summary** — line containing "สรุป", "summary", or "executive"
3. **Implication** — line containing "ผลกระทบ", "implication", "impact"
4. **Why it matters** — line containing "สำคัญ", "matters", "why"

If no explicit markers are found, the first 4 meaningful lines (>20 chars) are distributed to the 4 layers.

## Signal Badges (Icons)

| Badge | Icon | Triggered by |
|-------|------|-------------|
| MORNING | 🌅 | Morning delivery |
| EVENING | 🌆 | Evening delivery |
| EXECUTIVE | 📊 | Executive mode |
| INTELLIGENCE | 🔍 | Intelligence briefing |
| ALERT | ⚡ | High-priority alert |
| Default | ◆ | Any other |

## Telegram HTML limitations

V2 preserves Telegram HTML (not MarkdownV2) because:
- MarkdownV2 requires escaping 18+ characters which is error-prone in Thai text
- HTML `<b>`, `<i>`, `<a>` are predictable and already working in production
- Thai text contains characters that conflict with MarkdownV2 syntax

## Preview Live

**URL**: `/settings/delivery/preview-live`

Features:
- Phone-frame mock showing exact Telegram bubble appearance
- 4 briefing type selectors (morning/evening/executive/intelligence)
- Raw Telegram HTML output (for debugging)
- "Send Test Digest" button that triggers `/api/telegram/send-test`
- Linked from Settings page

## Alert Format (V2)

Short single-article alerts use `formatAlertV2()`:
```
⚡ [BOLD HEADLINE]

[Summary with entity bolding]

via [Source] · HH:MM ICT
[อ่านต่อ → link]
```

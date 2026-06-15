---
name: Delivery Architecture
description: How automated Telegram delivery works — channel abstraction, scheduler, credentials flow.
---

## IDeliveryChannel interface
All delivery channels implement `IDeliveryChannel` in `telegramDelivery.ts`:
```typescript
interface IDeliveryChannel {
  name: string;
  verify(): Promise<boolean>;
  send(messages: string[]): Promise<ChannelDeliveryResult>;
}
```
`deliveryEngine.ts` only knows about this interface — never about Telegram specifically.

## Credentials split (intentional design)
- UI settings page → stores bot token + chat ID in **localStorage** → sent in API request body for test/send
- Scheduler → reads **env vars** `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` only
- This means: test/send works immediately from UI; scheduled delivery requires Replit Secrets

**Why:** Avoids a server-side settings store before login/auth is activated. localStorage is DB-migration-ready (lib/telegramSettings.ts interface maps directly to future API calls).

## Scheduler
`setInterval` (60 s poll), not node-cron — no extra package needed. Fires at 07:00 and 18:00 in `SCHEDULER_TIMEZONE` (default `Asia/Bangkok`). Memory-tracks `morning_YYYY-MM-DD` / `evening_YYYY-MM-DD` keys to prevent duplicates within a session.

## Morning/evening prompts
Both in `promptBuilder.ts` as `buildMorningBriefingPrompt(articles, topicLabels)` and `buildEveningBriefingPrompt(...)`. Called via `summarizeDelivery()` in `summaryService.ts` which uses `provider.complete()`.

## Telegram message format
HTML parse mode. `briefingFormatter.ts` replaces section headers (HEADLINE, TOP DEVELOPMENTS, etc.) with `<b>` tags and escapes all content. Messages > 4096 chars split at paragraph boundaries.

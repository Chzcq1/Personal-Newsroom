---
name: AI Provider Layer
description: How the AI abstraction works in Personal AI Newsroom — switching providers, adding new ones, and the dependency chain.
---

## Rule
`summaryService.ts` is the only entry point for AI. It NEVER imports a provider directly — only calls `createAIProvider()` from `aiProvider.ts`.

## How to switch providers
Change `AI_PROVIDER` env var only. No code changes needed.
- `github` → `GITHUB_TOKEN` required (default)
- `openai` → `OPENAI_API_KEY` required
- `gemini` → `GEMINI_API_KEY` required

## Dependency chain
```
summaryService.ts → aiProvider.ts (factory) → {githubProvider, openaiProvider, geminiProvider}
```

Providers are lazy-loaded via dynamic `import()` — only the active provider's SDK loads at startup.

## How to add a new provider
1. Create `services/ai/<name>Provider.ts` implementing `AIProvider` interface
2. Add name to `SupportedAIProvider` type in `config/env.ts`
3. Add credentials block to `config/env.ts`
4. Register in `createAIProvider()` switch in `aiProvider.ts`

**Why:** Project vision requires AI to be a swappable tool, not a hard dependency. Founder daily use requires reliability — if one provider fails, switching must take seconds not hours.

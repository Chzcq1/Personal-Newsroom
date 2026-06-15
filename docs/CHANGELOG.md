# CHANGELOG.md — Personal AI Newsroom V1

---

## [2026-06-15] — AI Provider Abstraction Layer

**What:** Built the complete AI integration layer with a provider abstraction that supports GitHub Models (default), OpenAI, and Google Gemini. The active provider is controlled entirely by the `AI_PROVIDER` environment variable — no code changes required to switch.

**Why:** The application must not be hard-coupled to any single AI vendor. Provider switching must be a configuration change, not a code change. This design also prepares the codebase for future AI agents (Reporter, Editor, Analyst) which will reuse the same `AIProvider` interface.

**Architecture decisions:**
- `summaryService.ts` is the single entry point — it never imports a provider directly
- `aiProvider.ts` acts as the factory — all provider registration happens here
- Provider modules are lazy-loaded so only the active provider's SDK initializes at startup
- `config/env.ts` is now the centralized env config — `process.env` is forbidden everywhere else

**Files created:**
- `artifacts/api-server/src/config/env.ts`
- `artifacts/api-server/src/services/ai/aiProvider.ts`
- `artifacts/api-server/src/services/ai/githubProvider.ts`
- `artifacts/api-server/src/services/ai/openaiProvider.ts`
- `artifacts/api-server/src/services/ai/geminiProvider.ts`
- `artifacts/api-server/src/services/ai/summaryService.ts`

**Files modified:**
- `docs/ARCHITECTURE.md` — added AI Provider Layer section
- `docs/CHANGELOG.md` — this entry

**Packages installed:** `openai`, `@google/generative-ai`

**Environment variables added:** `AI_PROVIDER=github` (shared), `GITHUB_TOKEN` (secret)

---

## [2026-06-15] — Project foundation

**What:** Created core documentation files for the project
**Why:** Establish project vision, architecture, and development rules before any code is written
**Files:**
- `docs/PROJECT_VISION.md` (created)
- `docs/ARCHITECTURE.md` (created)
- `docs/AGENT_RULES.md` (created)
- `docs/CHANGELOG.md` (created)

# ARCHITECTURE.md — Personal AI Newsroom V1

## Overview

Personal AI Newsroom is a modular web application where a user selects a news topic, the system collects relevant articles, an AI model summarizes them in Thai, and optionally delivers the summary to Telegram.

All modules are designed to be independently replaceable. Adding a new delivery channel, news source, or AI provider should require touching only one service file.

---

## Current System State (as of 2026-06-15 Sprint 2)

- Technology topic fixed: 6 RSS sources with reliable fallbacks (Ars Technica, TechCrunch, The Verge, Hacker News, Engadget, ZDNet)
- Intelligence briefing format: HEADLINE / EXECUTIVE SUMMARY / KEY DEVELOPMENTS / IMPACT ANALYSIS / WHAT TO WATCH NEXT
- Professional SVG icons via Lucide React (no emoji)
- Save Briefings: localStorage persistence, future-ready for DB migration
- User Preferences: last viewed topic restored on next visit
- Telegram delivery: architecture stub at `services/delivery/telegramService.ts`
- Per-feed diagnostics: every API response includes `debugInfo` with feed status, article count, duration, and error details
- Dev mode debug panel: surfaced in frontend when `import.meta.env.DEV` is true

---

## Project Structure

```
Personal-AI-Newsroom/
│
├── docs/
│   ├── PROJECT_VISION.md         # Product goals and success criteria
│   ├── ARCHITECTURE.md           # This file — system design and module map
│   ├── AGENT_RULES.md            # Rules for AI agents modifying this codebase
│   ├── CHANGELOG.md              # Feature history
│   └── LOGIN_PREPARATION.md      # Future login architecture (no implementation)
│
├── artifacts/newsroom/           # React + Vite frontend (port via PORT env)
│   └── src/
│       ├── App.tsx               # Wouter routing (/ and /saved routes)
│       ├── index.css             # Design tokens (colors, fonts)
│       ├── pages/
│       │   ├── home.tsx          # Topic grid + intelligence briefing display
│       │   ├── saved-briefings.tsx  # Saved briefings list + expand/delete
│       │   └── not-found.tsx
│       └── lib/
│           ├── briefingStorage.ts  # localStorage briefing persistence
│           └── preferences.ts      # localStorage user preferences
│
├── artifacts/api-server/         # Express backend (port via PORT env)
│   └── src/
│       ├── config/
│       │   ├── env.ts            # Centralized env config (ONLY place process.env is read)
│       │   └── topics.ts         # Topic definitions + RSS feed URLs + icon names
│       ├── routes/
│       │   ├── index.ts          # Route registry
│       │   ├── health.ts         # GET /api/healthz
│       │   ├── topics.ts         # GET /api/topics
│       │   └── news.ts           # POST /api/news/summarize (with specific error classification)
│       └── services/
│           ├── news/
│           │   ├── rssService.ts           # Fetch + parse single RSS feed, returns FeedResult
│           │   └── newsCollectorService.ts # Parallel aggregation + dedup + diagnostics
│           ├── ai/
│           │   ├── aiProvider.ts           # Provider interface + factory
│           │   ├── summaryService.ts       # ONLY entry point for AI calls
│           │   ├── promptBuilder.ts        # Shared prompts (800-1500 Thai words target)
│           │   ├── githubProvider.ts       # GitHub Models (default, max_tokens=3000)
│           │   ├── openaiProvider.ts       # OpenAI (max_tokens=3000)
│           │   └── geminiProvider.ts       # Google Gemini (maxOutputTokens=3000)
│           └── delivery/
│               └── telegramService.ts      # Telegram stub (interface only, not activated)
│
├── lib/api-spec/openapi.yaml     # Single source of truth for API contracts
├── lib/api-client-react/         # Orval-generated React Query hooks
├── lib/api-zod/                  # Orval-generated Zod validators
│
└── docs/                         # Project documentation
```

---

## Core Data Flow (V1)

```
User selects topic
        ↓
Preferences saved (lastViewedTopicId → localStorage)
        ↓
Backend receives topic via POST /api/news/summarize
        ↓
newsCollectorService aggregates sources (parallel)
    ├── rssService (feed 1) → { articles[], diagnostic }
    ├── rssService (feed 2) → { articles[], diagnostic }
    └── rssService (feed N) → { articles[], diagnostic }
        ↓
CollectionResult { articles, feedDiagnostics, failedFeeds, totalCollected }
        ↓
If articles.length === 0 → specific error (feed unavailable / no articles / all failed)
        ↓
AI summaryService generates Thai intelligence briefing (800-1500 words)
        ↓
If AI fails → specific error (timeout / rate limit / token exceeded / auth / parse)
        ↓
Response includes { topic, summary, sources, debugInfo: feedDiagnostics, ... }
        ↓
Frontend renders structured briefing sections
        ↓
User can Save briefing → localStorage (briefingStorage.ts)
        ↓
[Future] telegramService delivers to Telegram
```

---

## Module Descriptions

### `config/topics.ts`
- **Purpose:** Topic definitions and RSS feed URLs
- **Icon field:** Lucide React icon name (e.g. "cpu", "laptop") — NOT emoji
- **Technology:** 6 sources for maximum resilience
- **Rule:** Use ≥5 sources per topic

### `services/news/rssService.ts`
- **Purpose:** Fetch and parse a single RSS feed URL
- **Input:** `{ name: string, url: string }` from `config/topics.ts`
- **Output:** `FeedResult { articles: RssArticle[], diagnostic: FeedDiagnostic }`
- **Diagnostic fields:** name, url, status, articleCount, durationMs, error?
- **Logging:** INFO per successful feed; WARN per failure
- **Risk Level:** Medium — failures are isolated, never throws

### `services/news/newsCollectorService.ts`
- **Purpose:** Collect, deduplicate, rank, and select best articles for a topic
- **Output:** `CollectionResult { articles, feedDiagnostics, totalConfigured, totalCollected, failedFeeds }`
- **Ranking:** recency score (0-50) + quality score (0-30); Jaccard near-duplicate suppression (>65%)
- **Logging:** INFO with all collection metrics

### `routes/news.ts`
- **Purpose:** POST /api/news/summarize endpoint
- **Error classification:** Specific Thai error messages for each failure type
  - Feed unavailable: reports how many feeds failed out of total
  - AI timeout: specific timeout message
  - Rate limit: rate limit message with wait suggestion
  - Token exceeded: token limit exceeded message
  - Auth error: provider + key name
  - Parse error: parsing failure message
- **Debug info:** Always included in response as `debugInfo` field (FeedDiagnostic[])

### `services/ai/promptBuilder.ts`
- **Purpose:** Single source of truth for all AI prompts
- **Output format:** HEADLINE / EXECUTIVE SUMMARY / KEY DEVELOPMENTS / IMPACT ANALYSIS / WHAT TO WATCH NEXT
- **Target length:** 800–1500 Thai words (analytical, evidence-based)
- **Rule:** All 3 providers import from here — never write prompts inline in a provider
- **Risk Level:** HIGH — changes affect all providers and the frontend parser

### `services/delivery/telegramService.ts`
- **Purpose:** Architecture stub for future Telegram delivery
- **Status:** Interface defined, not activated, no UI
- **To activate:** See inline documentation in the file

### `lib/briefingStorage.ts` (frontend)
- **Purpose:** localStorage persistence for saved briefings
- **Key:** `ai-newsroom:saved-briefings`
- **Max stored:** 50 briefings (oldest auto-removed)
- **Migration path:** Replace localStorage calls with API calls to POST/GET/DELETE /api/briefings

### `lib/preferences.ts` (frontend)
- **Purpose:** localStorage persistence for user preferences
- **Key:** `ai-newsroom:preferences`
- **Stores:** lastViewedTopicId, favoriteTopics[]
- **Behaviour:** Last viewed topic is auto-restored and briefing auto-generated on next visit

---

## API Endpoints (V1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/topics` | List available topics |
| POST | `/api/news/summarize` | Fetch + summarize news for a topic |
| GET | `/api/healthz` | Health check |

### POST /api/news/summarize Response

```json
{
  "topic": { "id": "...", "label": "...", "labelTh": "...", "icon": "..." },
  "summary": "Thai intelligence briefing text...",
  "sources": [ { "title": "...", "url": "...", "source": "...", "pubDate": "..." } ],
  "generatedAt": "ISO 8601",
  "generationTimeMs": 7832,
  "provider": "github",
  "articleCount": 10,
  "debugInfo": [
    { "name": "Ars Technica", "url": "...", "status": "success", "articleCount": 10, "durationMs": 543 },
    { "name": "NY Times", "url": "...", "status": "failed", "articleCount": 0, "durationMs": 10001, "error": "timeout" }
  ]
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes (auto-set) | Server port — set by Replit artifact system |
| `AI_PROVIDER` | No (default: `github`) | Active AI provider: `github` \| `openai` \| `gemini` |
| `GITHUB_TOKEN` | Yes (if `AI_PROVIDER=github`) | GitHub Personal Access Token for GitHub Models API |
| `OPENAI_API_KEY` | Yes (if `AI_PROVIDER=openai`) | OpenAI API key |
| `GEMINI_API_KEY` | Yes (if `AI_PROVIDER=gemini`) | Google Gemini API key |
| `NEWSAPI_KEY` | Optional | API key for NewsAPI news collection |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram bot token for delivery |
| `TELEGRAM_CHAT_ID` | Optional | Telegram chat/channel ID for delivery |
| `DATABASE_URL` | Optional (V1) | PostgreSQL connection string |

---

## AI Provider Layer

The AI integration is abstracted behind a provider interface. The active provider is selected at startup via the `AI_PROVIDER` environment variable. No code changes are needed to switch providers.

```
AI_PROVIDER env var
       ↓
config/env.ts  (reads + validates the value)
       ↓
services/ai/summaryService.ts  (single entry point for all AI calls)
       ↓
services/ai/aiProvider.ts  (createAIProvider factory)
       ↓
┌──────────────────────────────────────────┐
│  AI_PROVIDER=github  → githubProvider.ts │  ← DEFAULT (max_tokens=3000)
│  AI_PROVIDER=openai  → openaiProvider.ts │  (max_tokens=3000)
│  AI_PROVIDER=gemini  → geminiProvider.ts │  (maxOutputTokens=3000)
└──────────────────────────────────────────┘
```

### How to Switch Providers

| Provider | `AI_PROVIDER` value | Required Secret |
|----------|---------------------|-----------------|
| GitHub Models (default) | `github` | `GITHUB_TOKEN` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Google Gemini | `gemini` | `GEMINI_API_KEY` |

---

## Design Decisions

1. **Services are stateless.** Each service function takes inputs, returns outputs, and has no side effects beyond its own scope.
2. **Topic-to-source mapping lives in config.** Topics map to RSS feeds via a config file, not hardcoded in services.
3. **AI provider is fully swappable via env var.** `summaryService.ts` only calls `aiProvider.ts`. Switching from GitHub Models to OpenAI or Gemini requires changing `AI_PROVIDER` only — zero code changes.
4. **Delivery is optional and non-blocking.** Telegram delivery failure must never crash the main summarization flow.
5. **No authentication in V1.** Single-user product. Auth is a future-version concern.
6. **Diagnostics flow from feed → collector → route → frontend.** Every response includes per-feed diagnostics in `debugInfo`. The frontend debug panel shows this data in dev mode.
7. **Icon field is a Lucide icon name, not emoji.** The backend sends `"cpu"`, `"laptop"` etc. The frontend maps these to Lucide React components.
8. **Persistence is localStorage-first.** `briefingStorage.ts` and `preferences.ts` use localStorage with interfaces designed for direct replacement by API calls when login is activated.

---

## Known Technical Debt

- `icon` field in OpenAPI spec still describes as "Emoji icon" — update when codegen is next run
- `debugInfo` field in `/api/news/summarize` response is not in the OpenAPI spec — add in next codegen cycle
- Error response from `/api/news/summarize` sometimes includes `debugInfo` alongside `error` — not reflected in OpenAPI `ApiError` schema

---

## Future Roadmap

### Near-term (V1.1)
- Telegram delivery (implement `telegramService.ts`)
- Login via Google OAuth (Clerk) — see `docs/LOGIN_PREPARATION.md`
- Migrate saved briefings from localStorage to PostgreSQL after login

### Medium-term (V2)
- Reporter Agent, Editor Agent, Analyst Agent (in `services/agents/`)
- Agent orchestrator (`services/agents/agentOrchestrator.ts`)
- Personalized Newsroom Dashboard

### Long-term (V3+)
- LINE delivery
- Agent Marketplace
- Multi-user support

---

## Future Architecture Considerations

When adding new AI agents (Reporter, Editor, Analyst), each agent should:
- Live in its own file under `services/agents/`
- Accept a standard input format
- Return a standard output format
- Be orchestrated by a central `agentOrchestrator.ts`

This file should be created as a stub in V2, not V1.

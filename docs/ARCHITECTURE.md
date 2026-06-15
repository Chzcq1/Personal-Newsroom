# ARCHITECTURE.md — Personal AI Newsroom V1

## Overview

Personal AI Newsroom is a modular web application where a user selects a news topic, the system collects relevant articles, an AI model summarizes them in Thai, and optionally delivers the summary to Telegram.

All modules are designed to be independently replaceable. Adding a new delivery channel, news source, or AI provider should require touching only one service file.

---

## Project Structure

```
Personal-AI-Newsroom/
│
├── docs/
│   ├── PROJECT_VISION.md       # Product goals and success criteria
│   ├── ARCHITECTURE.md         # This file — system design and module map
│   ├── AGENT_RULES.md          # Rules for AI agents modifying this codebase
│   └── CHANGELOG.md            # Feature history
│
├── artifacts/newsroom/         # React + Vite frontend (port 23519)
│   └── src/
│       ├── App.tsx             # Wouter routing + QueryClient
│       ├── index.css           # Design tokens (colors, fonts)
│       └── pages/             # Home page (topic grid + summary display)
│
├── artifacts/api-server/       # Express backend (port 8080)
│   └── src/
│       ├── config/
│       │   ├── env.ts          # Centralized env config (ONLY place process.env is read)
│       │   └── topics.ts       # Topic definitions + RSS feed URLs
│       ├── routes/
│       │   ├── index.ts        # Route registry
│       │   ├── health.ts       # GET /api/healthz
│       │   ├── topics.ts       # GET /api/topics
│       │   └── news.ts         # POST /api/news/summarize
│       └── services/
│           ├── news/
│           │   ├── rssService.ts           # Fetch + parse single RSS feed
│           │   └── newsCollectorService.ts # Parallel aggregation + dedup
│           └── ai/
│               ├── aiProvider.ts           # Provider interface + factory
│               ├── summaryService.ts       # ONLY entry point for AI calls
│               ├── githubProvider.ts       # GitHub Models (default)
│               ├── openaiProvider.ts       # OpenAI
│               └── geminiProvider.ts       # Google Gemini
│
├── lib/api-spec/openapi.yaml   # Single source of truth for API contracts
├── lib/api-client-react/       # Orval-generated React Query hooks
├── lib/api-zod/                # Orval-generated Zod validators
│
└── docs/                       # Project documentation
```

---

## Core Data Flow (V1)

```
User selects topic
        ↓
Backend receives topic via API
        ↓
newsCollectorService aggregates sources
    ├── rssService.js       (RSS feeds)
    └── newsApiService.js   (News API)
        ↓
AI summaryService.js generates Thai summary
        ↓
Response returned to frontend
        ↓
[Optional] telegramService.js delivers to Telegram
```

---

## Module Descriptions

### `services/news/rssService.js`
- **Purpose:** Fetch and parse news articles from RSS feeds
- **Input:** Topic string → mapped to configured RSS URLs
- **Output:** Array of `{ title, link, description, pubDate }`
- **Dependencies:** `rss-parser` npm package
- **Risk Level:** Medium — depends on third-party RSS availability

### `services/news/newsApiService.js`
- **Purpose:** Fetch news from a structured API (e.g. NewsAPI.org)
- **Input:** Topic keyword
- **Output:** Array of `{ title, url, description, publishedAt }`
- **Dependencies:** `NEWSAPI_KEY` env variable, `axios`
- **Risk Level:** High — requires API key, subject to rate limits

### `services/ai/summaryService.js`
- **Purpose:** Summarize an array of news articles into a single Thai-language summary
- **Input:** Array of article objects
- **Output:** String — Thai language summary
- **Dependencies:** AI provider (e.g. OpenAI, Anthropic) via API key
- **Risk Level:** High — core feature, depends on external AI API

### `services/delivery/telegramService.js`
- **Purpose:** Send a formatted summary message to a Telegram chat or channel
- **Input:** Summary string, chat ID
- **Output:** Delivery confirmation
- **Dependencies:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` env variables
- **Risk Level:** Low — optional feature, fail gracefully

### `backend/controllers/`
- **Purpose:** Handle HTTP requests, call services, return responses
- **Rule:** Controllers must be thin — no business logic here. Delegate to services.

### `config/env.js`
- **Purpose:** Single place to read and validate all environment variables
- **Rule:** No `process.env` calls outside this file

---

## API Endpoints (V1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/topics` | List available topics |
| POST | `/api/news/summarize` | Fetch + summarize news for a topic |
| POST | `/api/delivery/telegram` | Send summary to Telegram (optional) |
| GET | `/api/health` | Health check |

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

## Important Files

### `services/ai/summaryService.js`
- **Purpose:** Generate Thai-language AI summaries
- **Dependencies:** AI API key, article array
- **Risk:** HIGH — core product feature. Any change must be tested manually.

### `services/news/rssService.js`
- **Purpose:** Collect news from RSS sources
- **Dependencies:** `rss-parser`, topic-to-feed mapping in `config/`
- **Risk:** MEDIUM — changing feed URLs breaks topic coverage

### `services/news/newsApiService.js`
- **Purpose:** Collect news from structured API
- **Dependencies:** `NEWSAPI_KEY`, rate limit awareness
- **Risk:** HIGH — quota-sensitive

### `config/env.js`
- **Purpose:** Centralized env config
- **Dependencies:** All services read from here
- **Risk:** HIGH — changes affect every service

### `backend/routes/`
- **Purpose:** API routing
- **Dependencies:** Controllers
- **Risk:** MEDIUM — changing paths breaks frontend API calls

---

## AI Provider Layer

The AI integration is abstracted behind a provider interface. The active provider is selected at startup via the `AI_PROVIDER` environment variable. No code changes are needed to switch providers.

### Provider Switching Mechanism

```
AI_PROVIDER env var
       ↓
config/env.ts  (reads + validates the value)
       ↓
services/ai/summaryService.ts  (single entry point for all AI calls)
       ↓
services/ai/aiProvider.ts  (createAIProvider factory — registers all providers)
       ↓
┌──────────────────────────────────────────┐
│  AI_PROVIDER=github  → githubProvider.ts │  ← DEFAULT
│  AI_PROVIDER=openai  → openaiProvider.ts │
│  AI_PROVIDER=gemini  → geminiProvider.ts │
└──────────────────────────────────────────┘
```

### AI Provider Files

| File | Purpose | Risk |
|------|---------|------|
| `services/ai/aiProvider.ts` | Interface definition + provider factory. **Register new providers here.** | HIGH |
| `services/ai/summaryService.ts` | Only public entry point for AI. Never calls providers directly. | HIGH |
| `services/ai/githubProvider.ts` | GitHub Models (OpenAI-compatible). Default provider. | MEDIUM |
| `services/ai/openaiProvider.ts` | OpenAI API. Activated via `AI_PROVIDER=openai`. | MEDIUM |
| `services/ai/geminiProvider.ts` | Google Gemini API. Activated via `AI_PROVIDER=gemini`. | MEDIUM |

### How to Switch Providers

Change one environment variable — no code changes needed:

| Provider | `AI_PROVIDER` value | Required Secret |
|----------|---------------------|-----------------|
| GitHub Models (default) | `github` | `GITHUB_TOKEN` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Google Gemini | `gemini` | `GEMINI_API_KEY` |

### How to Add a New Provider

1. Create `services/ai/<name>Provider.ts` implementing the `AIProvider` interface
2. Add the provider name to `SupportedAIProvider` in `config/env.ts`
3. Add credentials to `config/env.ts`
4. Register in the `createAIProvider()` factory in `aiProvider.ts`

### Dependency Flow (AI Layer)

```
summaryService.ts
  └── aiProvider.ts (createAIProvider)
        ├── githubProvider.ts  → openai SDK (custom baseURL)
        ├── openaiProvider.ts  → openai SDK (standard baseURL)
        └── geminiProvider.ts  → @google/generative-ai SDK
```

---

## Module Descriptions

### `config/env.ts`
- **Purpose:** Single place to read and validate ALL environment variables
- **Rule:** No `process.env` calls outside this file — every service imports from here
- **Risk Level:** HIGH — changes affect every service

### `services/ai/aiProvider.ts`
- **Purpose:** Unified `AIProvider` interface + `createAIProvider()` factory
- **Input:** Provider name + credentials object
- **Output:** `AIProvider` instance
- **Risk Level:** HIGH — all AI calls flow through here

### `services/ai/summaryService.ts`
- **Purpose:** The only public API for Thai news summarization
- **Input:** Array of articles + topic string
- **Output:** Thai-language summary string
- **Rule:** Never import a provider directly — only call `createAIProvider()`
- **Risk Level:** HIGH — core product feature

### `services/ai/githubProvider.ts`
- **Purpose:** GitHub Models API integration (default provider)
- **Dependencies:** `openai` npm package, `GITHUB_TOKEN` secret
- **Risk Level:** MEDIUM

### `services/ai/openaiProvider.ts`
- **Purpose:** OpenAI API integration
- **Dependencies:** `openai` npm package, `OPENAI_API_KEY` secret
- **Risk Level:** MEDIUM

### `services/ai/geminiProvider.ts`
- **Purpose:** Google Gemini API integration
- **Dependencies:** `@google/generative-ai` npm package, `GEMINI_API_KEY` secret
- **Risk Level:** MEDIUM

### `services/ai/promptBuilder.ts`
- **Purpose:** Single source of truth for all AI prompts
- **Rule:** All 3 providers import from here — never write prompts inline in a provider
- **Output format:** 5 structured sections (HEADLINE, EXECUTIVE SUMMARY, KEY DEVELOPMENTS, WHY IT MATTERS, WHAT TO WATCH NEXT) in plain Thai — no markdown, no emojis
- **Risk Level:** HIGH — changes affect all providers and the frontend parser

### `services/news/rssService.ts`
- **Purpose:** Fetch and parse a single RSS feed by name+URL pair
- **Input:** `{ name: string, url: string }` from `config/topics.ts`
- **Output:** Array of `RssArticle` with source name attributed
- **Logging:** INFO per successful feed (name, articles, durationMs); WARN per failure (name, url, error, durationMs)
- **Dependencies:** `rss-parser` npm package
- **Risk Level:** Medium — depends on third-party RSS availability; failures are isolated (returns [])

### `services/news/newsCollectorService.ts`
- **Purpose:** Collect, deduplicate, rank, and select best articles for a topic
- **Ranking:** recency score (0-50) + quality score (0-30); Jaccard near-duplicate suppression on titles (>65% similarity = skip)
- **Output:** Top 10 ranked articles, deduplicated by URL and near-duplicate title
- **Logging:** INFO with sourceCount, failedFeeds, totalCollected, afterRanking

### `services/delivery/telegramService.ts`
- **Purpose:** Send a formatted summary message to a Telegram chat or channel
- **Input:** Summary string, chat ID
- **Output:** Delivery confirmation
- **Dependencies:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` env variables
- **Risk Level:** Low — optional feature, fail gracefully

### `backend/controllers/`
- **Purpose:** Handle HTTP requests, call services, return responses
- **Rule:** Controllers must be thin — no business logic here. Delegate to services.

---

## Design Decisions

1. **Services are stateless.** Each service function takes inputs, returns outputs, and has no side effects beyond its own scope.
2. **Topic-to-source mapping lives in config.** Topics map to RSS feeds and API keywords via a config file, not hardcoded in services.
3. **AI provider is fully swappable via env var.** `summaryService.ts` only calls `aiProvider.ts`. Switching from GitHub Models to OpenAI or Gemini requires changing `AI_PROVIDER` only — zero code changes.
4. **Delivery is optional and non-blocking.** Telegram delivery failure must never crash the main summarization flow.
5. **No authentication in V1.** Single-user product. Auth is a future-version concern.
6. **Provider factory uses lazy dynamic imports.** Each provider module is only loaded if it is the active provider, avoiding unnecessary SDK initialization at startup.

---

## Future Architecture Considerations

When adding new AI agents (Reporter, Editor, Analyst), each agent should:
- Live in its own file under `services/agents/`
- Accept a standard input format
- Return a standard output format
- Be orchestrated by a central `agentOrchestrator.js`

This file should be created as a stub in V2, not V1.

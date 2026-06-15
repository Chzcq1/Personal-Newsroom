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
├── frontend/
│   ├── pages/                  # Top-level page components
│   ├── components/             # Reusable UI components
│   └── layouts/                # Page layout wrappers
│
├── backend/
│   ├── routes/                 # Express route definitions
│   ├── controllers/            # Request handlers (thin, delegate to services)
│   └── middleware/             # Auth, logging, error handling
│
├── services/
│   ├── news/
│   │   ├── rssService.js       # Fetch news via RSS feeds
│   │   └── newsApiService.js   # Fetch news via NewsAPI or similar
│   ├── ai/
│   │   └── summaryService.js   # AI summarization (Thai)
│   └── delivery/
│       └── telegramService.js  # Send summaries to Telegram
│
├── database/
│   ├── models/                 # Data models / schema definitions
│   └── migrations/             # Database migration scripts
│
├── config/
│   └── env.js                  # Centralized environment config
│
├── tests/                      # Unit and integration tests
│
└── README.md
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
| `DATABASE_URL` | Optional (V1) | PostgreSQL connection string |
| `NEWSAPI_KEY` | Yes | API key for news data provider |
| `OPENAI_API_KEY` | Yes | API key for AI summarization |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Optional | Telegram chat/channel ID |
| `PORT` | No | Server port (default 5000) |

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

## Design Decisions

1. **Services are stateless.** Each service function takes inputs, returns outputs, and has no side effects beyond its own scope.
2. **Topic-to-source mapping lives in config.** Topics map to RSS feeds and API keywords via a config file, not hardcoded in services.
3. **AI provider is swappable.** `summaryService.js` wraps the provider call so switching from OpenAI to Anthropic requires changing one file only.
4. **Delivery is optional and non-blocking.** Telegram delivery failure must never crash the main summarization flow.
5. **No authentication in V1.** Single-user product. Auth is a future-version concern.

---

## Future Architecture Considerations

When adding new AI agents (Reporter, Editor, Analyst), each agent should:
- Live in its own file under `services/agents/`
- Accept a standard input format
- Return a standard output format
- Be orchestrated by a central `agentOrchestrator.js`

This file should be created as a stub in V2, not V1.

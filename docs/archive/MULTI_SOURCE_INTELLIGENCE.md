# MULTI_SOURCE_INTELLIGENCE.md — Sprint 18 Task C

## Overview

INFOX Sprint 18 introduces a multi-platform signal architecture that expands beyond RSS feeds into YouTube, Reddit (expanded), TikTok, Facebook, and Instagram. All adapters share a normalized `NormalizedArticle` interface from Sprint 17.

## Platform Architecture

### platformAdapters.ts

Located at `artifacts/api-server/src/services/sources/platformAdapters.ts`

### Active Adapters (No Auth Required)

| Adapter | ID | Status | Auth |
|---------|-----|--------|------|
| YouTube Channels | `youtube` | ✅ Active | RSS — no key |
| Reddit Expanded | `reddit_expanded` | ✅ Active | Public JSON API |

### Stub Adapters (Auth Gated)

| Adapter | ID | Required Env Var | Status |
|---------|-----|-----------------|--------|
| TikTok Trends | `tiktok` | `TIKTOK_API_KEY` | Architecture ready |
| Facebook Pages | `facebook` | `FACEBOOK_PAGE_TOKEN` | Architecture ready |
| Instagram Signals | `instagram` | `INSTAGRAM_ACCESS_TOKEN` | Architecture ready |

Stub adapters return `[]` safely when tokens are absent — zero impact on production.

## YouTube Channel Coverage

| Channel | Topics |
|---------|--------|
| CNBC Television | finance, economy, stocks |
| Bloomberg Television | finance, stocks |
| Lex Fridman | ai, technology |
| Y Combinator | technology, startups |
| MIT OpenCourseWare | technology, ai |

**Implementation:** Uses public YouTube RSS (`/feeds/videos.xml?channel_id=...`) — no API key required.

## Reddit Expansion

15 new subreddits beyond Sprint 17 base:

| Subreddit | Topics |
|----------|--------|
| r/SecurityAnalysis | finance, stocks |
| r/wallstreetbets | stocks |
| r/singularity | ai, technology |
| r/LocalLLaMA | ai, technology |
| r/OpenAI | ai |
| r/worldnews | geopolitics, politics |
| r/Economics | economy |
| r/Thailand | thai, geopolitics |
| r/ASEAN | geopolitics, economy |
| + 6 more | various |

## Trend Signal Tracking

`recordTrendSignal()` / `getRecentTrends()` — ring buffer of 200 trend observations. Each trend signal includes:
- Platform origin
- Keyword/phrase
- Velocity score (0–100)
- Engagement total
- Topic tags
- Narrative links

## Engagement Normalization

All platforms produce `engagementSignal` (0–100) using logarithmic normalization:
`min(100, round((log(1 + raw) / log(1 + max)) * 100))`

This prevents viral outliers from distorting scores.

## Admin Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/admin/platform-adapters` | Health status of all adapters |
| `GET /api/admin/sprint18` | Full Sprint 18 system summary |

## Future Activation (Sprint 19)

1. Set `TIKTOK_API_KEY` → TikTok Research API for trending hashtags
2. Set `FACEBOOK_PAGE_TOKEN` → Meta Graph API v19 for page feeds
3. Set `INSTAGRAM_ACCESS_TOKEN` → Instagram Basic Display API for hashtag monitoring

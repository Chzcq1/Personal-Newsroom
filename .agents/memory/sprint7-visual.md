---
name: Sprint 7 Visual Layer
description: Visual Intelligence & Trust Layer — source branding, reading progress, feed density, Telegram test-send, phone mockup, image extraction
---

## Design Direction
Bloomberg/FT/Reuters minimal intelligence aesthetic. No gamification, no social media feel.
Core files: `lib/sourceBranding.ts`, `lib/readingProgress.ts`, `docs/VISUAL_GUIDELINES.md`

## Source Branding (lib/sourceBranding.ts)
- `getSourceBrand(sourceName)` returns `{initials, bg, fg, tier: 'A'|'B'|'C'}`
- Exact match first, then partial/case-insensitive, then deterministic fallback (charCodeAt(0) % 7 color palette)
- `SourceAvatar` in my-feed.tsx: 28×28px `rounded-sm` square (editorial, not circular/social)
- Tier A badge shown in amber only for Tier A sources

## Reading Progress (lib/readingProgress.ts)
- `useReadingProgress(urls)` → `{readCount, total, markRead, readUrls}`
- localStorage key: `ai-newsroom:read-articles` (max 500 URLs, ring buffer)
- `FeedCard` uses `IntersectionObserver` threshold 0.5, disconnects after first trigger
- Header display: "X of Y read" — no progress bar, no animation, no gamification

## Feed Density (my-feed.tsx)
- localStorage key: `ai-newsroom:feed-density` ('compact' | 'detailed')
- Compact: one row per article (avatar + truncated title + timestamp + topic tag)
- Detailed: full card with description, source avatar, trust signals, 80×56px right-aligned image
- Toggle: two-button group (LayoutList / AlignLeft icons) in header

## Image Extraction (rssService.ts)
- Parser `customFields.item`: `['media:content', 'media:content']` and `['media:thumbnail', 'media:thumbnail']`
- `extractImageUrl(item)`: enclosure → media:content → media:thumbnail
- Safety: `validateImageUrl()` rejects data URIs, pattern `/pixel|tracking|beacon|1x1|spacer|blank\.gif/i`
- Frontend: `<img loading="lazy" onError={() => setFailed(true)}>`; `ArticleThumbnail` hides on error
- `imageUrl?` added to Article interface in aiProvider.ts; flows through to feed.ts PersonalFeedItem

## Telegram Test-Send (routes/telegram.ts)
- `POST /api/telegram/test-message` — calls getMe + getChat, sends branded HTML confirmation message
- `telegramPost()` helper added alongside `telegramGet()` (both return `TelegramResponse` type)
- Message format: bot username, chat title, ICT timestamp, schedule times
- Frontend state: `TestSendStatus = "idle"|"sending"|"sent"|"failed"`; result shows bot+chat names on success

## Delivery Preview Phone Mockup (delivery-preview.tsx)
- `TelegramPhone` component: outer frame `rounded-[36px]` bg-[#1a1a2a], screen `rounded-[26px]` bg-[#17212b]
- Width: 320px fixed, centered; notch pill, home indicator bar for realism
- Chat header: bot avatar (circle) + "INFOX Bot" + green "online" text
- Bubbles: bg-[#1e2b3b] `rounded-2xl rounded-tl-sm`, system-ui 11px, timestamp bottom-right
- Decorative input bar (non-functional) for visual completeness

## Known Issues
- Reuters feeds (feeds.reuters.com) are DNS-blocked in Replit sandbox — this is pre-existing, not a Sprint 7 regression
- AP News feeds also blocked in sandbox — same reason
- Both are handled gracefully: fallback to other sources, article count remains healthy (47+ articles)

**Why Bloomberg/FT aesthetic:**
User specified "media product" not "news app". Dense, professional, trust-driven. No rounded pill colors everywhere, no achievement unlocks, no social signals. Everything signals authority and editorial judgment.

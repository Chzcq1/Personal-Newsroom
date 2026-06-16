# Closed Alpha Gating — Sprint 15 Task H

## Overview

Sprint 15 adds a `/waitlist` page to gate the public launch and capture early adopters with a staged onboarding flow.

## Waitlist Page (`/waitlist`)

**File**: `artifacts/newsroom/src/pages/waitlist.tsx`

A 4-step form that:
1. Captures email + name
2. Asks pain-point question (5 choices, multi-select)
3. Shows a live sample digest preview in phone-frame
4. Displays a confirmation screen with a waitlist position number

### Data flow

The form submits to `POST /api/waitlist/join` with:
```json
{
  "email": "...",
  "name": "...",
  "painPoints": ["crypto_noise", "time_poor", ...],
  "referralCode": "FOUNDER"
}
```

### Pain point options

| Key | Label |
|-----|-------|
| `crypto_noise` | ข่าว crypto มากเกินไป (Too much crypto noise) |
| `time_poor` | ไม่มีเวลาอ่านข่าว (No time to read news) |
| `signal_noise` | หาสัญญาณสำคัญไม่เจอ (Can't find important signals) |
| `thai_content` | ต้องการข่าวเป็นภาษาไทย (Need Thai language news) |
| `delivery` | ต้องการรับข่าวผ่าน Telegram (Want Telegram delivery) |

## Waitlist API

**File**: `artifacts/api-server/src/routes/waitlist.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/waitlist/join` | POST | Record email + pain points |
| `GET /api/waitlist/count` | GET | Returns current count (public) |
| `GET /api/waitlist/admin` | GET | Full list with details (admin) |

Data is stored in-memory (ring buffer, 1000 entries max). Future: migrate to `waitlist_entries` DB table.

## Sample Digest Preview

Step 3 of the waitlist flow shows a phone-frame mockup of an INFOX briefing to demonstrate value before the user commits. This is the same component used in `/settings/delivery/preview-live`.

## Navigation

- The `/waitlist` route is registered in `App.tsx`
- The header on the waitlist page links back to the home page
- No authentication required — anonymous access
- After submission, the user sees their position number (deterministic hash of email)

## Future: Founder Access

`/founder-access` (planned) will be a token-gated entry point for founding members, granting:
- Extended topic library (20+ topics)
- Priority delivery slots
- Feedback beta access

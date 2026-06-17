# LOGIN PREPARATION — Architecture Document (Task G)

## Status: Documentation Only — No Implementation

Login is explicitly excluded from V1. This document defines the architecture for when login is activated in a future version.

---

## Planned Authentication Method

**Google OAuth via Clerk**

Clerk provides a managed authentication layer with Google OAuth support. No custom auth flows need to be built — Clerk handles token management, session management, and user creation.

---

## User Model (Future Database Schema)

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id    TEXT UNIQUE NOT NULL,      -- Clerk user ID (external reference)
  email       TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Saved Briefings Ownership (Future Schema)

Currently: saved locally in localStorage per browser session (no user association).

After login:

```sql
CREATE TABLE saved_briefings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  topic_id         TEXT NOT NULL,
  topic_label      TEXT NOT NULL,
  topic_label_th   TEXT NOT NULL,
  topic_icon       TEXT NOT NULL,
  summary          TEXT NOT NULL,
  sources          JSONB NOT NULL DEFAULT '[]',
  provider         TEXT NOT NULL,
  article_count    INTEGER NOT NULL DEFAULT 0,
  generated_at     TIMESTAMPTZ NOT NULL,
  saved_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_briefings_user_id ON saved_briefings(user_id);
CREATE INDEX idx_saved_briefings_saved_at ON saved_briefings(saved_at DESC);
```

**Migration path from localStorage to DB:**
1. On first login, read localStorage briefings
2. POST them all to `/api/briefings/import`
3. Clear localStorage after successful migration
4. All future reads/writes go through the API

---

## Preferences Ownership (Future Schema)

Currently: stored in localStorage per browser session.

After login:

```sql
CREATE TABLE user_preferences (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_viewed_topic_id TEXT,
  favorite_topics      TEXT[] DEFAULT '{}',
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
```

**Migration path:** Same as saved briefings — import from localStorage on first login.

---

## Telegram Delivery Ownership (Future Schema)

```sql
CREATE TABLE telegram_settings (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  chat_id       TEXT NOT NULL,
  bot_token     TEXT,                    -- Optional: if user wants own bot
  auto_send     BOOLEAN DEFAULT FALSE,   -- Auto-send on briefing generation
  enabled       BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Routes After Login Activation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/session` | None | Create session from Clerk token |
| DELETE | `/api/auth/session` | Required | Sign out |
| GET | `/api/me` | Required | Get current user profile |
| GET | `/api/briefings` | Required | Get user's saved briefings |
| POST | `/api/briefings` | Required | Save a briefing |
| DELETE | `/api/briefings/:id` | Required | Delete a briefing |
| GET | `/api/preferences` | Required | Get user preferences |
| PUT | `/api/preferences` | Required | Update preferences |
| GET | `/api/telegram/settings` | Required | Get Telegram settings |
| PUT | `/api/telegram/settings` | Required | Update Telegram settings |
| POST | `/api/telegram/send` | Required | Send briefing to Telegram |

---

## Implementation Steps (When Ready)

1. Install Clerk via Replit Integrations
2. Add `clerk_id` column to users table
3. Add auth middleware to Express (`requireAuth`)
4. Move localStorage reads/writes to API calls
5. Run localStorage migration on first login
6. Add user avatar/name to header

---

## V1 Compatibility

When login is optional, the app must continue working without it:
- Anonymous users: use localStorage (current behavior)
- Logged-in users: use database
- The `briefingStorage.ts` and `preferences.ts` interfaces are designed to be replaced by API calls with minimal code changes

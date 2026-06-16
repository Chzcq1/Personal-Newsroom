# Identity Foundation — Sprint 14

## Architecture Overview

INFOX uses a **persistent anonymous identity** model. Users get a stable UUID
on first load, stored in localStorage and synced to PostgreSQL. No login
required. When full auth is added, the anonymous profile migrates to an account.

---

## Identity Layers

### Layer 1 — Device Identity (localStorage)
**File:** `artifacts/newsroom/src/lib/userIdentity.ts`

```typescript
interface LocalUserProfile {
  profileId: string;         // Stable UUID — never changes
  createdAt: string;
  lastActiveAt: string;
  sessionCount: number;
  deviceFingerprint: string; // Lightweight (timezone|lang|screen → base64)
  migrationReady: false;
}
```

`getOrCreateProfile()` generates the UUID on first visit and returns it on every
subsequent load. Stored at `ai-newsroom:user-identity`.

### Layer 2 — Server Profile (PostgreSQL)
**Table:** `user_profiles`  
**Sync endpoint:** `POST /api/identity/sync`

The frontend calls this endpoint on load to persist the local profile to DB.
Upsert-safe — calling it multiple times is idempotent.

### Layer 3 — Migration Contract
`buildMigrationContract()` serialises current local state into a structured
object that can be linked to a server-side account when auth is added:

```typescript
{
  localProfileId: "uuid",
  deviceState: { timezone, language, screen, topics, entities },
  createdAt: "ISO8601",
  sessionCount: number,
  topicsSnapshot: string[]
}
```

---

## Identity API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/identity/sync` | Upsert anonymous profile to DB |
| `GET` | `/api/identity/:id` | Retrieve persisted profile |
| `POST` | `/api/identity/:id/onboarding` | Mark onboarding complete, set founding member |
| `POST` | `/api/identity/:id/feedback` | Record article feedback action |
| `GET` | `/api/identity/:id/feedback/stats` | Get engagement stats |
| `GET` | `/api/identity/:id/briefings` | Get saved briefings from DB |
| `POST` | `/api/identity/briefing` | Save briefing to DB |
| `DELETE` | `/api/identity/briefing/:id` | Delete saved briefing |

---

## Data Owned by a Profile

Every piece of user data is associated with a `profile_id`:

```
user_profiles          ← the identity anchor
├── user_preferences   ← UI and briefing preferences
├── user_interests     ← active topic interests
├── user_watchlists    ← entity watchlists
├── saved_briefings    ← saved briefing content
├── feedback_actions   ← all engagement events
└── delivery_schedules ← Telegram schedule config
```

---

## Future Account Migration Path

When login is added:

1. Call `buildMigrationContract()` on the frontend to get local profile state
2. POST to `/api/identity/sync` with `migrationReady: true`
3. After OAuth login, call `/api/identity/:id/account-link` (future endpoint)
4. Server migrates all `profile_id` rows to the authenticated user's account ID
5. `profileId` in localStorage updated to the server account ID

This design means **no data is lost** when a user logs in for the first time.

---

## Privacy Boundaries

- `profileId` is a random UUID — no PII
- `deviceFingerprint` is a 16-char base64 of timezone + language + screen size — not reversible
- Telegram credentials live in `localStorage` only, never in the DB
- No cookies, no sessions, no tracking pixels

# User-Owned AI Provider Model

Sprint 17 Task M prepares INFOX for user-owned AI API keys — a "bring your own key" (BYOK) model for Standard and Premium tier users.

## The Problem

INFOX currently pays for all AI calls from a shared platform budget. At scale, this creates:

1. **Sustainability risk** — platform token costs grow linearly with users
2. **Fairness problem** — power users consume more but pay the same as light users
3. **Independence** — users cannot choose their own provider or quality tier

## The Architecture

### Session Tier Entitlements

| Tier | BYOK Allowed | Daily Budget | Premium Calls |
|------|-------------|--------------|---------------|
| Anonymous | ❌ | 10,000 tokens | No |
| Free | ❌ | 50,000 tokens | No |
| Standard | ✅ | 200,000 tokens | Yes |
| Premium | ✅ | 2,000,000 tokens | Yes |

### Supported Providers (Planned)

| Provider | Model | Notes |
|----------|-------|-------|
| GitHub Models | gpt-4o, Phi-4 | Free tier available |
| OpenAI | gpt-4o, gpt-4o-mini | Paid API |
| Anthropic | claude-3-5-sonnet | Paid API |
| Google Gemini | gemini-2.0-flash | Free tier available |

### Key Security Model

**API keys are NEVER stored in INFOX's database.** The architecture:

1. User provides API key in the settings page
2. Client stores it in localStorage (user's device only)
3. Client sends it in the request header `X-User-AI-Key`
4. Server validates it against the chosen provider on first use
5. If valid, the server uses it for this session only

The server never persists the key — it exists only in memory for the duration of the request.

## Session Abstraction

```typescript
import {
  getOrCreateSession,
  attachUserProvider,
  checkEntitlement,
  recordSessionUsage,
} from "@/services/auth/userSession";

// Get/create session from client UUID
const session = getOrCreateSession(clientId);

// Check feature access
const { allowed, reason } = checkEntitlement(clientId, "premium_insights");

// Attach user's API key for this session
attachUserProvider(clientId, {
  providerType: "openai",
  isConfigured: true,
  validationStatus: "valid",
});
```

## Feature Gating

The `checkEntitlement()` function blocks access to:

| Feature | Minimum Tier |
|---------|-------------|
| `premium_insights` | Standard |
| `telegram_delivery` | Free |
| `scheduled_briefings` | Standard |
| `custom_topics` | Free |

## Current State

The user session and entitlement architecture is implemented in Sprint 17. Full auth integration (real tier upgrades, Stripe payments, JWT sessions) is planned for Sprint 18–19.

## Files

- Session abstraction: `artifacts/api-server/src/services/auth/userSession.ts`
- AI provider config: `UserAIProviderConfig` in userSession.ts

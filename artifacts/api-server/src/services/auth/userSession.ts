// ============================================================
// USER SESSION — Sprint 17 Task M
//
// Pre-auth preparation. Prepares the session abstraction,
// usage tracking, entitlement architecture, and user-owned
// AI provider model for Sprint 18-19.
//
// IMPORTANT: No auth is implemented here. This is the
// architecture layer that auth will plug into.
// ============================================================

// ── Session tier (entitlement) ────────────────────────────────

export type SessionTier = "anonymous" | "free" | "standard" | "premium";

export interface SessionEntitlements {
  tier: SessionTier;
  dailyTokenBudget: number;
  maxTopics: number;
  maxCustomTopics: number;
  allowPremiumInsights: boolean;
  allowTelegramDelivery: boolean;
  allowScheduledBriefings: boolean;
  canBringOwnApiKey: boolean;
  trialDaysRemaining?: number;
}

export const TIER_ENTITLEMENTS: Record<SessionTier, SessionEntitlements> = {
  anonymous: {
    tier: "anonymous",
    dailyTokenBudget: 10_000,
    maxTopics: 3,
    maxCustomTopics: 0,
    allowPremiumInsights: false,
    allowTelegramDelivery: false,
    allowScheduledBriefings: false,
    canBringOwnApiKey: false,
  },
  free: {
    tier: "free",
    dailyTokenBudget: 50_000,
    maxTopics: 5,
    maxCustomTopics: 1,
    allowPremiumInsights: false,
    allowTelegramDelivery: true,
    allowScheduledBriefings: false,
    canBringOwnApiKey: false,
    trialDaysRemaining: 14,
  },
  standard: {
    tier: "standard",
    dailyTokenBudget: 200_000,
    maxTopics: 10,
    maxCustomTopics: 5,
    allowPremiumInsights: true,
    allowTelegramDelivery: true,
    allowScheduledBriefings: true,
    canBringOwnApiKey: true,
  },
  premium: {
    tier: "premium",
    dailyTokenBudget: 2_000_000,
    maxTopics: 50,
    maxCustomTopics: 20,
    allowPremiumInsights: true,
    allowTelegramDelivery: true,
    allowScheduledBriefings: true,
    canBringOwnApiKey: true,
  },
};

// ── User-owned AI provider model ──────────────────────────────

export type AIProviderOwner = "platform" | "user";
export type UserAIProviderType = "github_models" | "openai" | "anthropic" | "gemini";

export interface UserAIProviderConfig {
  owner: AIProviderOwner;
  providerType: UserAIProviderType;
  // Note: actual API keys are NEVER stored here — stored in user's env/vault
  isConfigured: boolean;
  configuredAt?: string;
  lastValidatedAt?: string;
  validationStatus: "untested" | "valid" | "invalid" | "quota_exceeded";
}

/**
 * The default platform-owned provider config (current state).
 * When a user brings their own key, this gets replaced per-session.
 */
export const PLATFORM_PROVIDER_CONFIG: UserAIProviderConfig = {
  owner: "platform",
  providerType: "github_models",
  isConfigured: true,
  validationStatus: "valid",
};

// ── Session abstraction ────────────────────────────────────────

export interface UserSession {
  sessionId: string;           // anonymous UUID — no auth required
  userId?: string;             // set when auth is added (Sprint 18+)
  tier: SessionTier;
  entitlements: SessionEntitlements;
  aiProvider: UserAIProviderConfig;
  usageThisSession: SessionUsage;
  createdAt: string;
  lastActiveAt: string;
}

export interface SessionUsage {
  tokensUsed: number;
  briefingsRequested: number;
  premiumCallsMade: number;
  topicsQueried: string[];
}

// ── Session registry (in-memory, Sprint 14+ will be DB-backed) ─

const sessionStore = new Map<string, UserSession>();

export function createSession(sessionId: string, tier: SessionTier = "anonymous"): UserSession {
  const session: UserSession = {
    sessionId,
    tier,
    entitlements: TIER_ENTITLEMENTS[tier],
    aiProvider: PLATFORM_PROVIDER_CONFIG,
    usageThisSession: {
      tokensUsed: 0,
      briefingsRequested: 0,
      premiumCallsMade: 0,
      topicsQueried: [],
    },
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  sessionStore.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): UserSession | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;
  session.lastActiveAt = new Date().toISOString();
  return session;
}

export function getOrCreateSession(sessionId: string): UserSession {
  return getSession(sessionId) ?? createSession(sessionId);
}

export function upgradeSessionTier(sessionId: string, tier: SessionTier): UserSession | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;
  session.tier = tier;
  session.entitlements = TIER_ENTITLEMENTS[tier];
  return session;
}

/**
 * Attach a user-owned AI provider to the session.
 * The caller must validate the key before calling this.
 */
export function attachUserProvider(
  sessionId: string,
  config: Omit<UserAIProviderConfig, "owner">,
): UserSession | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;
  if (!session.entitlements.canBringOwnApiKey) return null;

  session.aiProvider = { ...config, owner: "user" };
  return session;
}

export function recordSessionUsage(
  sessionId: string,
  tokens: number,
  isPremium: boolean,
  topic?: string,
): void {
  const session = sessionStore.get(sessionId);
  if (!session) return;

  session.usageThisSession.tokensUsed += tokens;
  session.usageThisSession.briefingsRequested++;
  if (isPremium) session.usageThisSession.premiumCallsMade++;
  if (topic && !session.usageThisSession.topicsQueried.includes(topic)) {
    session.usageThisSession.topicsQueried.push(topic);
  }
}

// ── Usage gate ─────────────────────────────────────────────────

/**
 * Check if a session is entitled to make a specific call.
 * Returns { allowed: boolean, reason?: string }
 */
export function checkEntitlement(
  sessionId: string,
  feature: "premium_insights" | "telegram_delivery" | "scheduled_briefings" | "custom_topics",
): { allowed: boolean; reason?: string } {
  const session = getSession(sessionId);
  if (!session) {
    return { allowed: false, reason: "Session not found" };
  }

  const e = session.entitlements;

  switch (feature) {
    case "premium_insights":
      if (!e.allowPremiumInsights) return { allowed: false, reason: "Upgrade to Standard for premium insights" };
      break;
    case "telegram_delivery":
      if (!e.allowTelegramDelivery) return { allowed: false, reason: "Upgrade to Free tier for Telegram delivery" };
      break;
    case "scheduled_briefings":
      if (!e.allowScheduledBriefings) return { allowed: false, reason: "Upgrade to Standard for scheduled briefings" };
      break;
    case "custom_topics":
      if (e.maxCustomTopics === 0) return { allowed: false, reason: "Upgrade to access custom topics" };
      break;
  }

  // Token budget gate
  if (session.usageThisSession.tokensUsed >= e.dailyTokenBudget) {
    return { allowed: false, reason: "Daily token budget reached — resets tomorrow" };
  }

  return { allowed: true };
}

export function getSessionStats(): {
  activeSessions: number;
  byTier: Record<SessionTier, number>;
} {
  const byTier: Record<SessionTier, number> = {
    anonymous: 0, free: 0, standard: 0, premium: 0,
  };

  for (const session of sessionStore.values()) {
    byTier[session.tier]++;
  }

  return { activeSessions: sessionStore.size, byTier };
}

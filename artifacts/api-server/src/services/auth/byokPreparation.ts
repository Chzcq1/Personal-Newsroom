// ============================================================
// BYOK PREPARATION — Sprint 18 Task J
//
// Architecture for user-provided AI keys (Bring Your Own Key).
// DOES NOT implement billing, usage charging, or live switching yet.
//
// Prepares:
//   - Secure encrypted storage architecture
//   - Entitlement compatibility layer
//   - Provider routing preparation
//   - Quota ownership model
//
// Future: Sprint 19+ will add Stripe-backed tier upgrades,
// live key validation, and per-user budget tracking.
// ============================================================

import { logger } from "../../lib/logger.js";

// ── Provider types ────────────────────────────────────────────

export type BYOKProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "github";

export type BYOKStatus =
  | "not_configured"    // User has not provided a key
  | "pending_validation" // Key provided but not yet validated
  | "active"            // Key validated and in use
  | "invalid"           // Key failed validation
  | "revoked"           // User removed their key
  | "quota_exceeded";   // Key is valid but quota is exhausted

export interface BYOKSlot {
  provider: BYOKProvider;
  status: BYOKStatus;
  // NOTE: Actual key is NEVER stored in memory in cleartext.
  // The hasKey flag indicates presence; the key itself would be
  // stored encrypted in the DB (Sprint 19 implementation).
  hasKey: boolean;
  keyHint?: string;       // Last 4 chars for display: "...sk-xxxx"
  validatedAt?: string;   // ISO timestamp of last successful validation
  lastUsedAt?: string;    // ISO timestamp of last use
  usageToday?: number;    // Approximate token count today
  quotaLimit?: number;    // User-set daily limit (0 = unlimited)
}

export interface BYOKProfile {
  userId: string;
  slots: Record<BYOKProvider, BYOKSlot>;
  activeProvider?: BYOKProvider;  // Which provider to use (null = system default)
  byokEnabled: boolean;
  entitlementTier: "anonymous" | "free" | "standard" | "premium";
  createdAt: string;
  updatedAt: string;
}

// ── Entitlement rules ─────────────────────────────────────────

export interface BYOKEntitlement {
  canUseBYOK: boolean;
  allowedProviders: BYOKProvider[];
  maxDailyTokens: number;       // 0 = no limit
  canSetQuotaLimits: boolean;
  canSwitchProviders: boolean;
  reason?: string;
}

const ENTITLEMENT_MAP: Record<BYOKProfile["entitlementTier"], BYOKEntitlement> = {
  anonymous: {
    canUseBYOK: false,
    allowedProviders: [],
    maxDailyTokens: 0,
    canSetQuotaLimits: false,
    canSwitchProviders: false,
    reason: "BYOK requires account creation",
  },
  free: {
    canUseBYOK: false,
    allowedProviders: [],
    maxDailyTokens: 0,
    canSetQuotaLimits: false,
    canSwitchProviders: false,
    reason: "BYOK available on Standard plan and above",
  },
  standard: {
    canUseBYOK: true,
    allowedProviders: ["openai", "gemini"],
    maxDailyTokens: 100_000,
    canSetQuotaLimits: true,
    canSwitchProviders: false,
  },
  premium: {
    canUseBYOK: true,
    allowedProviders: ["openai", "anthropic", "gemini", "github"],
    maxDailyTokens: 0, // unlimited
    canSetQuotaLimits: true,
    canSwitchProviders: true,
  },
};

// ── Provider routing preparation ──────────────────────────────

export interface ProviderRoutingDecision {
  useSystemDefault: boolean;
  selectedProvider: BYOKProvider | "system";
  reason: string;
  estimatedCostPerCall?: "low" | "medium" | "high";
}

function estimateCost(provider: BYOKProvider): "low" | "medium" | "high" {
  const costMap: Record<BYOKProvider, "low" | "medium" | "high"> = {
    github: "low",   // Free tier / GitHub Models
    gemini: "low",   // Competitive pricing
    openai: "medium",
    anthropic: "high",
  };
  return costMap[provider];
}

// ── In-memory BYOK store ───────────────────────────────────────
// Sprint 19: Replace with encrypted PostgreSQL storage

const byokStore = new Map<string, BYOKProfile>();

// ── Profile management ─────────────────────────────────────────

function createDefaultSlot(provider: BYOKProvider): BYOKSlot {
  return {
    provider,
    status: "not_configured",
    hasKey: false,
  };
}

export function getBYOKProfile(userId: string): BYOKProfile {
  if (!byokStore.has(userId)) {
    const profile: BYOKProfile = {
      userId,
      slots: {
        openai: createDefaultSlot("openai"),
        anthropic: createDefaultSlot("anthropic"),
        gemini: createDefaultSlot("gemini"),
        github: createDefaultSlot("github"),
      },
      byokEnabled: false,
      entitlementTier: "anonymous",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    byokStore.set(userId, profile);
  }
  return byokStore.get(userId)!;
}

export function getEntitlements(userId: string): BYOKEntitlement {
  const profile = getBYOKProfile(userId);
  return ENTITLEMENT_MAP[profile.entitlementTier];
}

export function canUseBYOK(userId: string): boolean {
  return getEntitlements(userId).canUseBYOK;
}

// ── Key registration (prep only — no real validation yet) ──────

export function registerKeyIntent(
  userId: string,
  provider: BYOKProvider,
  keyHint: string
): { success: boolean; message: string } {
  const entitlement = getEntitlements(userId);

  if (!entitlement.canUseBYOK) {
    return {
      success: false,
      message: entitlement.reason ?? "BYOK not available for this tier",
    };
  }

  if (!entitlement.allowedProviders.includes(provider)) {
    return {
      success: false,
      message: `Provider ${provider} not available on your plan`,
    };
  }

  const profile = getBYOKProfile(userId);
  profile.slots[provider] = {
    provider,
    status: "pending_validation",
    hasKey: true,
    keyHint: keyHint.length >= 4 ? `...${keyHint.slice(-4)}` : "...????",
  };
  profile.updatedAt = new Date().toISOString();
  byokStore.set(userId, profile);

  logger.info(
    { userId, provider, keyHint: profile.slots[provider].keyHint },
    "[BYOK] Key registration intent recorded"
  );

  return {
    success: true,
    message:
      "Key registration recorded. Validation will run when BYOK is fully activated (Sprint 19).",
  };
}

export function revokeKey(
  userId: string,
  provider: BYOKProvider
): { success: boolean } {
  const profile = getBYOKProfile(userId);
  profile.slots[provider] = createDefaultSlot(provider);
  profile.slots[provider].status = "revoked";

  if (profile.activeProvider === provider) {
    profile.activeProvider = undefined;
  }

  profile.updatedAt = new Date().toISOString();
  byokStore.set(userId, profile);
  logger.info({ userId, provider }, "[BYOK] Key revoked");
  return { success: true };
}

// ── Routing decision ───────────────────────────────────────────

export function getRoutingDecision(userId: string): ProviderRoutingDecision {
  const profile = getBYOKProfile(userId);

  if (!profile.byokEnabled || !profile.activeProvider) {
    return {
      useSystemDefault: true,
      selectedProvider: "system",
      reason: "BYOK not enabled — using system provider",
    };
  }

  const slot = profile.slots[profile.activeProvider];
  if (!slot.hasKey || slot.status !== "active") {
    return {
      useSystemDefault: true,
      selectedProvider: "system",
      reason: `BYOK key status: ${slot.status} — falling back to system`,
    };
  }

  return {
    useSystemDefault: false,
    selectedProvider: profile.activeProvider,
    reason: "Using user-provided key",
    estimatedCostPerCall: estimateCost(profile.activeProvider),
  };
}

// ── Admin snapshot ─────────────────────────────────────────────

export function getBYOKSnapshot(): {
  totalProfiles: number;
  byokEnabledCount: number;
  byStatus: Record<BYOKStatus, number>;
  byProvider: Record<BYOKProvider, number>;
} {
  const profiles = Array.from(byokStore.values());
  const byStatus: Record<BYOKStatus, number> = {
    not_configured: 0,
    pending_validation: 0,
    active: 0,
    invalid: 0,
    revoked: 0,
    quota_exceeded: 0,
  };
  const byProvider: Record<BYOKProvider, number> = {
    openai: 0,
    anthropic: 0,
    gemini: 0,
    github: 0,
  };

  for (const profile of profiles) {
    for (const slot of Object.values(profile.slots)) {
      if (slot.hasKey) {
        byStatus[slot.status]++;
        byProvider[slot.provider]++;
      }
    }
  }

  return {
    totalProfiles: profiles.length,
    byokEnabledCount: profiles.filter((p) => p.byokEnabled).length,
    byStatus,
    byProvider,
  };
}

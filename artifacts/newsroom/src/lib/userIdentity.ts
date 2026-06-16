// ============================================================
// USER IDENTITY LAYER — Sprint 13 Task K
//
// Anonymous persistent local identity layer.
// Stores a stable local profile ID + device intelligence state.
//
// Migration-ready: when auth (Clerk/Replit Auth) is added,
// call buildMigrationContract() to link local → server identity.
//
// Storage: localStorage (same pattern as telegramSettings.ts)
// Future: POST /api/identity/sync after login
// ============================================================

const IDENTITY_KEY = "ai-newsroom:user-identity";
const DEVICE_STATE_KEY = "ai-newsroom:device-state";

// ── Types ──────────────────────────────────────────────────────

export interface LocalUserProfile {
  profileId: string;         // Stable UUID — never changes
  createdAt: string;         // ISO8601 first-seen
  lastActiveAt: string;      // Updated on each session
  sessionCount: number;
  deviceFingerprint: string; // Lightweight (timezone + lang + screen)
  migrationReady: false;
}

export interface DeviceIntelligenceState {
  timezone: string;
  preferredLanguage: string;
  screenSize: string;
  darkMode: boolean;
  lastKnownTopics: string[];
  lastKnownEntities: string[];
  preferredBriefingType: string | null;
  openedThisSession: boolean;
}

export interface IdentityMigrationContract {
  localProfileId: string;
  deviceState: DeviceIntelligenceState;
  createdAt: string;
  sessionCount: number;
  topicsSnapshot: string[];
}

// ── Stable ID generation ───────────────────────────────────────

function generateStableId(): string {
  // Use crypto.randomUUID if available (all modern browsers), else fallback
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Simple fallback UUID v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Device fingerprint ─────────────────────────────────────────

function buildDeviceFingerprint(): string {
  try {
    const parts = [
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
      `${window.screen.width}x${window.screen.height}`,
    ];
    return btoa(parts.join("|")).slice(0, 16);
  } catch {
    return "unknown";
  }
}

// ── Profile management ─────────────────────────────────────────

export function getOrCreateProfile(): LocalUserProfile {
  try {
    const stored = localStorage.getItem(IDENTITY_KEY);
    if (stored) {
      const profile = JSON.parse(stored) as LocalUserProfile;
      profile.lastActiveAt = new Date().toISOString();
      profile.sessionCount += 1;
      localStorage.setItem(IDENTITY_KEY, JSON.stringify(profile));
      return profile;
    }
  } catch {
    // localStorage unavailable or corrupt
  }

  const newProfile: LocalUserProfile = {
    profileId: generateStableId(),
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    sessionCount: 1,
    deviceFingerprint: buildDeviceFingerprint(),
    migrationReady: false,
  };

  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(newProfile));
  } catch {
    // Private browsing / storage full
  }

  return newProfile;
}

export function getProfile(): LocalUserProfile | null {
  try {
    const stored = localStorage.getItem(IDENTITY_KEY);
    return stored ? (JSON.parse(stored) as LocalUserProfile) : null;
  } catch {
    return null;
  }
}

// ── Device intelligence state ──────────────────────────────────

export function getDeviceState(): DeviceIntelligenceState {
  try {
    const stored = localStorage.getItem(DEVICE_STATE_KEY);
    if (stored) return JSON.parse(stored) as DeviceIntelligenceState;
  } catch {
    // fallthrough
  }
  return {
    timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } })(),
    preferredLanguage: (() => { try { return navigator.language; } catch { return "th"; } })(),
    screenSize: (() => { try { return `${window.screen.width}x${window.screen.height}`; } catch { return "unknown"; } })(),
    darkMode: (() => { try { return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true; } catch { return true; } })(),
    lastKnownTopics: [],
    lastKnownEntities: [],
    preferredBriefingType: null,
    openedThisSession: true,
  };
}

export function updateDeviceState(
  patch: Partial<Omit<DeviceIntelligenceState, "timezone" | "preferredLanguage" | "screenSize">>,
): void {
  try {
    const current = getDeviceState();
    localStorage.setItem(DEVICE_STATE_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    // Storage unavailable
  }
}

// ── Migration contract ─────────────────────────────────────────

export function buildMigrationContract(): IdentityMigrationContract | null {
  const profile = getProfile();
  if (!profile) return null;
  const deviceState = getDeviceState();
  return {
    localProfileId: profile.profileId,
    deviceState,
    createdAt: profile.createdAt,
    sessionCount: profile.sessionCount,
    topicsSnapshot: deviceState.lastKnownTopics,
  };
}

export function clearLocalIdentity(): void {
  try {
    localStorage.removeItem(IDENTITY_KEY);
    localStorage.removeItem(DEVICE_STATE_KEY);
  } catch { /* noop */ }
}

// ── Profile stats for UI ───────────────────────────────────────

export interface ProfileStats {
  profileId: string;
  shortId: string;
  accountAge: string;
  sessionCount: number;
  deviceTimezone: string;
}

export function getProfileStats(): ProfileStats | null {
  const profile = getProfile();
  if (!profile) return null;
  const msAge = Date.now() - new Date(profile.createdAt).getTime();
  const days = Math.floor(msAge / 86400000);
  const accountAge =
    days < 1 ? "วันนี้" :
    days === 1 ? "เมื่อวาน" :
    days < 7 ? `${days} วัน` :
    days < 30 ? `${Math.floor(days / 7)} สัปดาห์` :
    `${Math.floor(days / 30)} เดือน`;
  return {
    profileId: profile.profileId,
    shortId: profile.profileId.split("-")[0],
    accountAge,
    sessionCount: profile.sessionCount,
    deviceTimezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } })(),
  };
}

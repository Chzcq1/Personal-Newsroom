// ============================================================
// EXECUTIVE MODE — Sprint 8 Task G
//
// Compact 5-bullet briefing mode for busy users.
// Under 90 seconds reading time.
// Impact-first format.
//
// DB migration path: GET/PUT /api/settings/preferences
// ============================================================

const STORAGE_KEY = "ai-newsroom:executive-mode";

export interface ExecutiveModeSettings {
  enabled: boolean;
  updatedAt: string;
}

export function getExecutiveMode(): ExecutiveModeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: false, updatedAt: "" };
    return JSON.parse(raw) as ExecutiveModeSettings;
  } catch {
    return { enabled: false, updatedAt: "" };
  }
}

export function setExecutiveMode(enabled: boolean): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // ignore
  }
}

export function isExecutiveModeEnabled(): boolean {
  return getExecutiveMode().enabled;
}

// ============================================================
// TASTE LEARNING — Sprint 9 Task D
//
// Local-only adaptive taste tracking.
// Tracks: opens, saves, skips, time-on-page, engagement patterns.
//
// Transparent: shows user what's being tracked.
// No addictive optimization: no infinite scroll or engagement loops.
//
// Data sent to API with feed requests as `tasteSignal`.
// localStorage key: ai-newsroom:taste-v1
// ============================================================

const STORAGE_KEY = "ai-newsroom:taste-v1";
const MAX_EVENTS = 200;

export interface TasteEvent {
  type: "open" | "save" | "skip" | "complete_read";
  interest: string | null;    // matched interest key (null if unknown)
  topicId: string;
  url: string;
  timestamp: number;
}

export interface TasteProfile {
  events: TasteEvent[];
  updatedAt: string;
}

export interface TasteSignal {
  openedInterests: string[];
  savedInterests: string[];
  skippedInterests: string[];
  strongInterests: string[];
}

// ── Persistence ──────────────────────────────────────────────

function loadProfile(): TasteProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { events: [], updatedAt: "" };
    return JSON.parse(raw) as TasteProfile;
  } catch {
    return { events: [], updatedAt: "" };
  }
}

function saveProfile(profile: TasteProfile): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // storage full — ignore
  }
}

// ── Event recording ──────────────────────────────────────────

export function recordTasteEvent(event: Omit<TasteEvent, "timestamp">): void {
  const profile = loadProfile();
  profile.events.push({ ...event, timestamp: Date.now() });

  // Ring buffer
  if (profile.events.length > MAX_EVENTS) {
    profile.events = profile.events.slice(-MAX_EVENTS);
  }

  saveProfile(profile);
}

// ── Signal derivation ────────────────────────────────────────

/**
 * Derive a TasteSignal from the event log.
 * Sent to the API with feed requests.
 */
export function deriveTasteSignal(): TasteSignal {
  const profile = loadProfile();
  const events = profile.events;

  // Only look at last 30 days
  const cutoff = Date.now() - 30 * 86_400_000;
  const recent = events.filter((e) => e.timestamp >= cutoff);

  const opened = recent.filter((e) => e.type === "open" && e.interest).map((e) => e.interest!);
  const saved = recent.filter((e) => e.type === "save" && e.interest).map((e) => e.interest!);
  const skipped = recent.filter((e) => e.type === "skip" && e.interest).map((e) => e.interest!);

  // Strong interests: opened ≥ 3 times
  const openFreq = new Map<string, number>();
  for (const i of opened) openFreq.set(i, (openFreq.get(i) ?? 0) + 1);
  const strongInterests = [...openFreq.entries()]
    .filter(([, count]) => count >= 3)
    .map(([interest]) => interest);

  return {
    openedInterests: [...new Set(opened)],
    savedInterests: [...new Set(saved)],
    skippedInterests: [...new Set(skipped)],
    strongInterests,
  };
}

// ── Analytics ────────────────────────────────────────────────

export interface TasteStats {
  totalEvents: number;
  opens: number;
  saves: number;
  skips: number;
  topInterests: Array<{ interest: string; opens: number }>;
  activeForDays: number;
}

export function getTasteStats(): TasteStats {
  const profile = loadProfile();
  const events = profile.events;
  if (events.length === 0) {
    return { totalEvents: 0, opens: 0, saves: 0, skips: 0, topInterests: [], activeForDays: 0 };
  }

  const opens = events.filter((e) => e.type === "open").length;
  const saves = events.filter((e) => e.type === "save").length;
  const skips = events.filter((e) => e.type === "skip").length;

  const openFreq = new Map<string, number>();
  for (const e of events.filter((e) => e.type === "open" && e.interest)) {
    openFreq.set(e.interest!, (openFreq.get(e.interest!) ?? 0) + 1);
  }

  const topInterests = [...openFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([interest, opens]) => ({ interest, opens }));

  const firstEvent = Math.min(...events.map((e) => e.timestamp));
  const activeForDays = Math.round((Date.now() - firstEvent) / 86_400_000);

  return { totalEvents: events.length, opens, saves, skips, topInterests, activeForDays };
}

export function clearTasteData(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function hasTasteData(): boolean {
  const profile = loadProfile();
  return profile.events.length > 0;
}

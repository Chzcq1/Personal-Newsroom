// ============================================================
// SCHEDULER SETTINGS — Sprint 8 Task A
//
// Flexible delivery schedule stored in localStorage.
// Replaces the fixed 07:00 / 18:00 two-toggle system
// with a custom slot-based approach.
//
// DB migration path: replace localStorage calls with
//   GET/PUT /api/settings/schedule
//
// Schema: { slots: ScheduleSlot[], updatedAt: string }
// ============================================================

const STORAGE_KEY = "ai-newsroom:schedule-v2";

export interface ScheduleSlot {
  id: string;
  hour: number;
  minute: number;
  label: string;
  enabled: boolean;
  daysFilter: "all" | "weekdays" | "weekends";
}

export interface ScheduleSettings {
  slots: ScheduleSlot[];
  updatedAt: string;
}

const DEFAULT_SLOTS: ScheduleSlot[] = [
  {
    id: "morning-default",
    hour: 7,
    minute: 0,
    label: "Morning Briefing",
    enabled: true,
    daysFilter: "all",
  },
  {
    id: "evening-default",
    hour: 18,
    minute: 0,
    label: "Evening Recap",
    enabled: true,
    daysFilter: "all",
  },
];

export function loadScheduleSettings(): ScheduleSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { slots: DEFAULT_SLOTS, updatedAt: "" };
    const parsed = JSON.parse(raw) as ScheduleSettings;
    if (!Array.isArray(parsed.slots)) return { slots: DEFAULT_SLOTS, updatedAt: "" };
    return parsed;
  } catch {
    return { slots: DEFAULT_SLOTS, updatedAt: "" };
  }
}

export function saveScheduleSettings(settings: ScheduleSettings): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...settings, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // storage full — ignore
  }
}

export function addSlot(
  settings: ScheduleSettings,
  hour: number,
  minute: number,
  label: string,
  daysFilter: ScheduleSlot["daysFilter"] = "all",
): ScheduleSettings {
  const newSlot: ScheduleSlot = {
    id: `slot-${Date.now()}`,
    hour,
    minute,
    label: label || `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    enabled: true,
    daysFilter,
  };
  return { ...settings, slots: [...settings.slots, newSlot] };
}

export function removeSlot(
  settings: ScheduleSettings,
  slotId: string,
): ScheduleSettings {
  return { ...settings, slots: settings.slots.filter((s) => s.id !== slotId) };
}

export function toggleSlot(
  settings: ScheduleSettings,
  slotId: string,
): ScheduleSettings {
  return {
    ...settings,
    slots: settings.slots.map((s) =>
      s.id === slotId ? { ...s, enabled: !s.enabled } : s,
    ),
  };
}

export function updateSlotDaysFilter(
  settings: ScheduleSettings,
  slotId: string,
  daysFilter: ScheduleSlot["daysFilter"],
): ScheduleSettings {
  return {
    ...settings,
    slots: settings.slots.map((s) =>
      s.id === slotId ? { ...s, daysFilter } : s,
    ),
  };
}

export function formatSlotTime(slot: ScheduleSlot): string {
  return `${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}`;
}

export function getNextDeliveryForSlot(slot: ScheduleSlot): string {
  const offset = 7 * 60; // ICT = UTC+7
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const ictNow = new Date(utcMs + offset * 60_000);

  const ictHour = ictNow.getHours() + ictNow.getMinutes() / 60;
  const targetHour = slot.hour + slot.minute / 60;

  const target = new Date(ictNow);
  if (ictHour >= targetHour) {
    target.setDate(target.getDate() + 1);
  }
  target.setHours(slot.hour, slot.minute, 0, 0);

  // Apply days filter
  if (slot.daysFilter !== "all") {
    const day = target.getDay(); // 0=Sun, 6=Sat
    const isWeekend = day === 0 || day === 6;
    if (slot.daysFilter === "weekdays" && isWeekend) {
      // Skip to next Monday
      const daysToMon = day === 0 ? 1 : 8 - day;
      target.setDate(target.getDate() + daysToMon);
    } else if (slot.daysFilter === "weekends" && !isWeekend) {
      // Skip to next Saturday
      const daysToSat = 6 - day;
      target.setDate(target.getDate() + (daysToSat === 0 ? 7 : daysToSat));
    }
  }

  const diffMs = target.getTime() - ictNow.getTime();
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffMins = Math.floor((diffMs % 3_600_000) / 60_000);

  if (diffHours > 23) {
    const days = Math.floor(diffHours / 24);
    return `in ${days}d ${diffHours % 24}h`;
  }
  if (diffHours > 0) return `in ${diffHours}h ${diffMins}m`;
  return `in ${diffMins}m`;
}

export function getDaysFilterLabel(filter: ScheduleSlot["daysFilter"]): string {
  switch (filter) {
    case "weekdays": return "Mon–Fri";
    case "weekends": return "Sat–Sun";
    default: return "Every day";
  }
}

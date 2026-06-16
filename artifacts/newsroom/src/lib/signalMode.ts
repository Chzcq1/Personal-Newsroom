// ============================================================
// SIGNAL MODE — Client-side persistence
//
// Persists user's signal mode selection in localStorage and
// syncs with the backend API on changes.
// ============================================================

export type SignalMode = "safe" | "balanced" | "raw";

const STORAGE_KEY = "ai-newsroom:signal-mode";

export function getSignalMode(): SignalMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "safe" || stored === "balanced" || stored === "raw") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return "balanced";
}

export function setSignalMode(mode: SignalMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable
  }
}

export const SIGNAL_MODE_META: Record<
  SignalMode,
  {
    label: string;
    tagline: string;
    description: string;
    riskLevel: "low" | "moderate" | "high";
    speed: "slow" | "moderate" | "fast";
    badgeColor: string;
    icon: string;
    pros: string[];
    cons: string[];
  }
> = {
  safe: {
    label: "Safe Mode",
    tagline: "Verified intelligence only",
    description:
      "Only delivers highly confirmed signals with multi-source verification. " +
      "Slower but reliable — best for long-term investors and decision-makers.",
    riskLevel: "low",
    speed: "slow",
    badgeColor: "emerald",
    icon: "shield-check",
    pros: [
      "Multi-source confirmation required",
      "Lowest noise and false positives",
      "Best for long-term decision-making",
    ],
    cons: [
      "May miss early signals",
      "Slower than market real-time",
    ],
  },
  balanced: {
    label: "Balanced",
    tagline: "Default intelligence mode",
    description:
      "Moderate verification with moderate speed. The default setting — balances " +
      "freshness against reliability. Works well for most users.",
    riskLevel: "moderate",
    speed: "moderate",
    badgeColor: "blue",
    icon: "sliders",
    pros: [
      "Best balance of speed and accuracy",
      "Recommended for most users",
      "Moderate noise filtering",
    ],
    cons: [
      "Some early signals may be missed",
    ],
  },
  raw: {
    label: "Raw Signal",
    tagline: "Maximum speed, early access",
    description:
      "Prioritises speed and emerging signals. Tolerates partial source confirmation. " +
      "Best for traders and analysts who want first-mover advantage.",
    riskLevel: "high",
    speed: "fast",
    badgeColor: "amber",
    icon: "zap",
    pros: [
      "Fastest signal delivery",
      "Access to emerging/unconfirmed signals",
      "Maximum coverage",
    ],
    cons: [
      "Higher noise — requires self-filtering",
      "May include unverified signals",
      "Not suitable for uninformed decision-making",
    ],
  },
};

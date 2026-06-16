// ============================================================
// PERSONALITY SETTINGS — Sprint 8 Task E
//
// Stores the user's preferred briefing personality.
// Sent to the API with briefing requests.
//
// DB migration path: GET/PUT /api/settings/personality
// ============================================================

const STORAGE_KEY = "ai-newsroom:personality";

export type BriefingPersonality =
  | "analyst"
  | "concise"
  | "financial"
  | "neutral"
  | "aggressive";

export interface PersonalityOption {
  id: BriefingPersonality;
  name: string;
  description: string;
  tone: string;
}

export const PERSONALITY_OPTIONS: PersonalityOption[] = [
  {
    id: "analyst",
    name: "Analyst",
    description: "Deep structural analysis with long-term implications",
    tone: "Evidence-driven, referenced, layered",
  },
  {
    id: "concise",
    name: "Concise",
    description: "Maximum signal, minimum words",
    tone: "Tight, factual, no padding",
  },
  {
    id: "financial",
    name: "Financial",
    description: "Investment lens — markets, earnings, valuations",
    tone: "Market-oriented, quantitative",
  },
  {
    id: "neutral",
    name: "Neutral",
    description: "Balanced reporting, no editorial stance",
    tone: "Objective, measured, factual",
  },
  {
    id: "aggressive",
    name: "Contrarian",
    description: "Challenges assumptions, surfaces hidden risks",
    tone: "Direct, questioning, risk-focused",
  },
];

export function getPersonality(): BriefingPersonality {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "analyst";
    const val = JSON.parse(raw) as string;
    if (PERSONALITY_OPTIONS.find((p) => p.id === val)) {
      return val as BriefingPersonality;
    }
    return "analyst";
  } catch {
    return "analyst";
  }
}

export function setPersonality(personality: BriefingPersonality): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(personality));
  } catch {
    // ignore
  }
}

export function getPersonalityOption(id: BriefingPersonality): PersonalityOption {
  return PERSONALITY_OPTIONS.find((p) => p.id === id) ?? PERSONALITY_OPTIONS[0];
}

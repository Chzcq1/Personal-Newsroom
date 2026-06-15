// ============================================================
// INTEREST PROFILE — localStorage persistence
//
// Stores user's active interests for personal feed generation.
// Interface designed for DB migration: replace localStorage
// calls with API calls to GET/PUT /api/interests.
//
// DB migration path (after login activation):
//   getInterests()    → GET /api/interests
//   addInterest()     → POST /api/interests
//   removeInterest()  → DELETE /api/interests/:name
//   setInterests()    → PUT /api/interests
// ============================================================

const STORAGE_KEY = "ai-newsroom:interest-profile";

// Preset interest options (matches server-side INTEREST_DEFINITIONS)
export const PRESET_INTERESTS = [
  "Tesla",
  "Nvidia",
  "BYD",
  "Bitcoin",
  "Ethereum",
  "Nintendo",
  "Steam",
  "OpenAI",
  "Anthropic",
  "AI Agents",
  "EV",
  "Gaming",
];

export interface InterestProfile {
  interests: string[];
  updatedAt: string;
}

export function getInterestProfile(): InterestProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { interests: [], updatedAt: new Date().toISOString() };
    return JSON.parse(raw) as InterestProfile;
  } catch {
    return { interests: [], updatedAt: new Date().toISOString() };
  }
}

export function getInterests(): string[] {
  return getInterestProfile().interests;
}

export function setInterests(interests: string[]): void {
  const profile: InterestProfile = {
    interests: [...new Set(interests)], // deduplicate
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function addInterest(interest: string): void {
  const current = getInterests();
  if (!current.includes(interest)) {
    setInterests([...current, interest]);
  }
}

export function removeInterest(interest: string): void {
  setInterests(getInterests().filter((i) => i !== interest));
}

export function hasInterest(interest: string): boolean {
  return getInterests().includes(interest);
}

export function clearInterests(): void {
  localStorage.removeItem(STORAGE_KEY);
}

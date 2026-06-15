// ============================================================
// USER PREFERENCES — LocalStorage persistence (Task E)
//
// Stores user preferences in localStorage.
// Key: "ai-newsroom:preferences"
//
// Architecture notes:
//   - Future migration: replace localStorage calls with
//     GET /api/preferences and PUT /api/preferences
//   - When login is added, preferences become user-scoped
//     (stored in the database tied to the user's account)
// ============================================================

const STORAGE_KEY = "ai-newsroom:preferences";

export interface UserPreferences {
  lastViewedTopicId: string | null;
  favoriteTopics: string[];
}

const DEFAULT_PREFERENCES: UserPreferences = {
  lastViewedTopicId: null,
  favoriteTopics: [],
};

export function getPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      lastViewedTopicId: parsed.lastViewedTopicId ?? null,
      favoriteTopics: Array.isArray(parsed.favoriteTopics)
        ? parsed.favoriteTopics
        : [],
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs: Partial<UserPreferences>): void {
  try {
    const current = getPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

export function setLastViewedTopic(topicId: string): void {
  savePreferences({ lastViewedTopicId: topicId });
}

export function getLastViewedTopic(): string | null {
  return getPreferences().lastViewedTopicId;
}

export function toggleFavoriteTopic(topicId: string): boolean {
  const prefs = getPreferences();
  const isFav = prefs.favoriteTopics.includes(topicId);
  const updated = isFav
    ? prefs.favoriteTopics.filter((id) => id !== topicId)
    : [...prefs.favoriteTopics, topicId];
  savePreferences({ favoriteTopics: updated });
  return !isFav;
}

export function isFavoriteTopic(topicId: string): boolean {
  return getPreferences().favoriteTopics.includes(topicId);
}

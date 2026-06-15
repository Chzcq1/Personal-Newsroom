// ============================================================
// BRIEFING STORAGE — LocalStorage persistence layer (Task D)
//
// Stores saved briefings in localStorage under the key
// "ai-newsroom:saved-briefings".
//
// Architecture notes:
//   - All data is serialized as JSON in localStorage
//   - Each briefing gets a unique ID (timestamp + random suffix)
//   - Interface is designed for future migration to PostgreSQL:
//     replace the localStorage calls with API calls to
//     POST /api/briefings, GET /api/briefings, DELETE /api/briefings/:id
//   - Maximum storage: 50 briefings (oldest removed automatically)
// ============================================================

const STORAGE_KEY = "ai-newsroom:saved-briefings";
const MAX_SAVED = 50;

export interface SavedArticle {
  title: string;
  url: string;
  description: string | null;
  pubDate: string | null;
  source: string | null;
}

export interface SavedBriefing {
  id: string;
  topicId: string;
  topicLabel: string;
  topicLabelTh: string;
  topicIcon: string;
  summary: string;
  sources: SavedArticle[];
  savedAt: string;
  generatedAt: string;
  provider: string;
  articleCount: number;
}

function readAll(): SavedBriefing[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(briefings: SavedBriefing[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(briefings));
  } catch {
    // Ignore storage quota errors
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Save a briefing to local storage.
 * Returns the saved briefing with its generated ID.
 */
export function saveBriefing(
  briefing: Omit<SavedBriefing, "id" | "savedAt">,
): SavedBriefing {
  const all = readAll();
  const saved: SavedBriefing = {
    ...briefing,
    id: generateId(),
    savedAt: new Date().toISOString(),
  };

  const updated = [saved, ...all].slice(0, MAX_SAVED);
  writeAll(updated);
  return saved;
}

/**
 * Get all saved briefings, newest first.
 */
export function getSavedBriefings(): SavedBriefing[] {
  return readAll();
}

/**
 * Get a single saved briefing by ID.
 */
export function getSavedBriefingById(id: string): SavedBriefing | undefined {
  return readAll().find((b) => b.id === id);
}

/**
 * Delete a saved briefing by ID.
 * Returns true if found and deleted, false if not found.
 */
export function deleteSavedBriefing(id: string): boolean {
  const all = readAll();
  const filtered = all.filter((b) => b.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
}

/**
 * Check if a briefing for a given topic+generatedAt is already saved.
 * Used to show/hide the save button.
 */
export function isBriefingSaved(topicId: string, generatedAt: string): boolean {
  return readAll().some(
    (b) => b.topicId === topicId && b.generatedAt === generatedAt,
  );
}

/**
 * Get count of saved briefings.
 */
export function getSavedCount(): number {
  return readAll().length;
}

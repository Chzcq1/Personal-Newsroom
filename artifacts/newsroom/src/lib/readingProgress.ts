// ============================================================
// READING PROGRESS — Sprint 7 Task F
//
// Tracks which article URLs have been "viewed" (scrolled into
// view to ≥50%) and stores them in localStorage.
//
// No gamification — just a subtle session counter.
// ============================================================

import { useState, useCallback } from "react";

const STORAGE_KEY = "ai-newsroom:read-articles";
const MAX_STORED = 500;

function loadReadUrls(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveReadUrls(urls: Set<string>): void {
  try {
    const arr = Array.from(urls).slice(-MAX_STORED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // storage full — ignore
  }
}

export function isArticleRead(url: string): boolean {
  return loadReadUrls().has(url);
}

/**
 * React hook — tracks read state for a list of article URLs.
 * Returns the count of read articles and a markRead callback.
 * Re-renders only when a new URL is marked.
 */
export function useReadingProgress(urls: string[]) {
  const [readUrls, setReadUrls] = useState<Set<string>>(() => loadReadUrls());

  const markRead = useCallback((url: string) => {
    setReadUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      saveReadUrls(next);
      return next;
    });
  }, []);

  const readCount = urls.filter((url) => readUrls.has(url)).length;

  return { readCount, total: urls.length, markRead, readUrls };
}

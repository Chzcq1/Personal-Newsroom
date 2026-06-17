// ============================================================
// useAnalytics — Sprint 21 Task C/F
//
// Lightweight event tracking hook. Fire-and-forget — never
// blocks the UI and silently swallows errors.
// ============================================================

import { useCallback, useRef } from "react";

export type EventType =
  | "PAGE_VIEW"
  | "FEED_VIEW"
  | "ARTICLE_OPEN"
  | "BRIEFING_SAVE"
  | "WATCHLIST_ADD"
  | "WATCHLIST_REMOVE"
  | "TELEGRAM_CONNECT"
  | "TELEGRAM_TEST"
  | "FEEDBACK_MORE"
  | "FEEDBACK_LESS"
  | "FEEDBACK_IRRELEVANT"
  | "INTEREST_UPDATE"
  | "ONBOARDING_STEP"
  | "BRIEFING_GENERATE"
  | "SIGNAL_MODE_CHANGE"
  | "SETTINGS_OPEN";

interface TrackOptions {
  properties?: Record<string, unknown>;
  url?: string;
}

function getProfileId(): string | null {
  try {
    return localStorage.getItem("ai-newsroom:profileId") ?? null;
  } catch {
    return null;
  }
}

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem("ai-newsroom:sessionId");
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem("ai-newsroom:sessionId", sid);
    }
    return sid;
  } catch {
    return "unknown";
  }
}

export function useAnalytics() {
  const queueRef = useRef<Array<{ eventType: string; properties?: Record<string, unknown>; url?: string }>>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    const items = queueRef.current.splice(0);
    if (items.length === 0) return;

    const profileId = getProfileId();
    const sessionId = getSessionId();
    const url = window.location.pathname;

    const events = items.map((item) => ({
      ...item,
      profileId: profileId ?? undefined,
      sessionId,
      url: item.url ?? url,
    }));

    fetch(`${import.meta.env.BASE_URL}api/events/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    }).catch(() => {
      // Silently ignore — analytics must never break the app
    });
  }, []);

  const track = useCallback(
    (eventType: EventType, options?: TrackOptions) => {
      queueRef.current.push({
        eventType,
        properties: options?.properties,
        url: options?.url,
      });

      // Debounce flush — batch events that happen in the same frame
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(flush, 300);
    },
    [flush],
  );

  return { track };
}

// ── Standalone helper for use outside React components ──────

export function trackEvent(
  eventType: EventType,
  properties?: Record<string, unknown>,
): void {
  const profileId = getProfileId();
  const sessionId = getSessionId();

  fetch(`${import.meta.env.BASE_URL ?? "/"}api/events/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType,
      profileId: profileId ?? undefined,
      sessionId,
      properties,
      url: window.location.pathname,
    }),
    keepalive: true,
  }).catch(() => {});
}

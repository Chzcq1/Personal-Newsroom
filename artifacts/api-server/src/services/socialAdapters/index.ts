// ============================================================
// SOCIAL ADAPTERS — Public API
// Sprint 28 — Product Realignment
//
// All social platform adapters. Active adapters return real
// data. Architecture-ready adapters return [] until credentials
// are configured.
// ============================================================

export { redditSocialAdapter } from "./redditAdapter.js";
export { youtubeAdapter } from "./youtubeAdapter.js";
export { googleTrendsAdapter } from "./googleTrendsAdapter.js";
export { githubTrendingAdapter } from "./githubTrendingAdapter.js";
export { twitterSocialAdapter } from "./twitterAdapter.js";
export { tiktokAdapter } from "./tiktokAdapter.js";
export { instagramAdapter } from "./instagramAdapter.js";
export { facebookAdapter } from "./facebookAdapter.js";

import { redditSocialAdapter } from "./redditAdapter.js";
import { youtubeAdapter } from "./youtubeAdapter.js";
import { googleTrendsAdapter } from "./googleTrendsAdapter.js";
import { githubTrendingAdapter } from "./githubTrendingAdapter.js";
import { twitterSocialAdapter } from "./twitterAdapter.js";
import { tiktokAdapter } from "./tiktokAdapter.js";
import { instagramAdapter } from "./instagramAdapter.js";
import { facebookAdapter } from "./facebookAdapter.js";
import type { RawSignal } from "../trendAggregation/trendNormalizer.js";

const ALL_ADAPTERS = [
  redditSocialAdapter,
  youtubeAdapter,
  googleTrendsAdapter,
  githubTrendingAdapter,
  twitterSocialAdapter,
  tiktokAdapter,
  instagramAdapter,
  facebookAdapter,
];

export function getActiveAdapters() {
  return ALL_ADAPTERS.filter((a) => a.isEnabled);
}

export function getAllAdapters() {
  return ALL_ADAPTERS;
}

// ── Aggregate fetch from all active adapters ─────────────────

export async function fetchAllTrending(
  interests: string[] = [],
  limitPerAdapter = 20,
): Promise<RawSignal[]> {
  const active = getActiveAdapters();
  const results = await Promise.allSettled(
    active.map((adapter) => adapter.fetchTrending(interests, limitPerAdapter)),
  );

  const signals: RawSignal[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") signals.push(...result.value);
  }
  return signals;
}

// ── Adapter status for health reporting ──────────────────────

export function getAdapterStatus() {
  return ALL_ADAPTERS.map((a) => ({
    name: a.name,
    platform: a.platform,
    enabled: a.isEnabled,
    status: a.isEnabled ? "active" : "architecture-ready",
  }));
}

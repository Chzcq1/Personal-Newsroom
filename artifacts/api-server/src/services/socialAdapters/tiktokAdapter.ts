// ============================================================
// TIKTOK ADAPTER
// Sprint 28 — Architecture-Ready Connector
//
// ARCHITECTURE-READY: TikTok Research API credentials needed.
// This API requires business account approval from TikTok.
//
// When approved, this adapter will fetch trending videos
// and hashtag velocity data as real trend signals.
// ============================================================

import type { RawSignal } from "../trendAggregation/trendNormalizer.js";

export const tiktokAdapter = {
  name: "TikTok",
  platform: "tiktok" as const,
  isEnabled: false, // ARCHITECTURE-READY: TikTok Research API needed

  async fetchTrending(_interests: string[] = [], _limit = 20): Promise<RawSignal[]> {
    // ARCHITECTURE-READY: return empty, not fake data
    return [];
  },
};

// ============================================================
// INSTAGRAM ADAPTER
// Sprint 28 — Architecture-Ready Connector
//
// ARCHITECTURE-READY: Instagram Graph API credentials needed.
// Set INSTAGRAM_ACCESS_TOKEN in Replit Secrets to activate.
// ============================================================

import type { RawSignal } from "../trendAggregation/trendNormalizer.js";

export const instagramAdapter = {
  name: "Instagram",
  platform: "tiktok" as const, // grouped under short-video platforms
  isEnabled: false, // ARCHITECTURE-READY: Instagram Graph API token needed

  async fetchTrending(_interests: string[] = [], _limit = 20): Promise<RawSignal[]> {
    // ARCHITECTURE-READY: return empty, not fake data
    return [];
  },
};

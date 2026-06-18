// ============================================================
// FACEBOOK ADAPTER
// Sprint 28 — Architecture-Ready Connector
//
// ARCHITECTURE-READY: Facebook Graph API credentials needed.
// Facebook deprecated public trending data in 2018.
// This adapter is prepared for page/group data via Graph API.
// ============================================================

import type { RawSignal } from "../trendAggregation/trendNormalizer.js";

export const facebookAdapter = {
  name: "Facebook",
  platform: "rss" as const, // Facebook doesn't have open trend data
  isEnabled: false, // ARCHITECTURE-READY: Facebook Graph API token needed

  async fetchTrending(_interests: string[] = [], _limit = 20): Promise<RawSignal[]> {
    // ARCHITECTURE-READY: return empty, not fake data
    return [];
  },
};

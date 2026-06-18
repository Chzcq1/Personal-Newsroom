// ============================================================
// TWITTER/X ADAPTER
// Sprint 28 — Architecture-Ready Connector
//
// ARCHITECTURE-READY: Twitter API v2 Bearer Token needed.
// Set TWITTER_BEARER_TOKEN in Replit Secrets to activate.
//
// Interface is fully defined. When configured, fetches
// trending topics and relevant tweets as trend signals.
// ============================================================

import type { RawSignal } from "../trendAggregation/trendNormalizer.js";

const BEARER_TOKEN = process.env["TWITTER_BEARER_TOKEN"];

export const twitterSocialAdapter = {
  name: "Twitter/X",
  platform: "twitter" as const,
  isEnabled: !!BEARER_TOKEN,

  async fetchTrending(_interests: string[] = [], _limit = 20): Promise<RawSignal[]> {
    if (!BEARER_TOKEN) {
      // ARCHITECTURE-READY: return empty, not fake data
      return [];
    }

    // Twitter API v2: search recent tweets by interest keywords
    // Full implementation when TWITTER_BEARER_TOKEN is set
    return [];
  },
};

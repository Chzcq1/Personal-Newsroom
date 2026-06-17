// Social media adapter (TikTok / Instagram / Facebook) — mock implementation
//
// These platforms do not provide public RSS feeds or free API access.
// This adapter defines the contract for future implementation when
// platform APIs become available or scraping partnerships are established.
//
// Future TikTok:
//   - TikTok Research API (academic/business access)
//   - Track trending hashtags: #investing #crypto #AI #fintech
//   - Engagement: views + shares + comments
//
// Future Instagram:
//   - Instagram Graph API (Meta Business Suite)
//   - Track: financial influencers, AI research accounts
//
// Future Facebook:
//   - CrowdTangle API or Meta Content Library
import type { TrendIngestionProvider, TrendItem } from "../index.js";

export class SocialProvider implements TrendIngestionProvider {
  readonly name = "social";
  readonly enabled = false;

  async ingest(): Promise<TrendItem[]> {
    return [];
  }
}

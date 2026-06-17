// Twitter/X adapter — mock implementation (future-ready interface)
//
// Full Twitter/X ingestion requires API v2 access (paid tier).
// This adapter defines the interface contract so future integration
// requires only implementing the ingest() method.
//
// Future implementation:
//   - Twitter API v2: GET /2/tweets/search/recent
//   - Track: $BTC $NVDA $TSLA #AI #crypto #investing
//   - Engagement score from retweet_count + like_count
import type { TrendIngestionProvider, TrendItem } from "../index.js";

export class TwitterProvider implements TrendIngestionProvider {
  readonly name = "twitter";
  readonly enabled = false;

  async ingest(): Promise<TrendItem[]> {
    return [];
  }
}

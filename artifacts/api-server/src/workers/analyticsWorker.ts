// ============================================================
// ANALYTICS AGGREGATION WORKER — Sprint 14 Task G / Task H
//
// Periodically aggregates cost and delivery metrics into DB.
// Runs every 15 minutes.
// ============================================================

import { BaseWorker } from "./baseWorker.js";
import { WORKER_NAMES } from "./workerTypes.js";
import { logger } from "../lib/logger.js";
import { getDeliveryStats } from "../repositories/deliveryLogRepository.js";
import { getProfileCount } from "../repositories/userProfileRepository.js";

interface AggregatedStats {
  profileCount: number;
  deliveryStats: {
    total: number;
    delivered: number;
    failed: number;
    totalTokens: number;
  };
  aggregatedAt: string;
}

let latestAggregation: AggregatedStats | null = null;

export class AnalyticsWorker extends BaseWorker {
  readonly name = WORKER_NAMES.ANALYTICS_AGGREGATION;
  readonly intervalMs = 15 * 60_000; // 15 minutes

  async execute(): Promise<void> {
    const [profileCount, deliveryStats] = await Promise.all([
      getProfileCount(),
      getDeliveryStats(),
    ]);

    latestAggregation = {
      profileCount,
      deliveryStats,
      aggregatedAt: new Date().toISOString(),
    };

    logger.info({ profileCount, deliveries: deliveryStats.total }, "[AnalyticsWorker] Aggregated stats");
  }
}

export function getLatestAggregation(): AggregatedStats | null {
  return latestAggregation;
}

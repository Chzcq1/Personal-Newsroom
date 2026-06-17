import { BaseWorker } from "./baseWorker.js";
import { ingestAllProviders } from "../services/trendIngestion/index.js";
import { logger } from "../lib/logger.js";

export class TrendIngestionWorker extends BaseWorker {
  readonly name = "trend-ingestion-worker";
  readonly intervalMs = 15 * 60 * 1000;

  async execute(): Promise<void> {
    logger.info("[TrendIngestionWorker] Starting ingestion cycle");
    const result = await ingestAllProviders();
    logger.info(
      { ingested: result.ingested, bySource: result.bySource, errors: result.errors.length },
      "[TrendIngestionWorker] Ingestion cycle complete",
    );
  }
}

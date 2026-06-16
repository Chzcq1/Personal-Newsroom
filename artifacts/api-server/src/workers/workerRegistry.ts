// ============================================================
// WORKER REGISTRY — Sprint 14 Task G
//
// Central registry for all background workers.
// Call startAllWorkers() on server startup.
// ============================================================

import { RetryWorker } from "./retryWorker.js";
import { NarrativeWorker } from "./narrativeWorker.js";
import { AnalyticsWorker } from "./analyticsWorker.js";
import type { IWorker, WorkerHealth } from "./workerTypes.js";
import { logger } from "../lib/logger.js";

const workers: IWorker[] = [
  new RetryWorker(),
  new NarrativeWorker(),
  new AnalyticsWorker(),
];

export function startAllWorkers(): void {
  for (const worker of workers) {
    worker.start();
  }
  logger.info({ count: workers.length }, "[WorkerRegistry] All workers started");
}

export function stopAllWorkers(): void {
  for (const worker of workers) {
    worker.stop();
  }
  logger.info("[WorkerRegistry] All workers stopped");
}

export function getWorkersHealth(): WorkerHealth[] {
  return workers.map((w) => w.getHealth());
}

export function getWorkerByName(name: string): IWorker | undefined {
  return workers.find((w) => w.name === name);
}

// ============================================================
// BASE WORKER — Sprint 14 Task G
//
// Abstract base class for all background workers.
// Handles start/stop, health tracking, and error isolation.
// ============================================================

import { logger } from "../lib/logger.js";
import type { IWorker, WorkerHealth, WorkerStatus } from "./workerTypes.js";

export abstract class BaseWorker implements IWorker {
  abstract readonly name: string;
  abstract readonly intervalMs: number;

  private timer: NodeJS.Timeout | null = null;
  private status: WorkerStatus = "idle";
  private lastRunAt: string | null = null;
  private lastSuccessAt: string | null = null;
  private lastErrorAt: string | null = null;
  private lastError: string | null = null;
  private runCount = 0;
  private errorCount = 0;

  abstract execute(): Promise<void>;

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.runOnce(), this.intervalMs);
    logger.info({ worker: this.name, intervalMs: this.intervalMs }, "[Worker] Started");
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.status = "stopped";
    logger.info({ worker: this.name }, "[Worker] Stopped");
  }

  async runOnce(): Promise<void> {
    if (this.status === "running") return;
    this.status = "running";
    this.lastRunAt = new Date().toISOString();
    this.runCount++;

    try {
      await this.execute();
      this.status = "idle";
      this.lastSuccessAt = new Date().toISOString();
    } catch (err) {
      this.status = "error";
      this.lastErrorAt = new Date().toISOString();
      this.lastError = err instanceof Error ? err.message : String(err);
      this.errorCount++;
      logger.error({ worker: this.name, err }, "[Worker] Execution error");
    }
  }

  getHealth(): WorkerHealth {
    return {
      name: this.name,
      status: this.status,
      lastRunAt: this.lastRunAt,
      lastSuccessAt: this.lastSuccessAt,
      lastErrorAt: this.lastErrorAt,
      lastError: this.lastError,
      runCount: this.runCount,
      errorCount: this.errorCount,
      intervalMs: this.intervalMs,
    };
  }
}

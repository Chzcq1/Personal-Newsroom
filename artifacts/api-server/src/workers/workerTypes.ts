// ============================================================
// WORKER TYPE CONTRACTS — Sprint 14 Task G
//
// Defines the interfaces for all background worker processes.
// Current implementation: single-process, scheduled via setInterval.
// Future: extract to separate Node.js worker threads or processes
// for Railway/Render/Fly.io multi-process deployment.
// ============================================================

export type WorkerStatus = "idle" | "running" | "error" | "stopped";

export interface WorkerHealth {
  name: string;
  status: WorkerStatus;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  runCount: number;
  errorCount: number;
  intervalMs: number;
}

export interface IWorker {
  readonly name: string;
  readonly intervalMs: number;
  start(): void;
  stop(): void;
  getHealth(): WorkerHealth;
  runOnce(): Promise<void>;
}

// ── Worker Names (used as registry keys) ──────────────────────

export const WORKER_NAMES = {
  DIGEST_GENERATION: "digest-generation-worker",
  TELEGRAM_DELIVERY: "telegram-delivery-worker",
  RETRY: "retry-worker",
  NARRATIVE_UPDATE: "narrative-update-worker",
  ANALYTICS_AGGREGATION: "analytics-aggregation-worker",
} as const;

export type WorkerName = (typeof WORKER_NAMES)[keyof typeof WORKER_NAMES];

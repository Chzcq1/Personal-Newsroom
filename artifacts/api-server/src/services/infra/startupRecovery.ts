// ============================================================
// STARTUP RECOVERY — Sprint 14 Task K
//
// Runs on server startup to:
//   1. Verify DB connection
//   2. Check for pending queue items from previous run
//   3. Log infrastructure health
//   4. Activate graceful degraded mode if DB unavailable
// ============================================================

import { logger } from "../../lib/logger.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getQueueStatus } from "../delivery/deliveryQueue.js";

export interface StartupReport {
  dbConnected: boolean;
  dbLatencyMs: number | null;
  pendingDeliveries: number;
  recoveredAt: string;
  degradedMode: boolean;
  warnings: string[];
}

let startupReport: StartupReport | null = null;

export async function runStartupRecovery(): Promise<StartupReport> {
  const warnings: string[] = [];
  const recoveredAt = new Date().toISOString();

  // 1. DB health check
  let dbConnected = false;
  let dbLatencyMs: number | null = null;

  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - start;
    dbConnected = true;
    logger.info({ dbLatencyMs }, "[StartupRecovery] DB connection verified");
  } catch (err) {
    dbConnected = false;
    const msg = "DB connection failed — running in degraded mode (in-memory only)";
    warnings.push(msg);
    logger.warn({ err }, `[StartupRecovery] ${msg}`);
  }

  // 2. Pending delivery check
  let pendingDeliveries = 0;
  if (dbConnected) {
    try {
      const queueStatus = await getQueueStatus();
      pendingDeliveries = queueStatus.pending;
      if (pendingDeliveries > 0) {
        const msg = `${pendingDeliveries} pending delivery queue items detected — retry worker will process them`;
        warnings.push(msg);
        logger.warn({ pendingDeliveries }, `[StartupRecovery] ${msg}`);
      }
    } catch (err) {
      logger.warn({ err }, "[StartupRecovery] Could not check delivery queue");
    }
  }

  // 3. Build report
  const degradedMode = !dbConnected;

  startupReport = {
    dbConnected,
    dbLatencyMs,
    pendingDeliveries,
    recoveredAt,
    degradedMode,
    warnings,
  };

  if (degradedMode) {
    logger.warn("[StartupRecovery] DEGRADED MODE ACTIVE — all persistence operations will be no-ops");
  } else {
    logger.info("[StartupRecovery] Full persistence mode — all services operational");
  }

  return startupReport;
}

export function getStartupReport(): StartupReport | null {
  return startupReport;
}

export function isInDegradedMode(): boolean {
  return startupReport?.degradedMode ?? false;
}

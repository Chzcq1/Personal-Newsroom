// ============================================================
// NARRATIVE UPDATE WORKER — Sprint 14 Task G
//
// Periodically prunes expired narrative threads from DB
// and syncs in-memory state with persistent storage.
// Runs every 30 minutes.
// ============================================================

import { BaseWorker } from "./baseWorker.js";
import { WORKER_NAMES } from "./workerTypes.js";
import { logger } from "../lib/logger.js";
import { db, narrativeMemoryTable } from "@workspace/db";
import { lte } from "drizzle-orm";

export class NarrativeWorker extends BaseWorker {
  readonly name = WORKER_NAMES.NARRATIVE_UPDATE;
  readonly intervalMs = 30 * 60_000; // 30 minutes

  async execute(): Promise<void> {
    const now = new Date();

    try {
      const result = await db
        .delete(narrativeMemoryTable)
        .where(lte(narrativeMemoryTable.expiresAt, now));
      logger.info({ deletedCount: result.rowCount ?? 0 }, "[NarrativeWorker] Pruned expired threads");
    } catch (err) {
      logger.warn({ err }, "[NarrativeWorker] Prune failed — DB may be unavailable");
    }
  }
}

// ============================================================
// DELIVERY LOG REPOSITORY — Sprint 14 Task E / Task D
// ============================================================

import { db, deliveryLogsTable, type DeliveryLog, type InsertDeliveryLog } from "@workspace/db";
import { desc, eq, gte } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export async function insertDeliveryLog(log: InsertDeliveryLog): Promise<DeliveryLog | null> {
  try {
    const [result] = await db.insert(deliveryLogsTable).values(log).returning();
    return result ?? null;
  } catch (err) {
    logger.warn({ err }, "[DeliveryLogRepo] insert failed");
    return null;
  }
}

export async function updateDeliveryStatus(
  id: string,
  status: "delivered" | "failed",
  extra?: { errorMessage?: string; retryCount?: number; aiTokensUsed?: number },
): Promise<void> {
  try {
    await db
      .update(deliveryLogsTable)
      .set({
        status,
        deliveredAt: status === "delivered" ? new Date() : undefined,
        failedAt: status === "failed" ? new Date() : undefined,
        errorMessage: extra?.errorMessage,
        retryCount: extra?.retryCount,
        aiTokensUsed: extra?.aiTokensUsed,
      })
      .where(eq(deliveryLogsTable.id, id));
  } catch (err) {
    logger.warn({ err, id }, "[DeliveryLogRepo] updateStatus failed");
  }
}

export async function getRecentDeliveries(limit = 50): Promise<DeliveryLog[]> {
  try {
    return await db
      .select()
      .from(deliveryLogsTable)
      .orderBy(desc(deliveryLogsTable.createdAt))
      .limit(limit);
  } catch (err) {
    logger.warn({ err }, "[DeliveryLogRepo] getRecent failed");
    return [];
  }
}

export async function getDeliveriesSince(since: Date): Promise<DeliveryLog[]> {
  try {
    return await db
      .select()
      .from(deliveryLogsTable)
      .where(gte(deliveryLogsTable.createdAt, since))
      .orderBy(desc(deliveryLogsTable.createdAt));
  } catch (err) {
    logger.warn({ err }, "[DeliveryLogRepo] getSince failed");
    return [];
  }
}

export async function getDeliveryStats(): Promise<{
  total: number;
  delivered: number;
  failed: number;
  totalTokens: number;
}> {
  try {
    const all = await db.select().from(deliveryLogsTable);
    const delivered = all.filter((d) => d.status === "delivered").length;
    const failed = all.filter((d) => d.status === "failed").length;
    const totalTokens = all.reduce((sum, d) => sum + (d.aiTokensUsed ?? 0), 0);
    return { total: all.length, delivered, failed, totalTokens };
  } catch (err) {
    logger.warn({ err }, "[DeliveryLogRepo] getStats failed");
    return { total: 0, delivered: 0, failed: 0, totalTokens: 0 };
  }
}

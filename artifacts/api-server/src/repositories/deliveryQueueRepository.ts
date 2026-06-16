// ============================================================
// DELIVERY QUEUE REPOSITORY — Sprint 14 Task E
// ============================================================

import {
  db,
  deliveryQueueTable,
  type DeliveryQueueItem,
  type InsertDeliveryQueue,
} from "@workspace/db";
import { eq, and, lte, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export async function enqueueDelivery(item: InsertDeliveryQueue): Promise<DeliveryQueueItem | null> {
  try {
    const [result] = await db
      .insert(deliveryQueueTable)
      .values(item)
      .onConflictDoNothing()
      .returning();
    return result ?? null;
  } catch (err) {
    logger.warn({ err }, "[DeliveryQueueRepo] enqueue failed");
    return null;
  }
}

export async function getDueItems(): Promise<DeliveryQueueItem[]> {
  try {
    const now = new Date();
    return await db
      .select()
      .from(deliveryQueueTable)
      .where(
        and(
          eq(deliveryQueueTable.status, "pending"),
          lte(deliveryQueueTable.nextAttemptAt, now),
        ),
      )
      .orderBy(deliveryQueueTable.createdAt);
  } catch (err) {
    logger.warn({ err }, "[DeliveryQueueRepo] getDue failed");
    return [];
  }
}

export async function markDelivered(id: string): Promise<void> {
  try {
    await db
      .update(deliveryQueueTable)
      .set({ status: "sent", deliveredAt: new Date(), updatedAt: new Date() })
      .where(eq(deliveryQueueTable.id, id));
  } catch (err) {
    logger.warn({ err, id }, "[DeliveryQueueRepo] markDelivered failed");
  }
}

export async function markFailed(id: string, error: string, nextAttemptAt?: Date): Promise<void> {
  try {
    await db
      .update(deliveryQueueTable)
      .set({
        status: nextAttemptAt ? "pending" : "failed",
        lastError: error,
        retryCount: db.$count(deliveryQueueTable, eq(deliveryQueueTable.id, id)),
        nextAttemptAt: nextAttemptAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(deliveryQueueTable.id, id));
  } catch (err) {
    logger.warn({ err, id }, "[DeliveryQueueRepo] markFailed failed");
  }
}

export async function getQueueSnapshot(limit = 20): Promise<DeliveryQueueItem[]> {
  try {
    return await db
      .select()
      .from(deliveryQueueTable)
      .orderBy(desc(deliveryQueueTable.createdAt))
      .limit(limit);
  } catch (err) {
    logger.warn({ err }, "[DeliveryQueueRepo] snapshot failed");
    return [];
  }
}

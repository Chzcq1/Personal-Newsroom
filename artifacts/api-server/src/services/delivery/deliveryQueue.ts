// ============================================================
// DELIVERY QUEUE — Sprint 14 Task E
//
// DB-backed delivery queue with in-memory fallback.
// Replaces the volatile in-memory queue from deliveryRecovery.ts
// while keeping the existing in-memory API as a fallback.
//
// Architecture:
//   enqueue()  → writes to DB (+ in-memory mirror)
//   processDue() → DB-first, falls back to in-memory
//   markSent/markFailed → updates DB record
// ============================================================

import { logger } from "../../lib/logger.js";
import type { BriefingType } from "./deliveryEngine.js";
import {
  enqueueDelivery,
  getDueItems,
  markDelivered,
  markFailed,
  getQueueSnapshot,
} from "../../repositories/deliveryQueueRepository.js";

const RETRY_DELAYS_MS = [60_000, 300_000, 900_000]; // 1m, 5m, 15m

// ── In-memory mirror (used when DB is unavailable) ───────────

interface MemQueueItem {
  id: string;
  digestId: string;
  briefingType: BriefingType;
  rawText: string;
  formattedMessages: string[];
  articleCount: number;
  topicsUsed: string[];
  status: "pending" | "sent" | "failed" | "retrying";
  retryCount: number;
  maxRetries: number;
  nextAttemptAt: Date;
  lastError?: string;
  createdAt: Date;
}

const memQueue: MemQueueItem[] = [];
const MAX_MEM_ITEMS = 48;

function addToMemQueue(item: MemQueueItem): void {
  memQueue.push(item);
  if (memQueue.length > MAX_MEM_ITEMS) memQueue.shift();
}

// ── Public API ────────────────────────────────────────────────

export async function enqueueForDelivery(opts: {
  briefingType: BriefingType;
  rawText: string;
  formattedMessages: string[];
  articleCount: number;
  topicsUsed: string[];
}): Promise<string> {
  const id = `dq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const digestId = `dgst-${Date.now()}`;
  const now = new Date();

  const memItem: MemQueueItem = {
    id,
    digestId,
    briefingType: opts.briefingType,
    rawText: opts.rawText,
    formattedMessages: opts.formattedMessages,
    articleCount: opts.articleCount,
    topicsUsed: opts.topicsUsed,
    status: "pending",
    retryCount: 0,
    maxRetries: 3,
    nextAttemptAt: now,
    createdAt: now,
  };

  addToMemQueue(memItem);

  await enqueueDelivery({
    id,
    digestId,
    briefingType: opts.briefingType,
    rawText: opts.rawText,
    formattedMessages: opts.formattedMessages,
    articleCount: opts.articleCount,
    topicsUsed: opts.topicsUsed,
    status: "pending",
    retryCount: 0,
    maxRetries: 3,
    nextAttemptAt: now,
  });

  logger.info({ id, type: opts.briefingType }, "[DeliveryQueue] Item enqueued");
  return id;
}

export async function getDueDeliveries(): Promise<MemQueueItem[]> {
  try {
    const dbItems = await getDueItems();
    if (dbItems.length > 0) {
      return dbItems.map((d) => ({
        id: d.id,
        digestId: d.digestId,
        briefingType: d.briefingType as BriefingType,
        rawText: d.rawText,
        formattedMessages: d.formattedMessages as string[],
        articleCount: d.articleCount,
        topicsUsed: d.topicsUsed as string[],
        status: d.status as MemQueueItem["status"],
        retryCount: d.retryCount,
        maxRetries: d.maxRetries,
        nextAttemptAt: d.nextAttemptAt ?? new Date(),
        lastError: d.lastError ?? undefined,
        createdAt: d.createdAt,
      }));
    }
  } catch {
    // fall through to in-memory
  }

  const now = Date.now();
  return memQueue.filter(
    (item) => item.status === "pending" && item.nextAttemptAt.getTime() <= now,
  );
}

export async function markQueueItemSent(id: string): Promise<void> {
  const mem = memQueue.find((i) => i.id === id);
  if (mem) mem.status = "sent";
  await markDelivered(id);
  logger.info({ id }, "[DeliveryQueue] Item marked sent");
}

export async function markQueueItemFailed(id: string, error: string): Promise<void> {
  const mem = memQueue.find((i) => i.id === id);
  let nextAttemptAt: Date | undefined;

  if (mem) {
    mem.retryCount++;
    mem.lastError = error;
    if (mem.retryCount < mem.maxRetries) {
      const delayMs = RETRY_DELAYS_MS[Math.min(mem.retryCount - 1, RETRY_DELAYS_MS.length - 1)];
      nextAttemptAt = new Date(Date.now() + delayMs);
      mem.status = "pending";
      mem.nextAttemptAt = nextAttemptAt;
    } else {
      mem.status = "failed";
    }
  }

  await markFailed(id, error, nextAttemptAt);
  logger.warn({ id, error, nextAttemptAt }, "[DeliveryQueue] Item marked failed");
}

export async function getQueueStatus(): Promise<{
  pending: number;
  sent: number;
  failed: number;
  recent: Array<{ id: string; type: string; status: string; createdAt: Date }>;
}> {
  try {
    const items = await getQueueSnapshot(20);
    const pending = items.filter((i) => i.status === "pending").length;
    const sent = items.filter((i) => i.status === "sent").length;
    const failed = items.filter((i) => i.status === "failed").length;
    return {
      pending,
      sent,
      failed,
      recent: items.map((i) => ({
        id: i.id,
        type: i.briefingType,
        status: i.status,
        createdAt: i.createdAt,
      })),
    };
  } catch {
    const pending = memQueue.filter((i) => i.status === "pending").length;
    const sent = memQueue.filter((i) => i.status === "sent").length;
    const failed = memQueue.filter((i) => i.status === "failed").length;
    return {
      pending,
      sent,
      failed,
      recent: memQueue.slice(-10).map((i) => ({
        id: i.id,
        type: i.briefingType,
        status: i.status,
        createdAt: i.createdAt,
      })),
    };
  }
}

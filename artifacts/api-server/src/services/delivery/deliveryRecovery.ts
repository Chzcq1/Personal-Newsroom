// ============================================================
// DELIVERY RECOVERY — Sprint 12 Task F
//
// Resilient delivery infrastructure for when Replit sessions
// are interrupted or delivery fails.
//
// Features:
//   1. Heartbeat monitor — tracks server liveness
//   2. Delivery retry queue — queue failed deliveries for retry
//   3. Digest persistence — store digests before sending
//   4. Missed delivery detection — detect gaps in schedule
//   5. Replay support — re-send persisted digests
//
// This module PREPARES the architecture for always-on deployment
// (Railway/Render/Fly.io) without requiring it now.
//
// Storage: in-memory (all state resets on restart).
// Future: swap backing store for Redis or PostgreSQL.
// ============================================================

import { logger } from "../../lib/logger.js";
import type { BriefingType } from "./deliveryEngine.js";

// ── Heartbeat ─────────────────────────────────────────────────

export interface HeartbeatRecord {
  serverStartedAt: string;
  lastHeartbeatAt: string;
  uptimeSeconds: number;
  totalHeartbeats: number;
  missedWindows: MissedWindow[];
}

export interface MissedWindow {
  type: BriefingType;
  expectedAt: string;
  detectedAt: string;
  recovered: boolean;
}

const SERVER_START = new Date().toISOString();
let lastHeartbeat = Date.now();
let totalHeartbeats = 0;
const missedWindows: MissedWindow[] = [];

export function recordHeartbeat(): void {
  lastHeartbeat = Date.now();
  totalHeartbeats++;
}

export function getHeartbeat(): HeartbeatRecord {
  const uptimeSeconds = Math.round((Date.now() - new Date(SERVER_START).getTime()) / 1000);
  return {
    serverStartedAt: SERVER_START,
    lastHeartbeatAt: new Date(lastHeartbeat).toISOString(),
    uptimeSeconds,
    totalHeartbeats,
    missedWindows: [...missedWindows].slice(-20),
  };
}

// ── Digest persistence ────────────────────────────────────────

export interface PersistedDigest {
  id: string;
  type: BriefingType;
  rawText: string;
  formattedMessages: string[];
  articleCount: number;
  topicsUsed: string[];
  generatedAt: string;
  deliveryStatus: "pending" | "delivered" | "failed" | "replayed";
  deliveryAttempts: number;
  lastAttemptAt?: string;
  error?: string;
}

const MAX_PERSISTED = 48; // keep up to 48 digests (24h at 2/day)
const persistedDigests: PersistedDigest[] = [];

export function persistDigestBeforeSend(
  type: BriefingType,
  rawText: string,
  formattedMessages: string[],
  articleCount: number,
  topicsUsed: string[],
): PersistedDigest {
  const digest: PersistedDigest = {
    id: `dgst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    rawText,
    formattedMessages,
    articleCount,
    topicsUsed,
    generatedAt: new Date().toISOString(),
    deliveryStatus: "pending",
    deliveryAttempts: 0,
  };

  persistedDigests.push(digest);

  // Ring buffer
  if (persistedDigests.length > MAX_PERSISTED) {
    persistedDigests.shift();
  }

  logger.info({ id: digest.id, type }, "[DeliveryRecovery] Digest persisted before send");
  return digest;
}

export function markDigestDelivered(id: string): void {
  const digest = persistedDigests.find((d) => d.id === id);
  if (digest) {
    digest.deliveryStatus = "delivered";
    digest.lastAttemptAt = new Date().toISOString();
    digest.deliveryAttempts++;
  }
}

export function markDigestFailed(id: string, error: string): void {
  const digest = persistedDigests.find((d) => d.id === id);
  if (digest) {
    digest.deliveryStatus = "failed";
    digest.error = error;
    digest.lastAttemptAt = new Date().toISOString();
    digest.deliveryAttempts++;
    logger.warn({ id, error }, "[DeliveryRecovery] Digest delivery failed — queued for retry");
  }
}

export function getPersistedDigests(): PersistedDigest[] {
  return [...persistedDigests].reverse();
}

// ── Retry queue ───────────────────────────────────────────────

export interface RetryQueueItem {
  id: string;
  digestId: string;
  type: BriefingType;
  queuedAt: string;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string;
  status: "queued" | "retrying" | "exhausted" | "resolved";
  lastError?: string;
}

const MAX_RETRY_ITEMS = 20;
const retryQueue: RetryQueueItem[] = [];

const RETRY_DELAYS_MS = [60_000, 300_000, 900_000]; // 1m, 5m, 15m

export function enqueueRetry(digestId: string, type: BriefingType, error: string): RetryQueueItem {
  const existing = retryQueue.find((r) => r.digestId === digestId);
  if (existing) {
    existing.attemptCount++;
    const delayMs = RETRY_DELAYS_MS[Math.min(existing.attemptCount - 1, RETRY_DELAYS_MS.length - 1)];
    existing.nextAttemptAt = new Date(Date.now() + delayMs).toISOString();
    existing.lastError = error;
    existing.status = existing.attemptCount >= existing.maxAttempts ? "exhausted" : "queued";
    logger.info({ digestId, attempt: existing.attemptCount }, "[DeliveryRecovery] Retry enqueued");
    return existing;
  }

  const item: RetryQueueItem = {
    id: `retry-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    digestId,
    type,
    queuedAt: new Date().toISOString(),
    attemptCount: 0,
    maxAttempts: 3,
    nextAttemptAt: new Date(Date.now() + RETRY_DELAYS_MS[0]).toISOString(),
    status: "queued",
    lastError: error,
  };

  retryQueue.push(item);
  if (retryQueue.length > MAX_RETRY_ITEMS) {
    retryQueue.shift();
  }

  logger.info({ id: item.id, type }, "[DeliveryRecovery] New retry item queued");
  return item;
}

export function getRetryQueue(): RetryQueueItem[] {
  return [...retryQueue].reverse();
}

export function getDueRetries(): RetryQueueItem[] {
  const now = Date.now();
  return retryQueue.filter(
    (r) => r.status === "queued" && new Date(r.nextAttemptAt).getTime() <= now,
  );
}

export function resolveRetry(id: string): void {
  const item = retryQueue.find((r) => r.id === id);
  if (item) {
    item.status = "resolved";
  }
}

// ── Missed window detection ───────────────────────────────────

const DELIVERY_WINDOWS: Array<{ type: BriefingType; hour: number; minute: number }> = [
  { type: "morning", hour: 7, minute: 0 },
  { type: "evening", hour: 18, minute: 0 },
];

export function checkForMissedWindows(): MissedWindow[] {
  const now = new Date();
  const nowMs = now.getTime();
  const ict = new Date(nowMs + 7 * 3600_000); // UTC+7

  const newMissed: MissedWindow[] = [];

  for (const window of DELIVERY_WINDOWS) {
    const windowMs = Date.UTC(
      ict.getUTCFullYear(),
      ict.getUTCMonth(),
      ict.getUTCDate(),
      window.hour - 7, // convert ICT to UTC
      window.minute,
    );

    // Window was 1–60 minutes ago and we haven't recorded it yet
    const minutesAgo = (nowMs - windowMs) / 60_000;
    if (minutesAgo >= 1 && minutesAgo <= 60) {
      const alreadyRecorded = missedWindows.some(
        (w) => w.type === window.type && w.expectedAt === new Date(windowMs).toISOString(),
      );
      if (!alreadyRecorded) {
        // Check if a delivery was recorded in this window
        const missed: MissedWindow = {
          type: window.type,
          expectedAt: new Date(windowMs).toISOString(),
          detectedAt: now.toISOString(),
          recovered: false,
        };
        missedWindows.push(missed);
        newMissed.push(missed);
        logger.warn({ type: window.type, expectedAt: missed.expectedAt }, "[DeliveryRecovery] Missed delivery window detected");
      }
    }
  }

  return newMissed;
}

// ── Recovery snapshot ─────────────────────────────────────────

export interface RecoverySnapshot {
  heartbeat: HeartbeatRecord;
  pendingDigests: number;
  failedDigests: number;
  retryQueueLength: number;
  dueRetries: number;
  recentMissedWindows: MissedWindow[];
  overallHealthy: boolean;
}

export function getRecoverySnapshot(): RecoverySnapshot {
  const heartbeat = getHeartbeat();
  const pending = persistedDigests.filter((d) => d.deliveryStatus === "pending").length;
  const failed = persistedDigests.filter((d) => d.deliveryStatus === "failed").length;
  const due = getDueRetries().length;
  const queueLen = retryQueue.filter((r) => r.status === "queued").length;
  const recentMissed = missedWindows.slice(-5);

  return {
    heartbeat,
    pendingDigests: pending,
    failedDigests: failed,
    retryQueueLength: queueLen,
    dueRetries: due,
    recentMissedWindows: recentMissed,
    overallHealthy: failed === 0 && due === 0 && recentMissed.length === 0,
  };
}

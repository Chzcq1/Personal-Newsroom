// ============================================================
// BILLING ROUTES — Sprint 25 + Sprint 26 (PromptPay activation)
//
// GET  /billing/plans               — list available plans
// GET  /billing/status              — current user plan + usage
// POST /billing/payment/initiate    — start PromptPay payment
// GET  /billing/payment/:id/status  — poll payment status
// POST /billing/payment/:id/confirm — admin: manually verify + activate
// ============================================================

import { Router } from "express";
import { db } from "@workspace/db";
import { payments, subscriptions } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Plan definitions ──────────────────────────────────────

const PLANS = [
  {
    id: "free",
    name: "free",
    displayName: "Free",
    description: "เริ่มต้นใช้งาน INFOX ฟรี",
    priceThb: 0,
    features: [
      "Feed refresh ทุก 5 นาที",
      "AI สรุปสูงสุด 5 ครั้ง/วัน",
      "Watchlist สูงสุด 5 รายการ",
      "ไม่มี Telegram delivery",
    ],
    limits: {
      feedRefreshIntervalSec: 300,
      maxDailySummaries: 5,
      maxWatchlistItems: 5,
      telegramDelivery: false,
      fullSummaries: false,
    },
  },
  {
    id: "pro",
    name: "pro",
    displayName: "Pro",
    description: "สำหรับนักลงทุนที่ต้องการข้อมูลเร็วและครบ",
    priceThb: 299,
    features: [
      "Feed refresh ทุก 60 วินาที",
      "AI สรุปไม่จำกัด",
      "Watchlist ไม่จำกัด",
      "Telegram delivery อัตโนมัติ",
      "สรุปแบบเต็ม (Full Intelligence)",
    ],
    limits: {
      feedRefreshIntervalSec: 60,
      maxDailySummaries: -1,
      maxWatchlistItems: -1,
      telegramDelivery: true,
      fullSummaries: true,
    },
  },
  {
    id: "elite",
    name: "elite",
    displayName: "Elite",
    description: "Intelligence ระดับ Institutional",
    priceThb: 699,
    features: [
      "ทุกอย่างใน Pro",
      "Feed Priority Realtime",
      "Premium Intelligence (Multi-Agent)",
      "Webhook support (เร็วๆ นี้)",
    ],
    limits: {
      feedRefreshIntervalSec: 30,
      maxDailySummaries: -1,
      maxWatchlistItems: -1,
      telegramDelivery: true,
      fullSummaries: true,
      realtimePriority: true,
      premiumIntelligence: true,
    },
  },
];

// ── Helper ────────────────────────────────────────────────

function getPlan(id: string) {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

function getPromptPayPhone(): string | null {
  return process.env["PROMPTPAY_PHONE_NUMBER"] ?? null;
}

// ── Routes ────────────────────────────────────────────────

router.get("/billing/plans", (_req, res) => {
  res.json({ plans: PLANS });
});

router.get("/billing/status", async (req, res) => {
  const userId = req.query.userId as string | undefined;
  const profileId = req.query.profileId as string | undefined;

  let currentPlan = "free";
  let subscription = null;

  if ((userId || profileId) && db) {
    try {
      const uid = userId ?? profileId ?? "";
      const activeSub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, uid))
        .limit(1);
      if (activeSub[0]?.status === "active") {
        currentPlan = activeSub[0].planId;
        subscription = activeSub[0];
      }
    } catch (err) {
      logger.warn({ err }, "Billing status DB query failed");
    }
  }

  res.json({
    currentPlan,
    planDetails: getPlan(currentPlan),
    usage: {
      dailySummariesUsed: 0,
      dailySummariesLimit: currentPlan === "free" ? 5 : -1,
      watchlistItemCount: 0,
      watchlistLimit: currentPlan === "free" ? 5 : -1,
    },
    subscription,
    paymentAvailable: getPromptPayPhone() !== null,
    promptpayConfigured: getPromptPayPhone() !== null,
  });
});

// ── POST /billing/payment/initiate ───────────────────────

router.post("/billing/payment/initiate", async (req, res) => {
  const { planId, userId } = req.body as { planId?: string; userId?: string };

  if (!planId || !["pro", "elite"].includes(planId)) {
    res.status(400).json({ error: "Valid planId (pro or elite) required" });
    return;
  }

  const promptpayPhone = getPromptPayPhone();
  if (!promptpayPhone) {
    res.status(503).json({
      error: "PromptPay ยังไม่ได้ตั้งค่า กรุณาติดต่อ admin",
      code: "PROMPTPAY_NOT_CONFIGURED",
    });
    return;
  }

  const plan = getPlan(planId);
  const txnId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  if (db) {
    try {
      await db.insert(payments).values({
        id: txnId,
        userId: userId ?? "anonymous",
        amountThb: plan.priceThb,
        status: "pending",
        paymentProvider: "promptpay",
        externalPaymentId: null,
        webhookReceived: "false",
        receiptUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err) {
      logger.warn({ err }, "Failed to persist payment to DB, continuing in-memory");
    }
  }

  logger.info({ txnId, planId, amountThb: plan.priceThb, userId }, "Payment initiated");

  res.json({
    txnId,
    planId,
    planDisplayName: plan.displayName,
    amountThb: plan.priceThb,
    promptpayPhone,
    status: "pending",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    instructions: [
      `โอนเงิน ฿${plan.priceThb} ผ่าน PromptPay`,
      `หมายเลข: ${promptpayPhone}`,
      "แนบสลิปและแจ้ง Transaction ID ทาง Line/Telegram",
      `Transaction ID: ${txnId}`,
    ],
  });
});

// ── GET /billing/payment/:id/status ─────────────────────

router.get("/billing/payment/:id/status", async (req, res) => {
  const { id } = req.params;

  if (db) {
    try {
      const rows = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
      if (rows[0]) {
        res.json({
          txnId: id,
          status: rows[0].status,
          amountThb: rows[0].amountThb,
          updatedAt: rows[0].updatedAt,
        });
        return;
      }
    } catch (err) {
      logger.warn({ err, id }, "Payment status DB query failed");
    }
  }

  res.status(404).json({ error: "Payment not found" });
});

// ── POST /billing/payment/:id/confirm (admin) ────────────

router.post("/billing/payment/:id/confirm", async (req, res) => {
  const { id } = req.params;
  const { userId, planId } = req.body as { userId?: string; planId?: string };

  if (!db) {
    res.status(503).json({ error: "Database not available" });
    return;
  }

  try {
    await db
      .update(payments)
      .set({ status: "confirmed", webhookReceived: "true", updatedAt: new Date() })
      .where(eq(payments.id, id));

    if (userId && planId) {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      await db.insert(subscriptions).values({
        id: subId,
        userId,
        planId,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: "false",
        paymentProvider: "promptpay",
        externalSubscriptionId: id,
        createdAt: now,
        updatedAt: now,
      });

      logger.info({ txnId: id, subId, userId, planId }, "Payment confirmed + subscription activated");
    }

    res.json({ ok: true, txnId: id, message: "Payment confirmed and subscription activated" });
  } catch (err) {
    logger.error({ err, id }, "Failed to confirm payment");
    res.status(500).json({ error: "Confirmation failed" });
  }
});

// ── GET /billing/admin/payments ──────────────────────────

router.get("/billing/admin/payments", async (_req, res) => {
  if (!db) {
    res.json({ payments: [] });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt))
      .limit(50);
    res.json({ payments: rows });
  } catch (err) {
    logger.warn({ err }, "Admin payments list failed");
    res.json({ payments: [] });
  }
});

export default router;

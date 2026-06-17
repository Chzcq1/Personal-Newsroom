// ============================================================
// BILLING ROUTES — Sprint 25
//
// GET  /billing/plans      — list available plans
// GET  /billing/status     — current user's plan + usage
//
// Architecture:
//   - No real payment processing here (PromptPay integration is future work)
//   - These routes return plan definitions and current tier
//   - Payment state machine and webhooks will be wired in Sprint 26+
// ============================================================

import { Router } from "express";
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

// ── Routes ────────────────────────────────────────────────

router.get("/billing/plans", (_req, res) => {
  res.json({ plans: PLANS });
});

router.get("/billing/status", (req, res) => {
  const profileId = req.query.profileId as string | undefined;

  logger.debug({ profileId }, "Billing status check");

  res.json({
    currentPlan: "free",
    planDetails: PLANS[0],
    usage: {
      dailySummariesUsed: 0,
      dailySummariesLimit: 5,
      watchlistItemCount: 0,
      watchlistLimit: 5,
    },
    subscription: null,
    paymentAvailable: false,
    paymentNote: "PromptPay integration coming soon — Sprint 26",
  });
});

export default router;

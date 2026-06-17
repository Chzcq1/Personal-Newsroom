// ============================================================
// WAITLIST API — Sprint 15 Task H
//
// Closed alpha gating: collects interest data from prospective
// users. No auth required — anonymous submissions keyed by
// timestamp + a random ID.
//
// Endpoints:
//   POST /api/waitlist/submit   — submit interest + pain points
//   GET  /api/waitlist/stats    — submission stats (admin)
// ============================================================

import { Router } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

interface WaitlistEntry {
  id: string;
  submittedAt: string;
  industries: string[];
  pains: string[];
  delivery: string;
}

const MAX_ENTRIES = 1000;
const entries: WaitlistEntry[] = [];

router.post("/waitlist/submit", (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    const { industries = [], pains = [], delivery = "" } = body;

    if (!Array.isArray(industries) || !Array.isArray(pains)) {
      res.status(400).json({ error: "industries and pains must be arrays" });
      return;
    }

    const entry: WaitlistEntry = {
      id: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      submittedAt: new Date().toISOString(),
      industries: industries.slice(0, 10).map(String),
      pains: pains.slice(0, 10).map(String),
      delivery: String(delivery).slice(0, 50),
    };

    entries.push(entry);
    if (entries.length > MAX_ENTRIES) entries.shift();

    logger.info({ id: entry.id, industries: entry.industries.length }, "[Waitlist] New submission");
    res.json({ ok: true, id: entry.id });
  } catch (err) {
    logger.error({ err }, "[Waitlist] POST /submit error");
    res.status(500).json({ error: "Failed to record submission" });
  }
});

router.get("/waitlist/stats", (_req, res) => {
  try {
    const total = entries.length;
    if (total === 0) {
      res.json({ total: 0, topIndustries: [], topPains: [], deliveryPreferences: {} });
      return;
    }

    const industryCounts: Record<string, number> = {};
    const painCounts: Record<string, number> = {};
    const deliveryCounts: Record<string, number> = {};

    for (const entry of entries) {
      for (const ind of entry.industries) {
        industryCounts[ind] = (industryCounts[ind] ?? 0) + 1;
      }
      for (const pain of entry.pains) {
        painCounts[pain] = (painCounts[pain] ?? 0) + 1;
      }
      deliveryCounts[entry.delivery] = (deliveryCounts[entry.delivery] ?? 0) + 1;
    }

    const topIndustries = Object.entries(industryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));

    const topPains = Object.entries(painCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));

    res.json({ total, topIndustries, topPains, deliveryPreferences: deliveryCounts });
  } catch (err) {
    logger.error({ err }, "[Waitlist] GET /stats error");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export default router;

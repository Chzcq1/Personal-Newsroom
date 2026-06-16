// ============================================================
// HABIT ROUTES — Sprint 13 Task J
// ============================================================

import { Router } from "express";
import {
  getHabitSnapshot,
  recordDailyOpen,
  followNarrative,
  unfollowNarrative,
  recordNarrativeView,
  recordFeedbackGiven,
} from "../services/deliveryinfra/habitEngine.js";

const router = Router();

// GET /api/habit/snapshot
router.get("/habit/snapshot", (_req, res) => {
  res.json(getHabitSnapshot());
});

// POST /api/habit/open  — record a daily open event
router.post("/habit/open", (req, res) => {
  const { articlesRead = 0, topicsEngaged = [], narrativesViewed = [] } = req.body as {
    articlesRead?: number;
    topicsEngaged?: string[];
    narrativesViewed?: string[];
  };
  recordDailyOpen(articlesRead, topicsEngaged, narrativesViewed);
  res.json({ ok: true });
});

// POST /api/habit/narrative/view
router.post("/habit/narrative/view", (req, res) => {
  const { narrativeId, narrativeTitle } = req.body as { narrativeId: string; narrativeTitle: string };
  if (!narrativeId) return res.status(400).json({ error: "narrativeId required" });
  recordNarrativeView(narrativeId, narrativeTitle ?? narrativeId);
  return res.json({ ok: true });
});

// POST /api/habit/narrative/follow
router.post("/habit/narrative/follow", (req, res) => {
  const { narrativeId, unfollow } = req.body as { narrativeId: string; unfollow?: boolean };
  if (!narrativeId) return res.status(400).json({ error: "narrativeId required" });
  if (unfollow) {
    unfollowNarrative(narrativeId);
  } else {
    followNarrative(narrativeId);
  }
  return res.json({ ok: true });
});

// POST /api/habit/feedback — record that feedback was given (for sensitivity scoring)
router.post("/habit/feedback", (_req, res) => {
  recordFeedbackGiven();
  res.json({ ok: true });
});

export default router;

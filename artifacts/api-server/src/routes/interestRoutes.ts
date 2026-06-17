// ============================================================
// INTEREST ROUTES — Sprint 22
// Mounted at /api via app.use("/api", router)
// ============================================================

import { Router } from "express";
import {
  getInterests,
  setInterests,
  upsertInterest,
  removeInterest,
  applyFeedback,
} from "../repositories/interestRepository.js";
import { recordFeedback } from "../repositories/feedbackRepository.js";

const router = Router();

const FEEDBACK_DELTAS: Record<string, number> = {
  like: 10,
  dislike: -15,
  follow: 20,
  unfollow: -20,
};

// GET /interests/:profileId
router.get("/interests/:profileId", async (req, res) => {
  const { profileId } = req.params;
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }
  const interests = await getInterests(profileId);
  res.json({ interests });
});

// POST /interests — set full interest list for a profile
router.post("/interests", async (req, res) => {
  const { profileId, labels } = req.body as { profileId?: string; labels?: string[] };
  if (!profileId || !Array.isArray(labels)) {
    res.status(400).json({ error: "profileId and labels[] required" });
    return;
  }
  if (labels.length < 3) {
    res.status(400).json({ error: "Minimum 3 interests required" });
    return;
  }
  await setInterests(profileId, labels);
  const interests = await getInterests(profileId);
  res.json({ interests });
});

// POST /interests/upsert — add or update a single interest
router.post("/interests/upsert", async (req, res) => {
  const { profileId, label, weight } = req.body as { profileId?: string; label?: string; weight?: number };
  if (!profileId || !label) {
    res.status(400).json({ error: "profileId and label required" });
    return;
  }
  await upsertInterest(profileId, label, weight ?? 50);
  res.json({ ok: true });
});

// POST /interests/feedback — like/dislike/follow/unfollow a topic
// IMPORTANT: must come before /interests/:profileId/:label (specific before wildcard)
router.post("/interests/feedback", async (req, res) => {
  const { profileId, topicLabel, action, articleUrl, articleTitle, topicId } = req.body as {
    profileId?: string;
    topicLabel?: string;
    action?: string;
    articleUrl?: string;
    articleTitle?: string;
    topicId?: string;
  };
  if (!profileId || !topicLabel || !action) {
    res.status(400).json({ error: "profileId, topicLabel, and action required" });
    return;
  }
  const delta = FEEDBACK_DELTAS[action];
  if (delta === undefined) {
    res.status(400).json({ error: `Unknown action: ${action}. Use like|dislike|follow|unfollow` });
    return;
  }

  await applyFeedback(profileId, topicLabel, delta);

  // Also record in the feedback_actions table for analytics
  if (articleUrl && articleTitle) {
    const feedbackType =
      action === "like" ? "thumbs_up" :
      action === "dislike" ? "thumbs_down" :
      action === "follow" ? "follow" : "unfollow";
    await recordFeedback({
      profileId,
      articleUrl,
      articleTitle,
      feedbackType,
      topicId: topicId ?? topicLabel,
      entities: [],
    });
  }

  const interests = await getInterests(profileId);
  res.json({ ok: true, interests });
});

// DELETE /interests/:profileId/:label
router.delete("/interests/:profileId/:label", async (req, res) => {
  const { profileId, label } = req.params;
  await removeInterest(profileId, decodeURIComponent(label));
  res.json({ ok: true });
});

export default router;

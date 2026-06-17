// ============================================================
// IDENTITY ROUTES — Sprint 14 Task C
//
// Endpoints for persisting anonymous user identity to DB.
// Called by the frontend when a user first loads the app or
// after a settings change. No auth required — anonymous only.
//
// POST /api/identity/sync  — upsert profile + preferences
// GET  /api/identity/:id   — retrieve persisted profile
// POST /api/identity/:id/onboarding — mark onboarding complete
// POST /api/identity/:id/feedback   — record feedback action
// GET  /api/identity/:id/briefings  — get saved briefings
// POST /api/identity/briefing        — save a briefing
// ============================================================

import { Router } from "express";
import {
  upsertProfile,
  getProfile,
  markOnboardingComplete,
  markFoundingMember,
  getAllProfiles,
} from "../repositories/userProfileRepository.js";
import {
  saveBriefing,
  getBriefingsForProfile,
  deleteBriefing,
} from "../repositories/savedBriefingRepository.js";
import { recordFeedback, getFeedbackStats } from "../repositories/feedbackRepository.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Type guards ──────────────────────────────────────────────

const FEEDBACK_TYPES = ["open", "save", "skip", "complete_read", "thumbs_up", "thumbs_down"] as const;
type FeedbackType = typeof FEEDBACK_TYPES[number];

function isValidFeedbackType(v: unknown): v is FeedbackType {
  return typeof v === "string" && FEEDBACK_TYPES.includes(v as FeedbackType);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

// ── POST /identity/sync ─────────────────────────────────────

router.post("/identity/sync", async (req, res) => {
  const body = req.body as Record<string, unknown>;

  if (!body || typeof body.id !== "string" || !body.id) {
    res.status(400).json({ error: "id (string) is required" });
    return;
  }

  const profile = await upsertProfile({
    id: body.id,
    deviceFingerprint: typeof body.deviceFingerprint === "string" ? body.deviceFingerprint : undefined,
    sessionCount: typeof body.sessionCount === "number" ? body.sessionCount : undefined,
    timezone: typeof body.timezone === "string" ? body.timezone : undefined,
    language: typeof body.language === "string" ? body.language : undefined,
    migrationReady: typeof body.migrationReady === "boolean" ? body.migrationReady : undefined,
    metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata as Record<string, unknown>
      : undefined,
  });

  if (!profile) {
    res.json({ ok: true, persisted: false, message: "DB unavailable — running in memory mode" });
    return;
  }

  logger.info({ profileId: profile.id }, "[IdentityRoute] Profile synced");
  res.json({ ok: true, persisted: true, profile });
});

// ── GET /identity/profiles (admin — list all) ────────────────
// Must be declared BEFORE /identity/:id to avoid wildcard match

router.get("/identity/profiles", async (_req, res) => {
  try {
    const profiles = await getAllProfiles();
    res.json({ ok: true, profiles, count: profiles.length });
  } catch (err) {
    res.json({ ok: true, profiles: [], count: 0 });
  }
});

// ── GET /identity/:id ───────────────────────────────────────

router.get("/identity/:id", async (req, res) => {
  const { id } = req.params;
  const profile = await getProfile(id);

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json({ ok: true, profile });
});

// ── POST /identity/:id/onboarding ──────────────────────────

router.post("/identity/:id/onboarding", async (req, res) => {
  const { id } = req.params;
  const { foundingMember } = req.body as { foundingMember?: boolean };

  await markOnboardingComplete(id);
  if (foundingMember) {
    await markFoundingMember(id);
  }

  logger.info({ profileId: id, foundingMember }, "[IdentityRoute] Onboarding complete");
  res.json({ ok: true });
});

// ── POST /identity/:id/feedback ────────────────────────────

router.post("/identity/:id/feedback", async (req, res) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;

  if (!body) {
    res.status(400).json({ error: "Request body is required" });
    return;
  }

  if (typeof body.articleUrl !== "string") {
    res.status(400).json({ error: "articleUrl (string) is required" });
    return;
  }

  if (typeof body.articleTitle !== "string") {
    res.status(400).json({ error: "articleTitle (string) is required" });
    return;
  }

  if (!isValidFeedbackType(body.feedbackType)) {
    res.status(400).json({ error: `feedbackType must be one of: ${FEEDBACK_TYPES.join(", ")}` });
    return;
  }

  if (typeof body.topicId !== "string") {
    res.status(400).json({ error: "topicId (string) is required" });
    return;
  }

  await recordFeedback({
    profileId: id,
    articleUrl: body.articleUrl,
    articleTitle: body.articleTitle,
    feedbackType: body.feedbackType,
    topicId: body.topicId,
    entities: isStringArray(body.entities) ? body.entities : [],
    narrativeId: typeof body.narrativeId === "string" ? body.narrativeId : null,
  });

  res.json({ ok: true });
});

// ── GET /identity/:id/feedback/stats ───────────────────────

router.get("/identity/:id/feedback/stats", async (req, res) => {
  const { id } = req.params;
  const stats = await getFeedbackStats(id);
  res.json({ ok: true, stats });
});

// ── GET /identity/:id/briefings ────────────────────────────

router.get("/identity/:id/briefings", async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const briefings = await getBriefingsForProfile(id, limit);
  res.json({ ok: true, briefings });
});

// ── POST /identity/briefing ──────────────────────────────────

router.post("/identity/briefing", async (req, res) => {
  const body = req.body as Record<string, unknown>;

  if (!body || typeof body.id !== "string" || !body.id) {
    res.status(400).json({ error: "id (string) is required" });
    return;
  }

  if (typeof body.topicId !== "string" || !body.topicId) {
    res.status(400).json({ error: "topicId (string) is required" });
    return;
  }

  if (typeof body.topicLabel !== "string" || !body.topicLabel) {
    res.status(400).json({ error: "topicLabel (string) is required" });
    return;
  }

  if (typeof body.content !== "string" || !body.content) {
    res.status(400).json({ error: "content (string) is required" });
    return;
  }

  const briefing = await saveBriefing({
    id: body.id,
    profileId: typeof body.profileId === "string" ? body.profileId : undefined,
    topicId: body.topicId,
    topicLabel: body.topicLabel,
    content: body.content,
    articleCount: typeof body.articleCount === "number" ? body.articleCount : 0,
    sources: isStringArray(body.sources) ? body.sources : [],
    metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata as Record<string, unknown>
      : {},
  });

  res.json({ ok: true, persisted: Boolean(briefing), briefing });
});

// ── DELETE /identity/briefing/:briefingId ───────────────────

router.delete("/identity/briefing/:briefingId", async (req, res) => {
  const { briefingId } = req.params;
  const ok = await deleteBriefing(briefingId);
  res.json({ ok });
});

export default router;

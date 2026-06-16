// ============================================================
// MULTIMODAL ROUTES — Sprint 13 Task H
// ============================================================

import { Router } from "express";
import {
  getMultimodalReadiness,
  buildAudioSegments,
  estimateAudioDuration,
} from "../services/deliveryinfra/multimodalPrep.js";

const router = Router();

// GET /api/multimodal/readiness
router.get("/multimodal/readiness", (_req, res) => {
  res.json(getMultimodalReadiness());
});

// POST /api/multimodal/audio/segments  — preview audio segment breakdown
router.post("/multimodal/audio/segments", (req, res) => {
  const { briefingText } = req.body as { briefingText?: string };
  if (!briefingText?.trim()) {
    return res.status(400).json({ error: "briefingText required" });
  }
  const segments = buildAudioSegments(briefingText);
  const durationSeconds = estimateAudioDuration(segments);
  return res.json({ segments, durationSeconds, ready: false, reason: "TTS provider not configured" });
});

export default router;

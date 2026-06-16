// ============================================================
// NARRATIVE ROUTES — Sprint 10 Task G + C
//
// GET  /api/narratives                — list active narrative threads
// GET  /api/narratives/:id            — get specific narrative
// GET  /api/narratives/:id/timeline   — ordered development timeline
// GET  /api/narratives/entity/:entityId — narratives for entity
// GET  /api/narratives/stats          — memory stats
// ============================================================

import { Router } from "express";
import {
  getActiveNarratives,
  getNarrativeById,
  getNarrativeTimeline,
  getNarrativesForEntity,
  getPersistentNarratives,
  getNarrativeMemoryStats,
} from "../services/intelligence/narrativeMemory.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── GET /api/narratives ────────────────────────────────────────

router.get("/narratives", (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10), 50);
  const includeResolved = req.query.includeResolved === "true";

  const narratives = includeResolved
    ? getPersistentNarratives().slice(0, limit)
    : getActiveNarratives(limit);

  const stats = getNarrativeMemoryStats();

  res.json({
    narratives,
    total: narratives.length,
    stats,
    generatedAt: new Date().toISOString(),
  });
});

// ── GET /api/narratives/stats ──────────────────────────────────

router.get("/narratives/stats", (_req, res) => {
  const stats = getNarrativeMemoryStats();
  res.json({ ...stats, generatedAt: new Date().toISOString() });
});

// ── GET /api/narratives/entity/:entityId ──────────────────────

router.get("/narratives/entity/:entityId", (req, res) => {
  const { entityId } = req.params;
  const narratives = getNarrativesForEntity(entityId);

  res.json({
    entityId,
    narratives,
    total: narratives.length,
    generatedAt: new Date().toISOString(),
  });
});

// ── GET /api/narratives/:id ────────────────────────────────────

router.get("/narratives/:id", (req, res) => {
  const { id } = req.params;
  const narrative = getNarrativeById(id);

  if (!narrative) {
    res.status(404).json({ error: "Narrative not found" });
    return;
  }

  const timeline = getNarrativeTimeline(id);

  res.json({
    ...narrative,
    timeline,
    generatedAt: new Date().toISOString(),
  });
});

// ── GET /api/narratives/:id/timeline ──────────────────────────

router.get("/narratives/:id/timeline", (req, res) => {
  const { id } = req.params;
  const narrative = getNarrativeById(id);

  if (!narrative) {
    res.status(404).json({ error: "Narrative not found" });
    return;
  }

  const timeline = getNarrativeTimeline(id);

  res.json({
    narrativeId: id,
    headline: narrative.canonicalHeadline,
    maturity: narrative.maturity,
    dominantEntity: narrative.dominantEntity,
    firstSeen: narrative.firstSeen,
    lastSeen: narrative.lastSeen,
    timeline,
    milestones: narrative.milestones,
    generatedAt: new Date().toISOString(),
  });
});

export default router;

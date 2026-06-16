// ============================================================
// ADAPTIVE INTELLIGENCE ROUTES — Sprint 10 Tasks E, F, J
//
// POST /api/adaptive/feedback        — explicit relevance feedback
// POST /api/adaptive/engagement      — implicit engagement signal
// GET  /api/adaptive/state           — full adaptation state
// GET  /api/adaptive/autocorrect     — quality autocorrection hints
// GET  /api/adaptive/summary         — adaptive interest summary
// ============================================================

import { Router } from "express";
import {
  recordFeedback,
  recordEngagementSignal,
  getAdaptationState,
  getAutocorrectionSuggestions,
  getAllFeedback,
  type FeedbackRecord,
} from "../services/intelligence/feedAdaptationEngine.js";
import {
  recordEngagement,
  getAdaptiveSummary,
  getExpansionClusters,
  getAdaptiveExpansions,
  type EngagementType,
} from "../services/intelligence/adaptiveInterestEngine.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── POST /api/adaptive/feedback ────────────────────────────────

router.post("/adaptive/feedback", (req, res) => {
  const {
    articleUrl,
    articleTitle,
    type,
    entities = [],
    topicId = "unknown",
    narrativeId = null,
  } = req.body as {
    articleUrl?: string;
    articleTitle?: string;
    type?: string;
    entities?: string[];
    topicId?: string;
    narrativeId?: string | null;
  };

  if (!articleUrl || !articleTitle || !type) {
    res.status(400).json({ error: "articleUrl, articleTitle, and type are required" });
    return;
  }

  const validTypes = ["more_like_this", "less_like_this", "irrelevant", "high_value"];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` });
    return;
  }

  const record: FeedbackRecord = {
    articleUrl,
    articleTitle,
    type: type as FeedbackRecord["type"],
    entities,
    topicId,
    narrativeId,
    timestamp: Date.now(),
  };

  recordFeedback(record);

  // Also feed into the adaptive interest engine
  const engType: EngagementType =
    type === "high_value" || type === "more_like_this" ? "feedback_positive" :
    type === "irrelevant" || type === "less_like_this" ? "feedback_negative" :
    "open";

  if (entities.length >= 2) {
    recordEngagement(entities, engType);
  }

  logger.info({ type, entities, url: articleUrl }, "Relevance feedback recorded");

  res.json({
    success: true,
    message: "Feedback recorded — feed will adapt within the next request",
    type,
    entitiesAffected: entities.length,
  });
});

// ── POST /api/adaptive/engagement ─────────────────────────────

router.post("/adaptive/engagement", (req, res) => {
  const {
    url,
    type,
    entities = [],
    articleText,
  } = req.body as {
    url?: string;
    type?: string;
    entities?: string[];
    articleText?: string;
  };

  if (!url || !type) {
    res.status(400).json({ error: "url and type are required" });
    return;
  }

  const validTypes = ["open", "save", "skip", "complete_read"];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` });
    return;
  }

  recordEngagementSignal(url, type as "open" | "save" | "skip" | "complete_read", entities);

  // Feed into adaptive interest engine for relationship learning
  const engType: EngagementType = type as EngagementType;
  if (entities.length >= 2 || articleText) {
    recordEngagement(entities, engType, articleText);
  }

  res.json({ success: true });
});

// ── GET /api/adaptive/state ────────────────────────────────────

router.get("/adaptive/state", (_req, res) => {
  const state = getAdaptationState();
  const adaptiveSummary = getAdaptiveSummary();
  const clusters = getExpansionClusters();

  res.json({
    feedAdaptation: state,
    adaptiveInterests: {
      totalLearnedEdges: adaptiveSummary.totalLearnedEdges,
      totalEngagements: adaptiveSummary.totalEngagements,
      expansionClusters: clusters.length,
      topLearnedEdges: adaptiveSummary.topLearnedEdges.slice(0, 10),
    },
    expansionClusters: clusters.slice(0, 10),
    generatedAt: new Date().toISOString(),
  });
});

// ── GET /api/adaptive/autocorrect ─────────────────────────────

router.get("/adaptive/autocorrect", (_req, res) => {
  const suggestions = getAutocorrectionSuggestions();
  const state = getAdaptationState();

  res.json({
    suggestions,
    summary: {
      totalCandidates: suggestions.length,
      suppressCandidates: suggestions.filter((s) => s.recommendedAction === "suppress").length,
      reduceCandidates: suggestions.filter((s) => s.recommendedAction === "reduce").length,
    },
    adaptationHealth: {
      totalEntities: state.totalEntities,
      boostedPercent: state.totalEntities > 0
        ? Math.round((state.boosted / state.totalEntities) * 100) : 0,
      suppressedPercent: state.totalEntities > 0
        ? Math.round((state.suppressed / state.totalEntities) * 100) : 0,
    },
    generatedAt: new Date().toISOString(),
  });
});

// ── GET /api/adaptive/summary ─────────────────────────────────

router.get("/adaptive/summary", (req, res) => {
  const { interests } = req.query as { interests?: string };
  const interestList = interests ? interests.split(",").map((s) => s.trim()) : [];

  const expansions = getAdaptiveExpansions(interestList, 15);
  const summary = getAdaptiveSummary();
  const feedback = getAllFeedback(20);

  res.json({
    learnedExpansions: expansions,
    expansionClusters: getExpansionClusters(),
    recentFeedback: feedback,
    engineStats: {
      totalLearnedEdges: summary.totalLearnedEdges,
      totalEngagements: summary.totalEngagements,
      topEdges: summary.topLearnedEdges.slice(0, 8),
    },
    generatedAt: new Date().toISOString(),
  });
});

export default router;

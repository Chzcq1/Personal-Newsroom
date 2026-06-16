// ============================================================
// TOPICS ROUTES — Sprint 6 Task F
//
// GET  /api/topics         — List all topics (built-in + custom)
// POST /api/topics         — Create a custom topic
// DELETE /api/topics/:id   — Delete a custom topic
// ============================================================

import { Router } from "express";
import { TOPICS, TOPIC_RSS_SOURCES } from "../config/topics.js";
import {
  createCustomTopic,
  getCustomTopics,
  deleteCustomTopic,
  getCustomTopicCount,
} from "../services/news/customTopicsService.js";
import { registerSource } from "../services/news/sourceRegistry.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── GET /api/topics ──────────────────────────────────────────

router.get("/topics", (_req, res) => {
  const builtIn = TOPICS.map((t) => ({ ...t, isCustom: false }));
  const custom = getCustomTopics().map((t) => ({
    id: t.id,
    label: t.label,
    labelTh: t.labelTh,
    icon: t.icon,
    isCustom: true,
    createdAt: t.createdAt,
    sourceCount: t.sources.length,
  }));
  res.json([...builtIn, ...custom]);
});

// ── POST /api/topics ─────────────────────────────────────────

router.post("/topics", (req, res) => {
  const { id, label, labelTh, keywords = [], sources = [], icon } = req.body as {
    id?: string;
    label?: string;
    labelTh?: string;
    keywords?: string[];
    sources?: Array<{ name: string; url: string }>;
    icon?: string;
  };

  if (!id || !label || !labelTh) {
    res.status(400).json({ error: "id, label, and labelTh are required" });
    return;
  }

  const result = createCustomTopic({ id, label, labelTh, keywords, sources, icon });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  // Register sources in the source registry at quality tier C by default
  for (const src of sources) {
    if (src.name) {
      registerSource({ name: src.name, tier: "C", url: src.url });
    }
  }

  logger.info({ topicId: id, label, sourceCount: sources.length }, "Custom topic created");
  res.status(201).json(result.topic);
});

// ── DELETE /api/topics/:id ───────────────────────────────────

router.delete("/topics/:id", (req, res) => {
  const { id } = req.params;

  if (["ai", "technology", "stocks", "economy", "politics"].includes(id)) {
    res.status(400).json({ error: "Built-in topics cannot be deleted" });
    return;
  }

  const deleted = deleteCustomTopic(id);
  if (!deleted) {
    res.status(404).json({ error: `Custom topic "${id}" not found` });
    return;
  }

  logger.info({ topicId: id }, "Custom topic deleted");
  res.json({ success: true, deletedTopicId: id, customTopicCount: getCustomTopicCount() });
});

// ── GET /api/topics/:id/sources ──────────────────────────────

router.get("/topics/:id/sources", (req, res) => {
  const { id } = req.params;

  const builtInSources = TOPIC_RSS_SOURCES[id];
  if (builtInSources) {
    res.json({ topicId: id, isCustom: false, sources: builtInSources });
    return;
  }

  const customTopics = getCustomTopics();
  const custom = customTopics.find((t) => t.id === id);
  if (custom) {
    res.json({ topicId: id, isCustom: true, sources: custom.sources });
    return;
  }

  res.status(404).json({ error: `Topic "${id}" not found` });
});

export default router;

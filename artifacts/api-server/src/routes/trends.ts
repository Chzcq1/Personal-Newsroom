// ============================================================
// TRENDS ROUTES — Sprint 26
//
// GET  /trends/recent           — last 50 ingested trend items
// GET  /trends/feed             — personalized trends (by interests/watchlist)
// GET  /trends/status           — ingestion health + counts by source
// POST /trends/ingest           — manual trigger (admin only)
// ============================================================

import { Router } from "express";
import {
  getRecentTrends,
  getTrendsByTopicTag,
  getTrendsByEntityTag,
  getIngestionStatus,
  ingestAllProviders,
} from "../services/trendIngestion/index.js";

const router = Router();

router.get("/trends/recent", (_req, res) => {
  const limit = Math.min(Number(_req.query.limit) || 50, 100);
  const items = getRecentTrends(limit);
  res.json({ items, total: items.length });
});

router.get("/trends/feed", (req, res) => {
  const interests = ((req.query.interests as string) || "").split(",").filter(Boolean);
  const watchlist = ((req.query.watchlist as string) || "").split(",").filter(Boolean);
  const limit = Math.min(Number(req.query.limit) || 30, 100);

  const entitySet = new Set<string>();
  for (const term of [...interests, ...watchlist]) {
    entitySet.add(term);
  }

  let items = getRecentTrends(200);

  if (entitySet.size > 0) {
    const entityArr = Array.from(entitySet);
    items = items.filter((item) =>
      item.entityTags.some((e) =>
        entityArr.some((q) => e.toLowerCase().includes(q.toLowerCase())),
      ) ||
      item.topicTags.some((t) =>
        entityArr.some((q) => t.toLowerCase().includes(q.toLowerCase())),
      ),
    );
  }

  res.json({ items: items.slice(0, limit), total: items.length });
});

router.get("/trends/status", (_req, res) => {
  res.json(getIngestionStatus());
});

router.post("/trends/ingest", async (_req, res) => {
  try {
    const result = await ingestAllProviders();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Ingestion failed" });
  }
});

export default router;

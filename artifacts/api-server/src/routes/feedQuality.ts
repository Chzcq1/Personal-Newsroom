// ============================================================
// FEED QUALITY ROUTE — Sprint 9 Task J
//
// GET /api/admin/feed-quality — quality metrics dashboard
// ============================================================

import { Router } from "express";
import { getFeedQualitySnapshot } from "../services/analytics/feedQualityMetrics.js";

const router = Router();

router.get("/admin/feed-quality", (_req, res) => {
  res.json(getFeedQualitySnapshot());
});

export default router;

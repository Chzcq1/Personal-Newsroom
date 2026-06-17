// ============================================================
// WATCHLIST ROUTES — Sprint 22
// Mounted at /api via app.use("/api", router)
// ============================================================

import { Router } from "express";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  removeFromWatchlistByEntity,
} from "../repositories/watchlistRepository.js";

const router = Router();

// GET /watchlist/:profileId
router.get("/watchlist/:profileId", async (req, res) => {
  const { profileId } = req.params;
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }
  const items = await getWatchlist(profileId);
  res.json({ items });
});

// POST /watchlist — add item
router.post("/watchlist", async (req, res) => {
  const { profileId, entityId, entityLabel, entityType } = req.body as {
    profileId?: string;
    entityId?: string;
    entityLabel?: string;
    entityType?: string;
  };
  if (!profileId || !entityId || !entityLabel) {
    res.status(400).json({ error: "profileId, entityId, entityLabel required" });
    return;
  }
  const item = await addToWatchlist(profileId, entityId, entityLabel, entityType ?? "general");
  res.json({ item });
});

// DELETE /watchlist/entity/:profileId/:entityId — remove by entity ID
router.delete("/watchlist/entity/:profileId/:entityId", async (req, res) => {
  const { profileId, entityId } = req.params;
  await removeFromWatchlistByEntity(profileId, decodeURIComponent(entityId));
  res.json({ ok: true });
});

// DELETE /watchlist/:id — remove by row ID
router.delete("/watchlist/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await removeFromWatchlist(id);
  res.json({ ok: true });
});

export default router;

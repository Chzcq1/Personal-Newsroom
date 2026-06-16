// ============================================================
// PREFERENCES ROUTE — Sprint 8 Task G (Executive Mode)
//
// GET  /api/preferences/executive  — executive mode status
// POST /api/preferences/executive  — set executive mode
//
// Currently fronts localStorage on client; these routes
// prepare the architecture for multi-device sync.
// ============================================================

import { Router } from "express";

const router = Router();

// Placeholder routes — preferences are localStorage-based in V1.
// These routes exist for future server-side persistence (login layer).
// The frontend reads/writes localStorage directly for now.

router.get("/preferences/executive", (_req, res) => {
  res.json({ message: "Executive mode is stored client-side in V1. See lib/executiveMode.ts." });
});

export default router;

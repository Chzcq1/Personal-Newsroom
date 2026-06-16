// ============================================================
// SIGNAL MODE ROUTES — Sprint 16 Task A
//
// GET  /api/signal-mode         — current mode + all configs
// POST /api/signal-mode         — set mode { mode: "safe" | "balanced" | "raw" }
// GET  /api/signal-mode/configs — all mode definitions (for settings UI)
// ============================================================

import { Router } from "express";
import {
  getSignalMode,
  setSignalMode,
  getAllSignalModes,
  getSignalModeConfig,
  type SignalMode,
} from "../services/intelligence/signalModeEngine.js";

const router = Router();

router.get("/signal-mode", (_req, res) => {
  res.json({
    current: getSignalMode(),
    config: getSignalModeConfig(),
  });
});

router.post("/signal-mode", (req, res) => {
  const { mode } = req.body as { mode?: string };
  const VALID: SignalMode[] = ["safe", "balanced", "raw"];

  if (!mode || !VALID.includes(mode as SignalMode)) {
    res.status(400).json({
      error: `Invalid mode. Must be one of: ${VALID.join(", ")}`,
    });
    return;
  }

  setSignalMode(mode as SignalMode);

  res.json({
    success: true,
    current: getSignalMode(),
    config: getSignalModeConfig(),
  });
});

router.get("/signal-mode/configs", (_req, res) => {
  res.json({
    modes: getAllSignalModes(),
    current: getSignalMode(),
  });
});

export default router;

import { Router } from "express";
import { TOPICS } from "../config/topics.js";

const router = Router();

router.get("/topics", (_req, res) => {
  res.json(TOPICS);
});

export default router;

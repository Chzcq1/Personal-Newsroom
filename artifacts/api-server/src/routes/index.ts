import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import topicsRouter from "./topics.js";
import newsRouter from "./news.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(topicsRouter);
router.use(newsRouter);

export default router;

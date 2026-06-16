import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import topicsRouter from "./topics.js";
import newsRouter from "./news.js";
import telegramRouter from "./telegram.js";
import deliveryRouter from "./delivery.js";
import costsRouter from "./costs.js";
import feedRouter from "./feed.js";
import alertsRouter from "./alerts.js";
import analyticsRouter from "./analytics.js";
import preferencesRouter from "./preferences.js";
import debugRouter from "./debug.js";
import feedQualityRouter from "./feedQuality.js";
import adaptiveRouter from "./adaptive.js";
import narrativesRouter from "./narratives.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(topicsRouter);
router.use(newsRouter);
router.use(telegramRouter);
router.use(deliveryRouter);
router.use(costsRouter);
router.use(feedRouter);
router.use(alertsRouter);
router.use(analyticsRouter);
router.use(preferencesRouter);
router.use(debugRouter);
router.use(feedQualityRouter);
router.use(adaptiveRouter);
router.use(narrativesRouter);

export default router;

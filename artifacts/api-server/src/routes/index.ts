import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import topicsRouter from "./topics.js";
import newsRouter from "./news.js";
import telegramRouter from "./telegram.js";
import deliveryRouter from "./delivery.js";
import costsRouter from "./costs.js";
import feedRouter from "./feed.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(topicsRouter);
router.use(newsRouter);
router.use(telegramRouter);
router.use(deliveryRouter);
router.use(costsRouter);
router.use(feedRouter);

export default router;

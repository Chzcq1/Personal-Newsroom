import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── CORS ────────────────────────────────────────────────────
// In production, restrict to FRONTEND_URL. In dev, allow all.
const allowedOrigin = process.env["FRONTEND_URL"];
app.use(
  cors(
    allowedOrigin && process.env["NODE_ENV"] === "production"
      ? {
          origin: allowedOrigin,
          credentials: true,
        }
      : undefined,
  ),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API routes ──────────────────────────────────────────────
app.use("/api", router);

// ── Static frontend (production Docker only) ─────────────────
// The Dockerfile copies the Vite build to ./public in the container.
if (process.env["NODE_ENV"] === "production") {
  const publicPath = path.resolve("./public");
  if (existsSync(publicPath)) {
    app.use(express.static(publicPath));
    // SPA fallback — any non-/api route returns index.html
    app.get("*", (_req, res) => {
      res.sendFile(path.join(publicPath, "index.html"));
    });
    logger.info({ publicPath }, "Serving frontend static files");
  }
}

export default app;

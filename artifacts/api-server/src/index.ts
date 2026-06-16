import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./services/delivery/scheduler";
import { startAllWorkers } from "./workers/workerRegistry";
import { runStartupRecovery } from "./services/infra/startupRecovery";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Run startup recovery checks (DB health, pending queue items)
  const report = await runStartupRecovery();
  if (report.degradedMode) {
    logger.warn("[Startup] Running in degraded mode — DB unavailable, using in-memory storage");
  }

  // Start delivery scheduler: morning 07:00, evening 18:00 (SCHEDULER_TIMEZONE).
  // Only sends if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are configured.
  startScheduler();

  // Start background workers (retry, narrative prune, analytics aggregation)
  startAllWorkers();
});

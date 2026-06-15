import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./services/delivery/scheduler";

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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Start delivery scheduler: morning 07:00, evening 18:00 (SCHEDULER_TIMEZONE).
  // Only sends if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are configured.
  startScheduler();
});

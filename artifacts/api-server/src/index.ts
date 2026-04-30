import app from "./app";
import { logger } from "./lib/logger";
import { ensurePrimaryUser, purgeExpiredSessions } from "./lib/auth";
import { startForgotPasswordThrottleCleanup } from "./lib/forgot-password-throttle";
import { seedDefaultWallets } from "./lib/seed-wallets";

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

  // Seed primary user and clear expired sessions on startup (best-effort).
  void ensurePrimaryUser();
  void purgeExpiredSessions();
  void seedDefaultWallets();

  // Periodically prune empty forgot-password throttle buckets.
  startForgotPasswordThrottleCleanup();
});
